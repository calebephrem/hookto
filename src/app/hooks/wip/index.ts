import { defineHook } from "../../../lib/eventHandler.js";

export default defineHook({
  events: [
    "pull_request.opened",
    "pull_request.reopened",
    "pull_request.edited",
    "pull_request.synchronize",
  ],
  callback: async ({ ctx, config }) => {
    if (!config.hooks.wip.enabled) return;

    const title = ctx.payload.pull_request.title;
    const isWip = /\bwip\b/i.test(title);

    const { owner, repo } = ctx.repo();
    const head_sha = ctx.payload.pull_request.head.sha;

    await ctx.octokit.rest.checks.create({
      owner,
      repo,
      name: "WIP",
      head_sha,
      status: "completed",
      conclusion: isWip ? "failure" : "success",
      output: {
        title: isWip ? "Work in progress" : "Ready for review",
        summary: isWip
          ? "This pull request is marked as **WIP** (Work In Progress) in its title and cannot be merged."
          : "This pull request is ready for review.",
      },
    });
  },
});
