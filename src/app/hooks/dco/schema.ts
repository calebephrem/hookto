import z from "zod";

export const dcoSchema = z.object({
  enabled: z.boolean().default(false),
  fail: z.boolean().default(true),
});
