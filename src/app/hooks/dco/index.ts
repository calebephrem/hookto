import { defineHook } from "../../../lib/eventHandler.js";
import { getConfig } from "../../../lib/getConfig.js";
import { buildGFM } from "../../../utils/buildGFM.js";

const signedOffByPattern = /^Signed-off-by:\s+.+\s+<\S+@\S+>\s*$/im;

export default defineHook({
  events: [
    "pull_request.opened",
    "pull_request.reopened",
    "pull_request.synchronize",
  ],
  callback: async (ctx) => {
    const config = await getConfig(ctx);

    if (!config.hooks.dco.enabled) return;

    const { fail } = config.hooks.dco;
    const { owner, repo } = ctx.repo();
    let check;

    if (fail) {
      check = await ctx.octokit.rest.checks.create({
        owner,
        repo,
        name: "Developer Certificate of Origin",
        head_sha: ctx.payload.pull_request.head.sha,
        status: "in_progress",
      });
    }

    const commits = await ctx.octokit.paginate(
      ctx.octokit.rest.pulls.listCommits,
      {
        owner,
        repo,
        pull_number: ctx.payload.pull_request.number,
        per_page: 100,
      },
    );

    const unsigned = commits
      .filter((commit) => commit.parents.length <= 1)
      .filter((commit) => !signedOffByPattern.test(commit.commit.message))
      .map(
        (commit) =>
          `Commit [${commit.sha.slice(0, 7)}](https://github.com/${owner}/${repo}/commit/${commit.sha}): \`${commit.commit.message.split("\n")[0]}\``,
      );

    const hasFailed = unsigned.length > 0;
    const commentMark = "<!-- hookto-dco -->";

    const summaryMD =
      commentMark +
      "\n" +
      (hasFailed
        ? buildGFM([
            {
              type: "important",
              text: "Some commits in this PR are missing a `Signed-off-by` line, required by the [**Developer Certificate of Origin**](https://developercertificate.org/).\n\nExpected trailer: `Signed-off-by: Your Name <your@email.com>`",
            },
            {
              type: "details",
              content: {
                summary: "Commits missing a sign-off</strong>",
                items: unsigned,
              },
            },
            {
              type: "tip",
              text: `Sign off new commits with \`git commit -s\`, or fix existing ones with \`git rebase --signoff origin/${ctx.payload.pull_request.base.ref}\` and force-push (\`git push --force-with-lease\`).`,
            },
          ])
        : buildGFM([
            {
              type: "note",
              text: "All commits are signed off in accordance with the [Developer Certificate of Origin](https://developercertificate.org/). Good to go!",
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
            ? "Missing Signed-off-by trailers"
            : "All Commits Signed Off",
          summary: summaryMD,
        },
      });
    }
  },
});
