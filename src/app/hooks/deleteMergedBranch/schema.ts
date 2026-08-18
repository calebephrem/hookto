import z from "zod";

export const deleteMergedBranchSchema = z.object({
  enabled: z.boolean().default(false),
  exclude: z.array(z.string()).default([]),
});
