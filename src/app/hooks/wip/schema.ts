import z from "zod";

export const wipSchema = z.object({
  enabled: z.boolean().default(true),
});
