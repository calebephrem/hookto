import { z } from "zod";
import { hooksSchema } from "./hooks.js";
import { settingsSchema } from "./settings.js";

export const configSchema = z.object({
  hooks: hooksSchema.default(hooksSchema.parse({})),
  settings: settingsSchema.default(settingsSchema.parse({})),
});

export type Config = z.infer<typeof configSchema>;

export const defaultConfig: Config = configSchema.parse({});
