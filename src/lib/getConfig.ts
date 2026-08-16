import { cacheTTL, configPath, redisTimeout } from "@/constants/config.js";
import { redis } from "@/index.js";
import { configSchema, defaultConfig, type Config } from "@/schemas/config.js";
import { hooksSchema } from "@/schemas/hooks.js";
import { deepMerge } from "@/utils/deepMerge.js";
import { withTimeout } from "@/utils/withTimeout.js";
import { load } from "js-yaml";
import type { Context } from "probot";
import type { z } from "zod";
import { logger } from "./logger.js";

const inMemCache = new Map<string, Config>();
const rawCache = new Map<string, unknown>();

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

async function getRawConfig(
  ctx: Context,
  owner: string,
  repo: string,
): Promise<unknown | null> {
  try {
    const { data } = await ctx.octokit.rest.repos.getContent({
      owner,
      repo,
      path: configPath,
    });
    if (!("content" in data)) return null;
    const raw = Buffer.from(data.content, "base64").toString("utf-8");
    return load(raw) ?? null;
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status !== 404) {
      logger.error(`Failed to read ${configPath} from ${owner}/${repo}`, err);
    }
    return null;
  }
}

async function getOwnerRawConfig(
  ctx: Context,
  owner: string,
): Promise<unknown | null> {
  const key = cacheKey(owner, ".github");

  if (rawCache.has(key)) return rawCache.get(key) ?? null;

  if (redis) {
    try {
      const fromRedis = await withTimeout(
        redis.get<unknown>(key),
        redisTimeout,
      );
      if (fromRedis !== undefined && fromRedis !== null) {
        rawCache.set(key, fromRedis);
        return fromRedis;
      }
    } catch (err) {
      logger.error(`Redis lookup failed for ${key}`, err);
    }
  }

  const raw = await getRawConfig(ctx, owner, ".github");
  rawCache.set(key, raw);
  if (redis) {
    redis.set(key, raw, { ex: cacheTTL }).catch((err) => {
      logger.error(`Redis set failed for ${key}`, err);
    });
  }
  return raw;
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
    const [ownerRaw, repoRaw] = await Promise.all([
      getOwnerRawConfig(ctx, owner),
      getRawConfig(ctx, owner, repo),
    ]);
    const merged = deepMerge(
      (ownerRaw as Record<string, unknown>) ?? {},
      (repoRaw as Record<string, unknown>) ?? {},
    );
    resolved = validateConfig(merged);
  } catch (err) {
    logger.error(`Failed to resolve config for ${owner}/${repo}`, err);
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
    rawCache.clear();
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
  rawCache.delete(key);
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

  if (target.repo === ".github") {
    for (const cachedKey of inMemCache.keys()) {
      if (cachedKey.startsWith(`hookto:${target.owner}/`)) {
        inMemCache.delete(cachedKey);
      }
    }
  }
}
