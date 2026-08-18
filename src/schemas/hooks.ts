import { z } from "zod";
import { acknowledgeSchema } from "../app/hooks/acknowledge/schema.js";
import { assignSchema } from "../app/hooks/assign/schema.js";
import { conventionalCommitsSchema } from "../app/hooks/conventionalCommits/schema.js";
import { deleteMergedBranchSchema } from "../app/hooks/deleteMergedBranch/schema.js";
import { unfurlSchema } from "../app/hooks/unfurl/schema.js";
import { wipSchema } from "../app/hooks/wip/schema.js";

export const hooksSchema = z.object({
  acknowledge: acknowledgeSchema.default(acknowledgeSchema.parse({})),
  unfurl: unfurlSchema.default(unfurlSchema.parse({})),
  deleteMergedBranch: deleteMergedBranchSchema.default(
    deleteMergedBranchSchema.parse({}),
  ),
  conventionalCommits: conventionalCommitsSchema.default(
    conventionalCommitsSchema.parse({}),
  ),
  wip: wipSchema.default(wipSchema.parse({})),
  assign: assignSchema.default(assignSchema.parse({})),
});
