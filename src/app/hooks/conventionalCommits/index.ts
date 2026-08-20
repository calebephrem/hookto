import { defineHook } from "../../../lib/eventHandler.js";
import { buildGFM } from "../../../utils/buildGFM.js";
import {
  conventionalCommitTypes,
  parseConventionalCommits,
} from "../../../utils/conventionalCommits.js";

export default defineHook({
  events: [
    "pull_request.opened",
    "pull_request.reopened",
    "pull_request.synchronize",
  ],
  callback: async ({ ctx, config }) => {
    if (!config.hooks.conventionalCommits.enabled) return;

    const { fail } = config.hooks.conventionalCommits;
    const { owner, repo } = ctx.repo();
    let check;

    if (fail) {
      check = await ctx.octokit.rest.checks.create({
        owner,
        repo,
        name: "Conventional Commits Specification",
        head_sha: ctx.payload.pull_request.head.sha,
        status: "in_progress",
      });
    }

    const title = ctx.payload.pull_request.title;
    const commits = (
      await ctx.octokit.rest.pulls.listCommits({
        owner,
        repo,
        pull_number: ctx.payload.pull_request.number,
      })
    ).data.map((c) => ({ message: c.commit.message, sha: c.sha }));

    const summary: string[] = [];

    if (config.hooks.conventionalCommits.title) {
      const followsCC = parseConventionalCommits(title);
      if (followsCC === false) summary.push(`PR Title: \`${title}\``);
    }

    if (config.hooks.conventionalCommits.commitMessages) {
      commits.map((commit) => {
        const followsCC = parseConventionalCommits(commit.message);
        if (followsCC === false)
          summary.push(
            `Commit [${commit.sha.slice(0, 7)}](https://github.com/${owner}/${repo}/commit/${commit.sha}): \`${commit.message.split("\n")[0]}\``,
          );
      });
    }

    const hasFailed = summary.length > 0;
    const commentMark = "<!-- hookto-conventional-commits -->";

    const summaryMD =
      commentMark +
      "\n" +
      (hasFailed
        ? buildGFM([
            {
              type: "warning",
              text: "Some commit messages in this PR do not follow the [**Conventional Commits**](https://conventionalcommits.org/) specification.\n\nExpected format: `type(scope): description`",
            },
            {
              type: "details",
              content: {
                summary: "Invalid commit messages",
                items: summary,
              },
            },
            {
              type: "tip",
              text: [
                "**Valid types:** " +
                  conventionalCommitTypes
                    .map((type) => `\`${type}\``)
                    .join(", "),
                `Fix non-compliant commit messages with \`git rebase -i origin/${ctx.payload.pull_request.base.ref}\` (change \`pick\` to \`reword\`) and force-push (\`git push --force-with-lease\`).`,
              ].join("\n\n"),
            },
          ])
        : buildGFM([
            {
              type: "note",
              text: "All commits and the PR title adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification. Good to go!",
            },
          ]));

    const botComment = (
      await ctx.octokit.rest.issues.listComments(ctx.issue())
    ).data.find(
      (comment) =>
        comment.user?.type === "Bot" && comment.body?.includes(commentMark),
    );

    if (botComment) {
      await ctx.octokit.rest.issues.updateComment(
        ctx.issue({
          comment_id: botComment.id,
          body: summaryMD,
        }),
      );
    } else {
      await ctx.octokit.rest.issues.createComment(
        ctx.issue({ body: summaryMD }),
      );
    }

    if (fail && check) {
      await ctx.octokit.rest.checks.update({
        owner,
        repo,
        check_run_id: check.data.id,
        status: "completed",
        conclusion: hasFailed ? "failure" : "success",
        output: {
          title: hasFailed
            ? "Invalid Conventional Commits"
            : "All Commits Valid",
          summary: summaryMD,
        },
      });
    }
  },
});
