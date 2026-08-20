import { unfurl } from "unfurl.js";
import { defineHook } from "../../../lib/eventHandler.js";
import { buildEmbed } from "../../../utils/buildEmbed.js";
import { extractLinks } from "../../../utils/extractLinks.js";

export default defineHook({
  events: ["discussion_comment.created"],
  callback: async ({ ctx, config }) => {
    if (
      !config.hooks.unfurl.enabled ||
      !config.hooks.unfurl.discussionComment?.enabled ||
      ctx.payload.comment.user?.type === "Bot"
    )
      return;

    const links = Array.from(
      new Set(extractLinks(ctx.payload.comment.body || "")),
    );

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

    await ctx.octokit.graphql(
      `
      mutation updateDiscussionComment($nodeId: ID!, $body: String!) {
        updateDiscussionComment(input: { commentId: $nodeId, body: $body }) {
          comment {
            id
          }
        }
      }
      `,
      {
        nodeId: ctx.payload.comment.node_id,
        body,
      },
    );
  },
});
