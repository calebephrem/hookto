import z from "zod";

const keywordsSchema = z.object({
  keywords: z.array(z.string()).default([]),
  labels: z.array(z.string()).default([]),
  title: z.boolean().default(true),
  body: z.boolean().default(false),
});

const pathsSchema = z.object({
  paths: z.array(z.string()).default([]),
  labels: z.array(z.string()).default([]),
});

const rulesSchema = z.object({
  keywords: z.array(keywordsSchema).default([]),
  paths: z.array(pathsSchema).default([]),
});

const prOpenSchema = z.object({
  enabled: z.boolean().default(true),
  rules: z.array(rulesSchema).default([]),
});

const issueOpenSchema = z.object({
  enabled: z.boolean().default(true),
  rules: z.array(keywordsSchema).default([]),
});

export const labelSchema = z.object({
  enabled: z.boolean().default(false),
  prOpen: prOpenSchema.default(() => prOpenSchema.parse({})),
  issueOpen: issueOpenSchema.default(() => issueOpenSchema.parse({})),
});
