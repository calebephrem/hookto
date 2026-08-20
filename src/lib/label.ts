import { Context } from "probot";
import { randomHexColor } from "../utils/randomHexColor.js";

export async function applyLabel(ctx: Context, label: string): Promise<void> {
  try {
    await ctx.octokit.rest.issues.addLabels(
      ctx.issue({
        labels: [label],
      }),
    );
  } catch (error: any) {
    if (error.status === 404) {
      await ctx.octokit.rest.issues.createLabel(
        ctx.issue({
          name: label,
          color: randomHexColor(),
        }),
      );

      await ctx.octokit.rest.issues.addLabels(
        ctx.issue({
          labels: [label],
        }),
      );
    } else {
      throw error;
    }
  }
}
