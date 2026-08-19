import type { EmitterWebhookEventName } from "@octokit/webhooks";
import { Context } from "probot";
import { EventHandlerModule } from "../types/eventHandlerModule.js";
import { parseCommand, ParsedCommand } from "./commands.js";

export function eventHandler<E extends EmitterWebhookEventName>(
  handler: EventHandlerModule<E>,
): EventHandlerModule<E> {
  return handler;
}

export const defineHook = eventHandler;
export const defineCommand = (
  func: (
    ctx: Context<"issue_comment.created">,
    command: ParsedCommand,
  ) => Promise<void>,
) =>
  eventHandler({
    events: ["issue_comment.created"],
    callback: async (ctx) => {
      const cmd = await parseCommand(ctx);

      if (!cmd) return;

      await func(ctx, cmd);
    },
  });
