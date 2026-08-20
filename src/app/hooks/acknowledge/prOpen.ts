import { defineHook } from "../../../lib/eventHandler.js";

export default defineHook({
  events: ["pull_request.opened"],
  callback: async ({ ctx, config }) => {
    if (
      !config.hooks.acknowledge.enabled ||
      ctx.payload.pull_request.user?.type === "Bot"
    )
      return;

    const { enabled, message } = config.hooks.acknowledge.prOpen;

    if (enabled) {
      await ctx.octokit.rest.issues.createComment(ctx.issue({ body: message }));
    }
  },
});
