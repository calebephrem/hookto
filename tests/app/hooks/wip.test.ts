import type { Context } from "probot";
import { describe, expect, it, vi } from "vitest";
import wipHook from "../../../src/app/hooks/wip/index.js";
import { wipSchema } from "../../../src/app/hooks/wip/schema.js";
import * as configModule from "../../../src/lib/getConfig.js";
import { defaultConfig, type Config } from "../../../src/schemas/config.js";

type PrContext = Context<"pull_request.opened">;

function createMockContext(action: string, title: string, sha = "abc1234") {
  const createCheckMock = vi.fn().mockResolvedValue({ data: { id: 1 } });
  const mockCtx = {
    payload: {
      action,
      pull_request: {
        title,
        head: { sha },
      },
    },
    repo: () => ({ owner: "testowner", repo: "testrepo" }),
    octokit: {
      rest: {
        checks: {
          create: createCheckMock,
        },
      },
    },
  } as unknown as PrContext;

  return { mockCtx, createCheckMock };
}

describe("wip hook schema", () => {
  it("defaults enabled to true", () => {
    const parsed = wipSchema.parse({});
    expect(parsed.enabled).toBe(true);
  });

  it("allows overriding enabled", () => {
    const parsed = wipSchema.parse({ enabled: false });
    expect(parsed.enabled).toBe(false);
  });
});

describe("wip hook handler", () => {
  it("registers expected pull request events", () => {
    expect(wipHook.events).toEqual([
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.edited",
      "pull_request.synchronize",
    ]);
  });

  it("creates a failure check when PR title contains WIP on opened event", async () => {
    const { mockCtx, createCheckMock } = createMockContext(
      "opened",
      "[WIP] Implement new feature",
    );

    const mockConfig: Config = {
      ...defaultConfig,
      hooks: {
        ...defaultConfig.hooks,
        wip: { enabled: true },
      },
    };

    vi.spyOn(configModule, "getConfig").mockResolvedValue(mockConfig);

    await wipHook.callback(mockCtx);

    expect(createCheckMock).toHaveBeenCalledTimes(1);
    expect(createCheckMock).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      name: "WIP",
      head_sha: "abc1234",
      status: "completed",
      conclusion: "failure",
      output: {
        title: "Work in progress",
        summary:
          "This pull request is marked as **WIP** (Work In Progress) in its title and cannot be merged.",
      },
    });
  });

  it("creates a success check when title is edited to remove WIP", async () => {
    const { mockCtx, createCheckMock } = createMockContext(
      "edited",
      "feat: implement new feature ready for review",
    );

    const mockConfig: Config = {
      ...defaultConfig,
      hooks: {
        ...defaultConfig.hooks,
        wip: { enabled: true },
      },
    };

    vi.spyOn(configModule, "getConfig").mockResolvedValue(mockConfig);

    await wipHook.callback(mockCtx);

    expect(createCheckMock).toHaveBeenCalledTimes(1);
    expect(createCheckMock).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      name: "WIP",
      head_sha: "abc1234",
      status: "completed",
      conclusion: "success",
      output: {
        title: "Ready for review",
        summary: "This pull request is ready for review.",
      },
    });
  });

  it("creates a failure check when title is edited to add WIP", async () => {
    const { mockCtx, createCheckMock } = createMockContext(
      "edited",
      "WIP: rework feature architecture",
    );

    const mockConfig: Config = {
      ...defaultConfig,
      hooks: {
        ...defaultConfig.hooks,
        wip: { enabled: true },
      },
    };

    vi.spyOn(configModule, "getConfig").mockResolvedValue(mockConfig);

    await wipHook.callback(mockCtx);

    expect(createCheckMock).toHaveBeenCalledTimes(1);
    expect(createCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conclusion: "failure",
      }),
    );
  });

  it("handles synchronize events with updated commit sha", async () => {
    const { mockCtx, createCheckMock } = createMockContext(
      "synchronize",
      "wip - add more tests",
      "newsha999",
    );

    const mockConfig: Config = {
      ...defaultConfig,
      hooks: {
        ...defaultConfig.hooks,
        wip: { enabled: true },
      },
    };

    vi.spyOn(configModule, "getConfig").mockResolvedValue(mockConfig);

    await wipHook.callback(mockCtx);

    expect(createCheckMock).toHaveBeenCalledTimes(1);
    expect(createCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({
        head_sha: "newsha999",
        conclusion: "failure",
      }),
    );
  });

  it("handles reopened events", async () => {
    const { mockCtx, createCheckMock } = createMockContext(
      "reopened",
      "feat: reopened clean pull request",
      "reopensha123",
    );

    const mockConfig: Config = {
      ...defaultConfig,
      hooks: {
        ...defaultConfig.hooks,
        wip: { enabled: true },
      },
    };

    vi.spyOn(configModule, "getConfig").mockResolvedValue(mockConfig);

    await wipHook.callback(mockCtx);

    expect(createCheckMock).toHaveBeenCalledTimes(1);
    expect(createCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({
        head_sha: "reopensha123",
        conclusion: "success",
      }),
    );
  });

  it("does not trigger WIP for words like 'swiping' or 'equipment'", async () => {
    const { mockCtx, createCheckMock } = createMockContext(
      "opened",
      "fix: update equipment list and swiping gesture",
      "ghi9012",
    );

    const mockConfig: Config = {
      ...defaultConfig,
      hooks: {
        ...defaultConfig.hooks,
        wip: { enabled: true },
      },
    };

    vi.spyOn(configModule, "getConfig").mockResolvedValue(mockConfig);

    await wipHook.callback(mockCtx);

    expect(createCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conclusion: "success",
      }),
    );
  });

  it("does nothing when wip hook is disabled in config", async () => {
    const { mockCtx, createCheckMock } = createMockContext(
      "opened",
      "[WIP] Implement new feature",
    );

    const mockConfig: Config = {
      ...defaultConfig,
      hooks: {
        ...defaultConfig.hooks,
        wip: { enabled: false },
      },
    };

    vi.spyOn(configModule, "getConfig").mockResolvedValue(mockConfig);

    await wipHook.callback(mockCtx);

    expect(createCheckMock).not.toHaveBeenCalled();
  });
});
