import { minimatch } from "minimatch";
import { defineHook } from "../../../lib/eventHandler.js";
import { applyLabel } from "../../../lib/label.js";

export default defineHook({
  events: [
    "pull_request.opened",
    "pull_request.synchronize",
    "pull_request.reopened",
  ],
  callback: async ({ ctx, config }) => {
    const { enabled, prOpen } = config.hooks.label;

    if (!enabled || !prOpen.enabled || !prOpen.rules.length) return;

    const pr = ctx.payload.pull_request;
    const title = pr.title.toLowerCase();
    const body = (pr.body || "").toLowerCase();
    const needsFiles = prOpen.rules.some((r) => r.paths && r.paths.length > 0);
    const files = needsFiles
      ? (
          await ctx.octokit.paginate(ctx.octokit.rest.pulls.listFiles, {
            ...ctx.repo(),
            pull_number: pr.number,
            per_page: 100,
          })
        ).map((file) => file.filename)
      : [];
    const labelsToApply = new Set<string>();

    for (const rule of prOpen.rules) {
      const keywords = rule.keywords ?? [];
      const paths = rule.paths ?? [];

      if (keywords.length > 0) {
        const hasKeywordMatch = keywords.some((kw) => {
          const lowerKw = kw.toLowerCase().trim();

          if (!lowerKw) return false;

          const titleMatched = rule.title && title.includes(lowerKw);
          const bodyMatched = rule.body && body.includes(lowerKw);
          return titleMatched || bodyMatched;
        });

        if (hasKeywordMatch) {
          rule.labels.forEach((label) => labelsToApply.add(label));
        }
      }

      if (paths.length > 0 && files.length > 0) {
        const hasPathMatch = files.some((file) =>
          paths.some((pattern) => minimatch(file, pattern)),
        );

        if (hasPathMatch) {
          rule.labels.forEach((label) => labelsToApply.add(label));
        }
      }
    }

    for (const label of labelsToApply) {
      await applyLabel(ctx, label);
    }
  },
});
