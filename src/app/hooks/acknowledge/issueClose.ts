import { defineHook } from "../../../lib/eventHandler.js";
import { getConfig } from "../../../lib/getConfig.js";

export default defineHook({
  events: ["issues.closed"],
  callback: async (ctx) => {
    const config = await getConfig();

    if (!config.hooks.acknowledge.enabled) return;

    const { enabled, message } = config.hooks.acknowledge.issueClose;

    if (enabled) {
      await ctx.octokit.rest.issues.createComment(ctx.issue({ body: message }));
    }
  },
});
