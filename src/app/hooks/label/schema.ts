import z from "zod";

const keywordRuleSchema = z.object({
  label: z.string().min(1),
  keywords: z.array(z.string()).default([]),
});

const pathRuleSchema = z.object({
  label: z.string().min(1),
  paths: z.array(z.string()).default([]),
});

export const labelSchema = z.object({
  enabled: z.boolean().default(false),
  keywords: z.array(keywordRuleSchema).default([
    { label: "bug", keywords: ["fix", "bug", "crash", "error", "broken"] },
    {
      label: "enhancement",
      keywords: ["feat", "feature", "add", "improve", "support"],
    },
    {
      label: "documentation",
      keywords: ["docs", "documentation", "readme", "typo"],
    },
  ]),
  paths: z.array(pathRuleSchema).default([
    { label: "documentation", paths: ["**/*.md", "docs/**"] },
    {
      label: "tests",
      paths: ["tests/**", "test/**", "**/*.test.*", "**/*.spec.*"],
    },
    {
      label: "dependencies",
      paths: [
        "package.json",
        "**/*.lock",
        "yarn.lock",
        "pnpm-lock.yaml",
        "requirements.txt",
        "go.mod",
        "Cargo.toml",
      ],
    },
  ]),
});
