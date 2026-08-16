import type { EmitterWebhookEventName } from "@octokit/webhooks";
import { Context } from "probot";

export interface EventHandlerModule<
  E extends EmitterWebhookEventName = EmitterWebhookEventName,
> {
  events: E[];

  callback: (ctx: Context<E>) => unknown;
}
