import { Context } from "probot";
import { getConfig } from "./getConfig.js";

export async function createCommitMessage(ctx: Context, msg: string) {
  const config = await getConfig(ctx);

  const app = (await ctx.octokit.rest.apps.getAuthenticated()).data;

  if (!app) return msg;

  const name = `${app.slug}[bot]`;
  const email = `${app.id}+${app.slug}[bot]@users.noreply.github.com`;

  if (config.hooks.dco) return `${msg}\n\nSigned-off-by: ${name} <${email}>`;

  return msg;
}
