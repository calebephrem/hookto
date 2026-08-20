import { minimatch } from "minimatch";
import { defineHook } from "../../../lib/eventHandler.js";
import { getConfig } from "../../../lib/getConfig.js";

export default defineHook({
  events: [
    "pull_request.opened",
    "pull_request.synchronize",
    "pull_request.reopened",
  ],
  callback: async (ctx) => {
    const config = await getConfig(ctx);

    const { enabled, rules } = config.hooks.assign;

    if (!enabled || !rules.length) return;

    const files = (
      await ctx.octokit.paginate(ctx.octokit.rest.pulls.listFiles, {
        ...ctx.repo(),
        pull_number: ctx.payload.pull_request.number,
        per_page: 100,
      })
    ).map((file) => file.filename);

    const matchedAssignees = new Set<string>();
    const matchedUserReviewers = new Set<string>();
    const matchedTeamReviewers = new Set<string>();
    const sanitize = (handle: string) => handle.trim();

    for (const rule of rules) {
      const isMatch = files.some((file) =>
        rule.paths.some((pattern) => minimatch(file, pattern)),
      );

      if (isMatch) {
        rule.assignees.forEach((assignee) => {
          const clean = sanitize(assignee).replace(/^@/, "");
          if (clean) matchedAssignees.add(clean);
        });

        rule.reviewers.forEach((reviewer) => {
          const clean = sanitize(reviewer);

          if (!clean) return;

          if (clean.startsWith("@")) {
            matchedUserReviewers.add(clean.slice(1));
          } else {
            const teamSlug = clean.includes("/") ? clean.split("/")[1] : clean;
            matchedTeamReviewers.add(teamSlug);
          }
        });
      }
    }

    const prAuthor = ctx.payload.pull_request.user?.login;
    const reviewers = Array.from(matchedUserReviewers).filter(
      (user) => user !== prAuthor,
    );
    const teamReviewers = Array.from(matchedTeamReviewers);
    const assignees = Array.from(matchedAssignees).filter(
      (user) => user !== prAuthor,
    );

    if (reviewers.length > 0 || teamReviewers.length > 0) {
      await ctx.octokit.rest.pulls.requestReviewers(
        ctx.pullRequest({
          reviewers,
          team_reviewers: teamReviewers,
        }),
      );
    }

    if (assignees.length > 0) {
      await ctx.octokit.rest.issues.addAssignees(ctx.issue({ assignees }));
    }
  },
});
