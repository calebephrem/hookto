import { defineHook } from "../../../lib/eventHandler.js";
import { getConfig } from "../../../lib/getConfig.js";

export default defineHook({
  events: ["issues.opened"],
  callback: async (ctx) => {
    const config = await getConfig(ctx);

    if (
      !config.hooks.acknowledge.enabled ||
      ctx.payload.issue.user?.type === "Bot"
    )
      return;

    const { enabled, message } = config.hooks.acknowledge.issueOpen;

    if (enabled) {
      await ctx.octokit.rest.issues.createComment(ctx.issue({ body: message }));
    }
  },
});
