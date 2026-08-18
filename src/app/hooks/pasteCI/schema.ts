import z from "zod";

export const pasteCISchema = z.object({
  enabled: z.boolean().default(false),
  lines: z.number().int().min(1).max(200).default(50),
});
