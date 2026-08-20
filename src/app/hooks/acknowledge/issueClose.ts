import { defineHook } from "../../../lib/eventHandler.js";

export default defineHook({
  events: ["issues.closed"],
  callback: async ({ ctx, config }) => {
    if (
      !config.hooks.acknowledge.enabled ||
      ctx.payload.issue.user?.type === "Bot"
    )
      return;

    const { enabled, message } = config.hooks.acknowledge.issueClose;

    if (enabled) {
      await ctx.octokit.rest.issues.createComment(ctx.issue({ body: message }));
    }
  },
});
