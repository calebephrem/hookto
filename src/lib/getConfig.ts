import { cacheTTL, configPath, redisTimeout } from "@/constants/config.js";
import { redis } from "@/index.js";
import { configSchema, defaultConfig, type Config } from "@/schemas/config.js";
import { hooksSchema } from "@/schemas/hooks.js";
import { withTimeout } from "@/utils/withTimeout.js";
import { load } from "js-yaml";
import type { Context } from "probot";
import type { z } from "zod";
import { logger } from "./logger.js";

const inMemCache = new Map<string, Config>();

function cacheKey(owner: string, repo: string): string {
  return `hookto:${owner}/${repo}`;
}

function validateConfig(raw: unknown): Config {
  const whole = configSchema.safeParse(raw);

  if (whole.success) return whole.data;

  const rawObj = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const rawHooks = (rawObj.hooks ?? {}) as Record<string, unknown>;
  const validatedHooks: Record<string, unknown> = {};

  for (const [hookName, hookSchema] of Object.entries(hooksSchema.shape)) {
    const result = (hookSchema as z.ZodTypeAny).safeParse(rawHooks[hookName]);

    if (!result.success) {
      logger.error(
        `hooks.${hookName} failed validation, using its defaults`,
        result.error.flatten(),
      );

      validatedHooks[hookName] = (hookSchema as z.ZodTypeAny).parse({});
    } else {
      validatedHooks[hookName] = result.data;
    }
  }

  return {
    ...defaultConfig,
    hooks: validatedHooks as Config["hooks"],
  };
}

async function getConfigFromGitHub(ctx: Context): Promise<Config> {
  const { data } = await ctx.octokit.rest.repos.getContent(
    ctx.repo({ path: configPath }),
  );

  if (!("content" in data)) return defaultConfig;

  const raw = Buffer.from(data.content, "base64").toString("utf-8");
  const ymlConfig = load(raw);

  if (!ymlConfig) return defaultConfig;

  return validateConfig(ymlConfig);
}

export async function getConfig(ctx?: Context): Promise<Config> {
  if (!ctx) return defaultConfig;

  const { owner, repo } = ctx.repo();
  const key = cacheKey(owner, repo);
  const cached = inMemCache.get(key);

  if (cached) return cached;

  if (redis) {
    try {
      const fromRedis = await withTimeout(redis.get<Config>(key), redisTimeout);

      if (fromRedis) {
        inMemCache.set(key, fromRedis);
        return fromRedis;
      }
    } catch (err) {
      logger.error(`Redis lookup failed for ${owner}/${repo}:`, err);
    }
  }

  let resolved: Config = defaultConfig;

  try {
    resolved = await getConfigFromGitHub(ctx);
  } catch (err) {
    logger.error(`Failed to read ${configPath} for ${owner}/${repo}`, err);
  }

  inMemCache.set(key, resolved);

  if (redis) {
    redis.set(key, resolved, { ex: cacheTTL }).catch((err) => {
      logger.error(`Redis set failed for ${owner}/${repo}`, err);
    });
  }

  return resolved;
}

export async function clearCache(
  target: { owner: string; repo: string } | "all",
): Promise<void> {
  if (target === "all") {
    const keys = [...inMemCache.keys()];
    inMemCache.clear();

    if (redis && keys.length > 0) {
      try {
        await redis.del(...keys);
      } catch (err) {
        logger.error("Redis bulk clear failed", err);
      }
    }

    return;
  }

  const key = cacheKey(target.owner, target.repo);
  inMemCache.delete(key);

  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      logger.error(
        `Redis clear failed for ${target.owner}/${target.repo}`,
        err,
      );
    }
  }
}
