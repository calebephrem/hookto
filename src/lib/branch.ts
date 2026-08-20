import { Context } from "probot";
import { branchIdLen } from "../constants/config.js";
import { genID } from "../utils/genID.js";

export async function createBranch(ctx: Context, sha?: string) {
  const username =
    (await ctx.octokit.rest.apps.getAuthenticated()).data?.slug ?? "hookto";
  const { owner, repo } = ctx.repo();

  const branchName = `${username}/${genID(branchIdLen)}`;

  // console.log(username)

  if (!sha) {
    const baseBranch = (
      await ctx.octokit.rest.repos.get({
        owner,
        repo,
      })
    ).data.default_branch;

    const { data: baseRef } = await ctx.octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });

    sha = baseRef.object.sha;
  }

  await ctx.octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: sha,
  });

  return branchName;
}

export async function deleteBranch(ctx: Context, name: string) {
  const { owner, repo } = ctx.repo();

  await ctx.octokit.rest.git.deleteRef({
    owner,
    repo,
    ref: `heads/${name}`,
  });
}

export async function isHooktoBranch(ctx: Context, name: string) {
  const username =
    (await ctx.octokit.rest.apps.getAuthenticated()).data?.slug ?? "hookto";
  const start = `${username}/`;

  if (!name.startsWith(start)) return false;

  const id = name.slice(start.length);
  return id.length === branchIdLen;
}
