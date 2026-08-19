import { defineHook } from "../../../lib/eventHandler.js";
import { getConfig } from "../../../lib/getConfig.js";
import { matchKeywordLabels, matchPathLabels } from "./matchers.js";

export default defineHook({
  events: [
    "pull_request.opened",
    "pull_request.reopened",
    "pull_request.synchronize",
  ],
  callback: async (ctx) => {
    const config = await getConfig(ctx);

    const { enabled, keywords, paths } = config.hooks.label;

    if (!enabled) return;

    const files = (
      await ctx.octokit.paginate(ctx.octokit.rest.pulls.listFiles, {
        ...ctx.repo(),
        pull_number: ctx.payload.pull_request.number,
        per_page: 100,
      })
    ).map((file) => file.filename);

    const labels = Array.from(
      new Set([
        ...matchKeywordLabels(ctx.payload.pull_request.title, keywords),
        ...matchPathLabels(files, paths),
      ]),
    );

    if (labels.length === 0) return;

    await ctx.octokit.rest.issues.addLabels(ctx.issue({ labels }));
  },
});
