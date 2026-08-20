import { deleteBranch, isHooktoBranch } from "../../lib/branch.js";
import { defineHook } from "../../lib/eventHandler.js";

export default defineHook({
  events: ["pull_request.closed"],
  callback: async (ctx) => {
    const { pull_request } = ctx.payload;
    const headBranchName = pull_request.head.ref;
    const isFork = pull_request.head.repo?.id !== pull_request.base.repo?.id;
    const defaultBranch = ctx.payload.repository.default_branch;

    if (isFork || headBranchName === defaultBranch) return;

    const hooktoBranch = await isHooktoBranch(ctx, headBranchName);

    if (hooktoBranch) {
      try {
        await deleteBranch(ctx, headBranchName);
      } catch (error: any) {
        if (error.status === 404) return;

        throw error;
      }
    }
  },
});
