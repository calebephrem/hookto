import { configPath } from "@/constants/config.js";
import { defineHook } from "@/lib/eventHandler.js";
import { clearCache } from "@/lib/getConfig.js";
import { logger } from "@/lib/logger.js";

export default defineHook({
  events: ["push"],
  async callback(ctx) {
    const { ref, repository, commits } = ctx.payload;
    const defaultBranchRef = `refs/heads/${repository.default_branch}`;

    if (ref !== defaultBranchRef) return;

    const touchedConfig = commits.some(
      (commit) =>
        (commit.added ?? []).includes(configPath) ||
        (commit.modified ?? []).includes(configPath) ||
        (commit.removed ?? []).includes(configPath),
    );

    if (!touchedConfig) return;

    const { owner, repo } = ctx.repo();

    await clearCache({ owner, repo });
    logger.info(
      `Cleared config cache for ${owner}/${repo} after ${configPath} change`,
    );
  },
});
