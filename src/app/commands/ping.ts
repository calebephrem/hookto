import { defineCommand } from "../../lib/eventHandler.js";

export default defineCommand(async ({ ctx, cmd }) => {
  if (cmd.command !== "ping") return;

  await ctx.octokit.rest.issues.createComment(ctx.issue({ body: "Pong!" }));
});
