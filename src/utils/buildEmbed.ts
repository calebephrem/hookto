import { unfurl } from "unfurl.js";

export type UnfurlResult = Awaited<ReturnType<typeof unfurl>>;

export function buildEmbed(embed: UnfurlResult): string {
  const url = embed.open_graph?.url || "";
  const titleText = embed.title || "Link Preview";
  const siteName = embed.open_graph?.site_name || "";
  const description = embed.description || "";
  const favicon = embed.favicon || "";

  const imageUrl =
    embed.open_graph?.images?.[0]?.url ||
    embed.twitter_card?.images?.[0]?.url ||
    "";

  const image = imageUrl
    ? `<img src="${imageUrl}" width="70" align="right">`
    : "";

  const siteLine = siteName
    ? `<div>${favicon ? `<img src="${favicon}" height="14"> ` : ""}${siteName}</div>`
    : "";

  const title = url
    ? `<div><strong><a href="${url}">${titleText}</a></strong></div>`
    : `<div><strong>${titleText}</strong></div>`;

  const desc = description ? `<div>${description}</div>` : "";

  return `<blockquote>${image}${siteLine}${title}${desc}</blockquote>`;
}
