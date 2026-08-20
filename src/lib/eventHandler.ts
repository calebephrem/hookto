import type { EmitterWebhookEventName } from "@octokit/webhooks";
import { Context } from "probot";
import { Config } from "../schemas/config.js";
import { EventHandlerModule } from "../types/eventHandlerModule.js";
import { parseCommand, ParsedCommand } from "./commands.js";
import { getConfig } from "./getConfig.js";

export function eventHandler<E extends EmitterWebhookEventName>(
  handler: EventHandlerModule<E>,
): EventHandlerModule<E> {
  return handler;
}

export function defineHook<E extends EmitterWebhookEventName>(hook: {
  events: E[];
  callback: ({
    ctx,
    config,
  }: {
    ctx: Context<E>;
    config: Config;
  }) => Promise<void>;
}): EventHandlerModule<E> {
  return {
    events: hook.events,
    callback: async (ctx: Context<E>) => {
      const config = await getConfig(ctx);
      await hook.callback({ ctx, config });
    },
  };
}

export const defineCommand = (
  func: ({
    ctx,
    cmd,
    config,
  }: {
    ctx: Context<"issue_comment.created">;
    cmd: ParsedCommand;
    config: Config;
  }) => Promise<void>,
) =>
  eventHandler({
    events: ["issue_comment.created"],
    callback: async (ctx) => {
      const config = await getConfig(ctx);
      const cmd = await parseCommand(ctx);

      if (!cmd) return;

      await func({ ctx, cmd, config });
    },
  });
