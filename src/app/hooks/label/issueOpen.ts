import { defineHook } from "../../../lib/eventHandler.js";
import { getConfig } from "../../../lib/getConfig.js";
import { matchKeywordLabels } from "./matchers.js";

export default defineHook({
  events: ["issues.opened"],
  callback: async (ctx) => {
    const config = await getConfig(ctx);

    const { enabled, keywords } = config.hooks.label;

    if (!enabled) return;

    const labels = matchKeywordLabels(ctx.payload.issue.title, keywords);

    if (labels.length === 0) return;

    await ctx.octokit.rest.issues.addLabels(ctx.issue({ labels }));
  },
});
