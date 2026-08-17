import { unfurl } from "unfurl.js";
import { defineHook } from "../../../lib/eventHandler.js";
import { getConfig } from "../../../lib/getConfig.js";
import { buildEmbed } from "../../../utils/buildEmbed.js";
import { extractLinks } from "../../../utils/extractLinks.js";

export default defineHook({
  events: ["pull_request.opened"],
  callback: async (ctx) => {
    if (ctx.payload.pull_request.user?.type === "Bot") return;

    const config = await getConfig(ctx);

    if (!config.hooks.unfurl.enabled || !config.hooks.unfurl.prOpen.enabled)
      return;

    const links = Array.from(
      new Set(extractLinks(ctx.payload.pull_request.body || "")),
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
    const body = ctx.payload.pull_request.body + "\n\n" + resolved.join("\n");

    await ctx.octokit.rest.pulls.update(ctx.pullRequest({ body }));
  },
});
