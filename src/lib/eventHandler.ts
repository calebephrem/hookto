import type { EmitterWebhookEventName } from "@octokit/webhooks";
import { Context } from "probot";
import { EventHandlerModule } from "../types/eventHandlerModule.js";

export function eventHandler<E extends EmitterWebhookEventName>(
  handler: EventHandlerModule<E>,
): EventHandlerModule<E> {
  return handler;
}

export const defineHook = eventHandler;
export const defineCommand = (
  func: (ctx: Context<"issue_comment.created">) => void,
) =>
  eventHandler({
    events: ["issue_comment.created"],
    callback: func,
  });
