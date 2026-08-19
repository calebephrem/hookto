import { Context } from "probot";
import { getConfig } from "./getConfig.js";

export interface ParsedCommand {
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
}

export async function parseCommand(
  ctx: Context<"issue_comment.created">,
): Promise<ParsedCommand | undefined> {
  const config = await getConfig(ctx);
  const { prefix, flagPrefix } = config.settings.commands;
  const cmd = ctx?.payload.comment.body;

  if (!cmd?.startsWith(prefix)) return;

  const body = cmd.slice(prefix.length).trim();

  if (!body) return;

  const firstSpaceIndex = body.indexOf(" ");

  if (firstSpaceIndex === -1) {
    return { command: body, args: [], flags: {} };
  }

  const command = body.slice(0, firstSpaceIndex);
  const rest = body.slice(firstSpaceIndex).trim();

  const escapedMarker = flagPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const flagRegex = new RegExp(
    `${escapedMarker}([a-zA-Z0-9]+)(?:\\s+([^${escapedMarker}]+))?`,
    "g",
  );

  const flags: Record<string, string | boolean> = {};
  const args: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = flagRegex.exec(rest)) !== null) {
    const flagName = match[1];
    const flagValue = match[2] ? match[2].trim() : true;

    const textBefore = rest.slice(lastIndex, match.index).trim();

    if (textBefore) {
      args.push(...textBefore.split(/\s+/));
    }

    flags[flagName] = flagValue;
    lastIndex = flagRegex.lastIndex;
  }

  const remainingText = rest.slice(lastIndex).trim();

  if (remainingText) {
    args.push(...remainingText.split(/\s+/));
  }

  return { command, args, flags };
}
