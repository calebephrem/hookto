import { parseCommand } from "../../lib/commands.js";
import { defineCommand } from "../../lib/eventHandler.js";
import { getConfig } from "../../lib/getConfig.js";

export default defineCommand(async (ctx) => {
  const config = await getConfig(ctx);
  const command = await parseCommand(ctx);

  if (
    command?.command !== "ping" ||
    !ctx.payload.comment.body?.startsWith(config.settings.commands.prefix)
  ) {
    return;
  }

  await ctx.octokit.rest.issues.createComment(ctx.issue({ body: "Pong!" }));
});
