import { minimatch } from "minimatch";
import { defineHook } from "../../../lib/eventHandler.js";
import { getConfig } from "../../../lib/getConfig.js";
import { applyLabel } from "../../../lib/label.js";

export default defineHook({
  events: [
    "pull_request.opened",
    "pull_request.synchronize",
    "pull_request.reopened",
  ],
  callback: async (ctx) => {
    const config = await getConfig(ctx);
    const { enabled, prOpen } = config.hooks.label;

    if (!enabled || !prOpen.enabled || !prOpen.rules.length) return;

    const pr = ctx.payload.pull_request;
    const title = pr.title.toLowerCase();
    const body = (pr.body || "").toLowerCase();

    const files = (
      await ctx.octokit.paginate(ctx.octokit.rest.pulls.listFiles, {
        ...ctx.repo(),
        pull_number: pr.number,
        per_page: 100,
      })
    ).map((file) => file.filename);

    const labelsToApply = new Set<string>();

    for (const rule of prOpen.rules) {
      // 1. Keyword matching with title/body toggles
      for (const item of rule.keywords) {
        const hasKeywordMatch = item.keywords.some((kw) => {
          const lowerKw = kw.toLowerCase().trim();
          if (!lowerKw) return false;

          const titleMatched = item.title && title.includes(lowerKw);
          const bodyMatched = item.body && body.includes(lowerKw);

          return titleMatched || bodyMatched;
        });

        if (hasKeywordMatch) {
          item.labels.forEach((label) => labelsToApply.add(label));
        }
      }

      // 2. Path matching using minimatch
      for (const item of rule.paths) {
        const hasPathMatch = files.some((file) =>
          item.paths.some((pattern) => minimatch(file, pattern)),
        );

        if (hasPathMatch) {
          item.labels.forEach((label) => labelsToApply.add(label));
        }
      }
    }

    for (const label of labelsToApply) {
      await applyLabel(ctx, label);
    }
  },
});
