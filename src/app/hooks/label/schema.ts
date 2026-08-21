import { z } from "zod";

const ruleSchema = z.object({
  keywords: z.array(z.string()).optional(),
  paths: z.array(z.string()).optional(),
  labels: z.array(z.string()).default([]),
  title: z.boolean().default(true),
  body: z.boolean().default(false),
});

const prOpenSchema = z.object({
  enabled: z.boolean().default(true),
  rules: z.array(ruleSchema).default([]),
});

const issueOpenSchema = z.object({
  enabled: z.boolean().default(true),
  rules: z.array(ruleSchema).default([]),
});

export const labelSchema = z.object({
  enabled: z.boolean().default(false),
  prOpen: prOpenSchema.default(() => prOpenSchema.parse({})),
  issueOpen: issueOpenSchema.default(() => issueOpenSchema.parse({})),
});
