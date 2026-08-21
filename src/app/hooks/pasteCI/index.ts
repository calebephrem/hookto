import { defineHook } from "../../../lib/eventHandler.js";

const commentMark = "<!-- hookto-paste-ci -->";
const maxLogChars = 6000;

const tailOfLog = (log: string, lines: number) =>
  log
    .split("\n")
    .map((line) => line.replace(/^\S+Z\s/, ""))
    .filter((line) => line.trim().length > 0)
    .slice(-lines)
    .join("\n")
    .slice(-maxLogChars);

export default defineHook({
  events: ["workflow_run.completed"],
  callback: async ({ ctx, config }) => {
    const { enabled, lines } = config.hooks.pasteCI;

    if (!enabled) return;

    const run = ctx.payload.workflow_run;

    if (run.pull_requests.length === 0) return;

    const { owner, repo } = ctx.repo();

    const findBotComment = async (issueNumber: number) =>
      (
        await ctx.octokit.rest.issues.listComments({
          owner,
          repo,
          issue_number: issueNumber,
        })
      ).data.find(
        (comment) =>
          comment.user?.type === "Bot" && comment.body?.includes(commentMark),
      );

    const upsertComment = async (issueNumber: number, body: string) => {
      const botComment = await findBotComment(issueNumber);

      if (botComment) {
        await ctx.octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: botComment.id,
          body,
        });
      } else {
        await ctx.octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: issueNumber,
          body,
        });
      }
    };

    if (run.conclusion !== "failure") {
      const passedMD = [
        commentMark,
        "> [!NOTE]",
        `> CI is passing again on [\`${run.name}\`](${run.html_url}). Good to go!`,
      ].join("\n");

      for (const pr of run.pull_requests) {
        const botComment = await findBotComment(pr.number);
        if (botComment) await upsertComment(pr.number, passedMD);
      }
      return;
    }

    const failedJobs = (
      await ctx.octokit.rest.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id: run.id,
        filter: "latest",
      })
    ).data.jobs.filter((job) => job.conclusion === "failure");

    if (failedJobs.length === 0) return;

    const sections = await Promise.all(
      failedJobs.map(async (job) => {
        let log = "";

        try {
          const { data } =
            await ctx.octokit.rest.actions.downloadJobLogsForWorkflowRun({
              owner,
              repo,
              job_id: job.id,
            });
          log = tailOfLog(String(data), lines);
        } catch {
          log = "Logs could not be retrieved.";
        }

        return [
          "<details>",
          `<summary><strong>${job.name}</strong> — <a href="${job.html_url}">view job</a></summary>`,
          "",
          "```text",
          log,
          "```",
          "",
          "</details>",
        ].join("\n");
      }),
    );

    const summaryMD = [
      commentMark,
      "> [!WARNING]",
      `> CI failed on [\`${run.name}\`](${run.html_url}). Output of the failing job${failedJobs.length > 1 ? "s" : ""} below (last ${lines} lines).`,
      "",
      ...sections,
    ].join("\n");

    for (const pr of run.pull_requests) {
      await upsertComment(pr.number, summaryMD);
    }
  },
});
