import { defineCommand } from "@/lib/eventHandler.js";

export default defineCommand(async (ctx) => {
  await ctx.octokit.rest.issues.createComment(ctx.issue({ body: "Pong! " }));
});
