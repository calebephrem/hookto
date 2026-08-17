import { z } from "zod";

const prOpenSchema = z.object({
  enabled: z.boolean().default(true),
  message: z.string().min(1).default("Thanks for opening this PR!"),
});

const prCloseSchema = z.object({
  enabled: z.boolean().default(true),
  message: z.string().min(1).default("Thanks for your contribution!"),
});

const issueOpenSchema = z.object({
  enabled: z.boolean().default(true),
  message: z.string().min(1).default("Thanks for opening this issue!"),
});

const issueCloseSchema = z.object({
  enabled: z.boolean().default(true),
  message: z.string().min(1).default("Thanks for reporting!"),
});

export const acknowledgeSchema = z.object({
  enabled: z.boolean().default(true),
  prOpen: prOpenSchema.default(prOpenSchema.parse({})),
  prClose: prCloseSchema.default(prCloseSchema.parse({})),
  issueOpen: issueOpenSchema.default(issueOpenSchema.parse({})),
  issueClose: issueCloseSchema.default(issueCloseSchema.parse({})),
});
