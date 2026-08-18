import z from "zod";

const pathSchema = z.object({
  paths: z.array(z.string()).default(["*"]),
  reviewers: z.array(z.string()).default([]),
  assignees: z.array(z.string()).default([]),
});

export const assignSchema = z.object({
  enabled: z.boolean().default(false),
  rules: z.array(pathSchema).default([]),
});
