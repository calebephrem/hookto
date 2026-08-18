import { z } from "zod";
import { acknowledgeSchema } from "../app/hooks/acknowledge/schema.js";
import { assignSchema } from "../app/hooks/assign/schema.js";
import { conventionalCommitsSchema } from "../app/hooks/conventionalCommits/schema.js";
import { dcoSchema } from "../app/hooks/dco/schema.js";
import { deleteMergedBranchSchema } from "../app/hooks/deleteMergedBranch/schema.js";
import { labelSchema } from "../app/hooks/label/schema.js";
import { pasteCISchema } from "../app/hooks/pasteCI/schema.js";
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
  dco: dcoSchema.default(dcoSchema.parse({})),
  assign: assignSchema.default(assignSchema.parse({})),
  label: labelSchema.default(labelSchema.parse({})),
  pasteCI: pasteCISchema.default(pasteCISchema.parse({})),
});
