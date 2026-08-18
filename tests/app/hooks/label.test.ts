import type { Context } from "probot";
import { describe, expect, it, vi } from "vitest";
import labelIssueOpen from "../../../src/app/hooks/label/issueOpen.js";
import {
  matchKeywordLabels,
  matchPathLabels,
} from "../../../src/app/hooks/label/matchers.js";
import labelPrOpen from "../../../src/app/hooks/label/prOpen.js";
import * as configModule from "../../../src/lib/getConfig.js";
import { defaultConfig, type Config } from "../../../src/schemas/config.js";

function withConfig(overrides: Partial<Config["hooks"]["label"]>): Config {
  return {
    ...defaultConfig,
    hooks: {
      ...defaultConfig.hooks,
      label: {
        ...defaultConfig.hooks.label,
        enabled: true,
        ...overrides,
      },
    },
  };
}

function createIssueContext(title: string) {
  const addLabelsMock = vi.fn().mockResolvedValue({});

  const mockCtx = {
    payload: { issue: { title, number: 1 } },
    repo: () => ({ owner: "testowner", repo: "testrepo" }),
    issue: (extra: Record<string, unknown> = {}) => ({
      owner: "testowner",
      repo: "testrepo",
      issue_number: 1,
      ...extra,
    }),
    octokit: { rest: { issues: { addLabels: addLabelsMock } } },
  } as unknown as Context<"issues.opened">;

  return { mockCtx, addLabelsMock };
}

function createPrContext(title: string, files: string[]) {
  const addLabelsMock = vi.fn().mockResolvedValue({});
  const paginateMock = vi
    .fn()
    .mockResolvedValue(files.map((filename) => ({ filename })));

  const mockCtx = {
    payload: { pull_request: { title, number: 1 } },
    repo: () => ({ owner: "testowner", repo: "testrepo" }),
    issue: (extra: Record<string, unknown> = {}) => ({
      owner: "testowner",
      repo: "testrepo",
      issue_number: 1,
      ...extra,
    }),
    octokit: {
      paginate: paginateMock,
      rest: {
        issues: { addLabels: addLabelsMock },
        pulls: { listFiles: vi.fn() },
      },
    },
  } as unknown as Context<"pull_request.opened">;

  return { mockCtx, addLabelsMock };
}

describe("label matchers", () => {
  it("matches title keywords case-insensitively on word boundaries", () => {
    const rules = [{ label: "bug", keywords: ["fix", "crash"] }];

    expect(matchKeywordLabels("Fix the login page", rules)).toEqual(["bug"]);
    expect(matchKeywordLabels("CRASH on startup", rules)).toEqual(["bug"]);
    expect(matchKeywordLabels("prefix should not match", rules)).toEqual([]);
  });

  it("matches changed files against glob patterns", () => {
    const rules = [
      { label: "documentation", paths: ["**/*.md", "docs/**"] },
      { label: "tests", paths: ["tests/**"] },
    ];

    expect(matchPathLabels(["README.md"], rules)).toEqual(["documentation"]);
    expect(matchPathLabels(["docs/guide/intro.txt"], rules)).toEqual([
      "documentation",
    ]);
    expect(matchPathLabels(["src/index.ts"], rules)).toEqual([]);
    expect(
      matchPathLabels(["tests/app/foo.test.ts", "README.md"], rules),
    ).toEqual(["documentation", "tests"]);
  });
});

describe("label hook (issues)", () => {
  it("registers issues.opened", () => {
    expect(labelIssueOpen.events).toEqual(["issues.opened"]);
  });

  it("does nothing when disabled", async () => {
    const { mockCtx, addLabelsMock } = createIssueContext("fix: broken thing");
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({ enabled: false }),
    );

    await labelIssueOpen.callback(mockCtx);

    expect(addLabelsMock).not.toHaveBeenCalled();
  });

  it("labels an issue from title keywords using the defaults", async () => {
    const { mockCtx, addLabelsMock } = createIssueContext(
      "App crash when opening settings",
    );
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await labelIssueOpen.callback(mockCtx);

    expect(addLabelsMock).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ["bug"] }),
    );
  });

  it("does not call the API when nothing matches", async () => {
    const { mockCtx, addLabelsMock } = createIssueContext("Random question");
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await labelIssueOpen.callback(mockCtx);

    expect(addLabelsMock).not.toHaveBeenCalled();
  });
});

describe("label hook (pull requests)", () => {
  it("registers pull_request opened, reopened, and synchronize", () => {
    expect(labelPrOpen.events).toEqual([
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.synchronize",
    ]);
  });

  it("labels a PR from both title keywords and changed paths, deduplicated", async () => {
    const { mockCtx, addLabelsMock } = createPrContext("docs: fix readme", [
      "README.md",
      "package.json",
    ]);
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await labelPrOpen.callback(mockCtx);

    expect(addLabelsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        labels: ["bug", "documentation", "dependencies"],
      }),
    );
  });

  it("uses custom rules when configured, replacing the defaults", async () => {
    const { mockCtx, addLabelsMock } = createPrContext("update styles", [
      "src/ui/button.css",
    ]);
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({
        keywords: [],
        paths: [{ label: "frontend", paths: ["src/ui/**"] }],
      }),
    );

    await labelPrOpen.callback(mockCtx);

    expect(addLabelsMock).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ["frontend"] }),
    );
  });

  it("does nothing when disabled", async () => {
    const { mockCtx, addLabelsMock } = createPrContext("fix: thing", [
      "README.md",
    ]);
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({ enabled: false }),
    );

    await labelPrOpen.callback(mockCtx);

    expect(addLabelsMock).not.toHaveBeenCalled();
  });
});
