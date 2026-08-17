import { Redis } from "@upstash/redis";
import fsp from "fs/promises";
import path from "path";
import { Probot } from "probot";
import { fileURLToPath } from "url";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { EventHandlerModule } from "./types/eventHandlerModule.js";

export const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : undefined;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function collectHandlerFiles(dir: string): Promise<string[] | undefined> {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const nested = await collectHandlerFiles(fullPath);
        if (nested) files.push(...nested);
        continue;
      }

      if (entry.name.endsWith(".js") && entry.name !== "schema.js") {
        files.push(fullPath);
      }
    }

    return files;
  } catch (error) {
    logger.error("Failed to collect handler files", error);
    return;
  }
}

export default async (app: Probot) => {
  const rootDir = path.join(__dirname, "app");

  for (const eventsDir of ["hooks", "commands", "system"].map((d) =>
    path.join(rootDir, d),
  )) {
    const handlerFiles = await collectHandlerFiles(eventsDir);

    if (!handlerFiles) continue;

    for (const handlerPath of handlerFiles) {
      const mod = await import(handlerPath);
      const handler: EventHandlerModule | undefined = mod.default;
      const relPath = path.relative(eventsDir, handlerPath);

      if (
        !handler ||
        !Array.isArray(handler.events) ||
        typeof handler.callback !== "function"
      ) {
        logger.warn(`Skipped ${relPath}: missing events[] or callback()`);
        continue;
      }

      for (const eventName of handler.events) {
        app.on(eventName, async (ctx) => {
          try {
            await handler.callback(ctx);
          } catch (error) {
            logger.error(
              `'${relPath}' threw an error on event '${eventName}'`,
              error,
            );
          }
        });

        logger.success(`Registered ${eventName} -- ${relPath}`);
      }
    }
  }
};
