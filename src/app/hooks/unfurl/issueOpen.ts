import { unfurl } from "unfurl.js";
import { defineHook } from "../../../lib/eventHandler.js";
import { buildEmbed } from "../../../utils/buildEmbed.js";
import { extractLinks } from "../../../utils/extractLinks.js";

export default defineHook({
  events: ["issues.opened"],
  callback: async ({ ctx, config }) => {
    if (
      !config.hooks.unfurl.enabled ||
      !config.hooks.unfurl.issueOpen.enabled ||
      ctx.payload.issue.user?.type === "Bot"
    )
      return;

    const links = Array.from(
      new Set(extractLinks(ctx.payload.issue.body || "")),
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
    const body = ctx.payload.issue.body + "\n\n" + resolved.join("\n");

    await ctx.octokit.rest.issues.update(ctx.issue({ body }));
  },
});
