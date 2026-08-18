import { defineHook } from "../../../lib/eventHandler.js";
import { getConfig } from "../../../lib/getConfig.js";

export default defineHook({
  events: ["pull_request.closed"],
  callback: async (ctx) => {
    const config = await getConfig(ctx);
    const { enabled, exclude } = config.hooks.deleteMergedBranch;

    if (!enabled) return;

    const pr = ctx.payload.pull_request;

    if (!pr.merged) return;

    const headRepo = pr.head.repo;
    const baseRepo = pr.base.repo;
    const branchName = pr.head.ref;
    const defaultBranch = baseRepo.default_branch;

    if (
      branchName === defaultBranch ||
      headRepo.id !== baseRepo.id ||
      exclude.includes(branchName)
    )
      return;

    try {
      await ctx.octokit.rest.git.deleteRef({
        owner: headRepo.owner.login,
        repo: headRepo.name,
        ref: `heads/${branchName}`,
      });
    } catch (error) {
      const status = (error as { status?: number }).status;

      if (status === 422 || status === 404) {
        return;
      }

      throw error;
    }
  },
});
