import { randomBytes } from "crypto";

export function genID(length: number = 12) {
  const bytesNeeded = Math.ceil(length / 2);
  return randomBytes(bytesNeeded).toString("hex").slice(0, length);
}
