import { dump } from "js-yaml";
import { configPath } from "../../constants/config.js";
import { createBranch } from "../../lib/branch.js";
import { createCommitMessage } from "../../lib/commits.js";
import { defineCommand } from "../../lib/eventHandler.js";
import recommendedConfig from "../../templates/recommended.json" with { type: "json" };

export default defineCommand(async (ctx, cmd) => {
  if (cmd.command !== "config") return;

  const { owner, repo } = ctx.repo();

  try {
    let existingSha: string | undefined;
    let commitMessage = "chore: initialize `hookto.yml` configuration";

    try {
      const { data } = await ctx.octokit.rest.repos.getContent({
        owner,
        repo,
        path: configPath,
      });

      if (!Array.isArray(data) && "sha" in data) {
        existingSha = data.sha;
        commitMessage = "chore: update `hookto.yml` configuration";
      }

      commitMessage = await createCommitMessage(ctx, commitMessage);
    } catch (err: any) {
      if (err.status !== 404) throw err;
    }

    const yamlContent = dump(recommendedConfig, { indent: 2 });
    const branch = await createBranch(ctx);

    await ctx.octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: configPath,
      message: commitMessage,
      content: Buffer.from(yamlContent).toString("base64"),
      branch,
      sha: existingSha,
    });

    const { data: repoData } = await ctx.octokit.rest.repos.get({
      owner,
      repo,
    });

    const prBody = [
      "> [!NOTE]",
      `> Adds the recommended \`${configPath}\` configuration file. Review and merge to enable your hooks!`,
    ].join("\n");

    const { data: pr } = await ctx.octokit.rest.pulls.create({
      owner,
      repo,
      title: commitMessage,
      head: branch,
      base: repoData.default_branch,
      body: prBody,
    });

    const issueBody = [
      "> [!TIP]",
      `> Created configuration file and made a PR (#${pr.number})`,
    ].join("\n");

    await ctx.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: ctx.payload.issue.number,
      body: issueBody,
    });
  } catch (error) {
    await ctx.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: ctx.payload.issue.number,
      body: [
        "> [!WARNING]",
        "> Failed to create configuration PR:",
        "",
        `> ${error instanceof Error ? error.message : error}`,
      ].join("\n"),
    });
  }
});
