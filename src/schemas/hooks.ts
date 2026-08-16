import { deleteMergedBranchSchema } from "@/hooks/deleteMergedBranch/schema.js";
import { unfurlSchema } from "@/hooks/unfurl/schema.js";
import { z } from "zod";
import { acknowledgeSchema } from "../hooks/acknowledge/schema.js";

export const hooksSchema = z.object({
  acknowledge: acknowledgeSchema.default(acknowledgeSchema.parse({})),
  unfurl: unfurlSchema.default(unfurlSchema.parse({})),
  deleteMergedBranch: deleteMergedBranchSchema.default(
    deleteMergedBranchSchema.parse({}),
  ),
});
