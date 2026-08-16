import { z } from "zod";

const commandsSchema = z.object({
  prefix: z.string().min(1).max(10).default("!"),
  flagPrefix: z.string().min(1).max(5).default("-"),
});

export const settingsSchema = z.object({
  commands: commandsSchema.default(commandsSchema.parse({})),
});
