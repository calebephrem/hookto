import { describe, expect, it } from "vitest";
import { parseConventionalCommits } from "../../src/utils/conventionalCommits.js";

describe("conventionalCommits", () => {
  it("returns false for invalid conventional commit messages", () => {
    [
      "test",
      "added tests",
      "added a massive feature",
      "add readme",
      "refactor code",
    ].map((msg) => {
      const isCC = parseConventionalCommits(msg);
      expect(isCC).toBe(false);
    });
  });

  it("returns ConventionalCommit object for valid conventional commit messages", () => {
    [
      "feat(auth): add illustration to auth page",
      "chore: format files with prettier",
      "refactor(api)!: migrate to typescript",
      "fix!: resolve api error",
      "ci: add super linter workflow",
    ].map((msg) => {
      const isCC = parseConventionalCommits(msg);

      expect(isCC).toHaveProperty("type");
      expect(isCC).toHaveProperty("description");
      expect(isCC).toHaveProperty("breaking");
    });
  });
});
