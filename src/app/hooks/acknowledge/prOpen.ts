import { defineHook } from "../../../lib/eventHandler.js";
import { getConfig } from "../../../lib/getConfig.js";

export default defineHook({
  events: ["pull_request.opened"],
  callback: async (ctx) => {
    const config = await getConfig(ctx);

    const username =
      ((await ctx.octokit.rest.apps.getAuthenticated()).data?.slug ??
        "hookto") + "[bot]";

    if (
      !config.hooks.acknowledge.enabled ||
      ctx.payload.pull_request.user.login === username
    )
      return;

    const { enabled, message } = config.hooks.acknowledge.prOpen;

    if (enabled) {
      await ctx.octokit.rest.issues.createComment(ctx.issue({ body: message }));
    }
  },
});
