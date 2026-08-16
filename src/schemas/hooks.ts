import { z } from "zod";
import { schema as acknowledgeSchema } from "../hooks/acknowledge/schema.js";

export const hooksSchema = z.object({
  acknowledge: acknowledgeSchema.default(acknowledgeSchema.parse({})),
});
