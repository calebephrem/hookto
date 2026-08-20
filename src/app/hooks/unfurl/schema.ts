import { z } from "zod";

const subEventSchema = z.object({
  enabled: z.boolean().default(true),
});

export const unfurlSchema = z.object({
  enabled: z.boolean().default(false),
  issueComment: subEventSchema.default(subEventSchema.parse({})),
  prOpen: subEventSchema.default(subEventSchema.parse({})),
  issueOpen: subEventSchema.default(subEventSchema.parse({})),
  discussionComment: subEventSchema.default(subEventSchema.parse({})),
  discussionOpen: subEventSchema.default(subEventSchema.parse({})),
});
