import type { Context } from "probot";
import { describe, expect, it, vi } from "vitest";
import issueOpenHook from "../../../src/app/hooks/label/issueOpen.js";
import prOpenHook from "../../../src/app/hooks/label/prOpen.js";
import * as configModule from "../../../src/lib/getConfig.js";
import * as applyLabelModule from "../../../src/lib/label.js";
import { defaultConfig, type Config } from "../../../src/schemas/config.js";

vi.mock("../../../src/lib/label.js", () => ({
  applyLabel: vi.fn(),
}));

function mockKeyword(
  keywords: string[],
  labels: string[],
  title = true,
  body = true,
) {
  return { keywords, labels, title, body };
}

function withConfig(overrides: Partial<Config["hooks"]["label"]>): Config {
  return {
    ...defaultConfig,
    hooks: {
      ...defaultConfig.hooks,
      label: {
        enabled: true,
        prOpen: {
          enabled: true,
          rules: [],
        },
        issueOpen: {
          enabled: true,
          rules: [],
        },
        ...overrides,
      },
    },
  };
}

describe("label / prOpen", () => {
  it("registers pull_request events", () => {
    expect(prOpenHook.events).toEqual([
      "pull_request.opened",
      "pull_request.synchronize",
      "pull_request.reopened",
    ]);
  });

  it("does nothing when the hook-wide toggle is disabled", async () => {
    const applyLabelSpy = vi.spyOn(applyLabelModule, "applyLabel");

    const mockCtx = {
      payload: {
        pull_request: {
          number: 1,
          title: "fix: bug in auth",
          body: "some description",
        },
      },
      repo: () => ({ owner: "o", repo: "r" }),
      octokit: {
        paginate: vi.fn().mockResolvedValue([]),
        rest: { pulls: { listFiles: vi.fn() } },
      },
    } as unknown as Context<"pull_request.opened">;

    const config = withConfig({
      enabled: false,
      prOpen: {
        enabled: true,
        rules: [
          {
            keywords: [mockKeyword(["fix"], ["bug"])],
            paths: [],
          },
        ],
      },
    });

    vi.spyOn(configModule, "getConfig").mockResolvedValue(config);

    await prOpenHook.callback(mockCtx);

    expect(applyLabelSpy).not.toHaveBeenCalled();
  });

  it("applies labels based on keyword and path matches", async () => {
    const applyLabelSpy = vi
      .spyOn(applyLabelModule, "applyLabel")
      .mockResolvedValue();

    const mockCtx = {
      payload: {
        pull_request: {
          number: 10,
          title: "feat: add user dashboard",
          body: "resolves issue with missing UI",
        },
      },
      repo: () => ({ owner: "o", repo: "r" }),
      octokit: {
        paginate: vi
          .fn()
          .mockResolvedValue([
            { filename: "src/components/Dashboard.tsx" },
            { filename: "docs/readme.md" },
          ]),
        rest: { pulls: { listFiles: vi.fn() } },
      },
    } as unknown as Context<"pull_request.opened">;

    const config = withConfig({
      prOpen: {
        enabled: true,
        rules: [
          {
            keywords: [mockKeyword(["feat"], ["enhancement"])],
            paths: [{ paths: ["src/components/**"], labels: ["frontend"] }],
          },
        ],
      },
    });

    vi.spyOn(configModule, "getConfig").mockResolvedValue(config);

    await prOpenHook.callback(mockCtx);

    expect(applyLabelSpy).toHaveBeenCalledTimes(2);
    expect(applyLabelSpy).toHaveBeenCalledWith(mockCtx, "enhancement");
    expect(applyLabelSpy).toHaveBeenCalledWith(mockCtx, "frontend");
  });

  it("does not apply labels when no rules match", async () => {
    const applyLabelSpy = vi.spyOn(applyLabelModule, "applyLabel");

    const mockCtx = {
      payload: {
        pull_request: {
          number: 2,
          title: "chore: clean up dependencies",
          body: "no matching words",
        },
      },
      repo: () => ({ owner: "o", repo: "r" }),
      octokit: {
        paginate: vi.fn().mockResolvedValue([{ filename: "package.json" }]),
        rest: { pulls: { listFiles: vi.fn() } },
      },
    } as unknown as Context<"pull_request.opened">;

    const config = withConfig({
      prOpen: {
        enabled: true,
        rules: [
          {
            keywords: [mockKeyword(["bugfix"], ["bug"])],
            paths: [{ paths: ["src/**/*.ts"], labels: ["backend"] }],
          },
        ],
      },
    });

    vi.spyOn(configModule, "getConfig").mockResolvedValue(config);

    await prOpenHook.callback(mockCtx);

    expect(applyLabelSpy).not.toHaveBeenCalled();
  });
});

describe("label / issueOpen", () => {
  it("registers issues events", () => {
    expect(issueOpenHook.events).toEqual(["issues.opened", "issues.reopened"]);
  });

  it("applies labels when issue title or body matches keywords", async () => {
    const applyLabelSpy = vi
      .spyOn(applyLabelModule, "applyLabel")
      .mockResolvedValue();

    const mockCtx = {
      payload: {
        issue: {
          number: 5,
          title: "Critical bug on payment page",
          body: "The checkout process fails silently.",
        },
      },
    } as unknown as Context<"issues.opened">;

    const config = withConfig({
      issueOpen: {
        enabled: true,
        rules: [
          mockKeyword(["bug", "fail"], ["bug", "triage"]),
          mockKeyword(["documentation"], ["docs"]),
        ],
      },
    });

    vi.spyOn(configModule, "getConfig").mockResolvedValue(config);

    await issueOpenHook.callback(mockCtx);

    expect(applyLabelSpy).toHaveBeenCalledTimes(2);
    expect(applyLabelSpy).toHaveBeenCalledWith(mockCtx, "bug");
    expect(applyLabelSpy).toHaveBeenCalledWith(mockCtx, "triage");
  });

  it("does nothing when issueOpen is explicitly disabled", async () => {
    const applyLabelSpy = vi.spyOn(applyLabelModule, "applyLabel");

    const mockCtx = {
      payload: {
        issue: {
          number: 1,
          title: "bug report",
          body: "details here",
        },
      },
    } as unknown as Context<"issues.opened">;

    const config = withConfig({
      issueOpen: {
        enabled: false,
        rules: [mockKeyword(["bug"], ["bug"])],
      },
    });

    vi.spyOn(configModule, "getConfig").mockResolvedValue(config);

    await issueOpenHook.callback(mockCtx);

    expect(applyLabelSpy).not.toHaveBeenCalled();
  });
});

describe("label / title vs body matching and file paths", () => {
  it("only matches title when body option is disabled", async () => {
    const applyLabelSpy = vi
      .spyOn(applyLabelModule, "applyLabel")
      .mockResolvedValue();

    const mockCtx = {
      payload: {
        issue: {
          number: 1,
          title: "Regular issue",
          body: "This has a critical bug in it",
        },
      },
    } as unknown as Context<"issues.opened">;

    const config = withConfig({
      issueOpen: {
        enabled: true,
        rules: [mockKeyword(["bug"], ["bug"], true, false)],
      },
    });

    vi.spyOn(configModule, "getConfig").mockResolvedValue(config);

    await issueOpenHook.callback(mockCtx);

    expect(applyLabelSpy).not.toHaveBeenCalled();
  });

  it("matches body when body option is enabled", async () => {
    const applyLabelSpy = vi
      .spyOn(applyLabelModule, "applyLabel")
      .mockResolvedValue();

    const mockCtx = {
      payload: {
        issue: {
          number: 2,
          title: "Regular issue",
          body: "This has a critical bug in it",
        },
      },
    } as unknown as Context<"issues.opened">;

    const config = withConfig({
      issueOpen: {
        enabled: true,
        rules: [mockKeyword(["bug"], ["bug"], false, true)],
      },
    });

    vi.spyOn(configModule, "getConfig").mockResolvedValue(config);

    await issueOpenHook.callback(mockCtx);

    expect(applyLabelSpy).toHaveBeenCalledTimes(1);
    expect(applyLabelSpy).toHaveBeenCalledWith(mockCtx, "bug");
  });

  it("applies labels when filepaths match minimatch patterns", async () => {
    const applyLabelSpy = vi
      .spyOn(applyLabelModule, "applyLabel")
      .mockResolvedValue();

    const mockCtx = {
      payload: {
        pull_request: {
          number: 3,
          title: "chore: tweak workflow",
          body: "ci update",
        },
      },
      repo: () => ({ owner: "o", repo: "r" }),
      octokit: {
        paginate: vi
          .fn()
          .mockResolvedValue([
            { filename: ".github/workflows/ci.yml" },
            { filename: "package.json" },
          ]),
        rest: { pulls: { listFiles: vi.fn() } },
      },
    } as unknown as Context<"pull_request.opened">;

    const config = withConfig({
      prOpen: {
        enabled: true,
        rules: [
          {
            keywords: [],
            paths: [
              { paths: [".github/**"], labels: ["ci"] },
              { paths: ["src/**"], labels: ["code"] },
            ],
          },
        ],
      },
    });

    vi.spyOn(configModule, "getConfig").mockResolvedValue(config);

    await prOpenHook.callback(mockCtx);

    expect(applyLabelSpy).toHaveBeenCalledTimes(1);
    expect(applyLabelSpy).toHaveBeenCalledWith(mockCtx, "ci");
  });
});
