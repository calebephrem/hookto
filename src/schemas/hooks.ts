import { embedSchema } from "@/hooks/embed/schema.js";
import { z } from "zod";
import { schema as acknowledgeSchema } from "../hooks/acknowledge/schema.js";

export const hooksSchema = z.object({
  acknowledge: acknowledgeSchema.default(acknowledgeSchema.parse({})),
  embed: embedSchema.default(embedSchema.parse({})),
});
