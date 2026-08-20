import { unfurl } from "unfurl.js";
import { defineHook } from "../../../lib/eventHandler.js";
import { buildEmbed } from "../../../utils/buildEmbed.js";
import { extractLinks } from "../../../utils/extractLinks.js";

export default defineHook({
  events: ["issue_comment.created"],
  callback: async ({ ctx, config }) => {
    if (
      !config.hooks.unfurl.enabled ||
      !config.hooks.unfurl.issueComment.enabled ||
      ctx.payload.comment.user?.type === "Bot"
    )
      return;

    const links = Array.from(new Set(extractLinks(ctx.payload.comment.body)));

    if (links.length === 0) return;

    const promises = links.map(async (link) => {
      try {
        return await unfurl(link);
      } catch {
        return null;
      }
    });

    const embeds = (await Promise.all(promises)).filter(
      (embed): embed is NonNullable<typeof embed> => embed !== null,
    );

    if (embeds.length === 0) return;

    const resolved = embeds.map((embed) => buildEmbed(embed));
    const body = ctx.payload.comment.body + "\n\n" + resolved.join("\n");

    await ctx.octokit.rest.issues.updateComment(
      ctx.issue({ comment_id: ctx.payload.comment.id, body }),
    );
  },
});
