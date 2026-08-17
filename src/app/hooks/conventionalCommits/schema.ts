import z from "zod";

export const conventionalCommitsSchema = z.object({
  enabled: z.boolean().default(false),
  title: z.boolean().default(true),
  commitMessages: z.boolean().default(true),
  fail: z.boolean().default(true),
});
