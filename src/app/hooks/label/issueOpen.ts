import { defineHook } from "../../../lib/eventHandler.js";
import { applyLabel } from "../../../lib/label.js";

export default defineHook({
  events: ["issues.opened", "issues.reopened"],
  callback: async ({ ctx, config }) => {
    const { enabled, issueOpen } = config.hooks.label;

    console.log("[label/issueOpen] Event received", enabled, issueOpen);

    if (!enabled || !issueOpen.enabled || !issueOpen.rules.length) return;

    const issue = ctx.payload.issue;
    const title = issue.title.toLowerCase();
    const body = (issue.body || "").toLowerCase();

    const labelsToApply = new Set<string>();

    for (const item of issueOpen.rules) {
      const hasMatch = item.keywords.some((kw) => {
        const lowerKw = kw.toLowerCase().trim();
        if (!lowerKw) return false;

        const titleMatched = item.title && title.includes(lowerKw);
        const bodyMatched = item.body && body.includes(lowerKw);

        return titleMatched || bodyMatched;
      });

      if (hasMatch) {
        item.labels.forEach((label) => labelsToApply.add(label));
      }
    }

    for (const label of labelsToApply) {
      await applyLabel(ctx, label);
    }
  },
});
