export interface ConventionalCommit {
  type: string;
  scope?: string;
  description: string;
  breaking: boolean;
}

export const conventionalCommitTypes = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
];

export function parseConventionalCommits(
  str: string,
  allowedTypes: string[] = conventionalCommitTypes,
): ConventionalCommit | false {
  if (!str || typeof str !== "string") return false;

  const headerRegex = /^([a-zA-Z0-9_$-]+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/;

  const lines = str.trim().split("\n");
  const firstLine = lines[0];

  const match = firstLine.match(headerRegex);
  if (!match) return false;

  const [, type, scope, breakingBang, description] = match;

  if (!allowedTypes.includes(type)) {
    return false;
  }

  const hasBreakingFooter = lines
    .slice(1)
    .some((line) =>
      /^(?:BREAKING CHANGE|BREAKING-CHANGE):\s+/.test(line.trim()),
    );

  return {
    type,
    ...(scope ? { scope } : {}),
    description: description.trim(),
    breaking: Boolean(breakingBang) || hasBreakingFooter,
  };
}
