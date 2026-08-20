import type { Context } from "probot";
import { describe, expect, it, vi } from "vitest";
import issueCloseHook from "../../../src/app/hooks/acknowledge/issueClose.js";
import issueOpenHook from "../../../src/app/hooks/acknowledge/issueOpen.js";
import prCloseHook from "../../../src/app/hooks/acknowledge/prClose.js";
import prOpenHook from "../../../src/app/hooks/acknowledge/prOpen.js";
import { acknowledgeSchema } from "../../../src/app/hooks/acknowledge/schema.js";
import * as configModule from "../../../src/lib/getConfig.js";
import { defaultConfig, type Config } from "../../../src/schemas/config.js";

function createMockContext(
  userType: "User" | "Bot" = "User",
  eventType: "issue" | "pull_request" = "issue",
) {
  const createCommentMock = vi.fn().mockResolvedValue({ data: { id: 1 } });

  const payloadKey = eventType === "pull_request" ? "pull_request" : "issue";

  const mockCtx = {
    payload: {
      [payloadKey]: {
        number: 1,
        user: { type: userType },
      },
    },
    repo: () => ({ owner: "testowner", repo: "testrepo" }),
    issue: (extra: Record<string, unknown> = {}) => ({
      owner: "testowner",
      repo: "testrepo",
      issue_number: 1,
      ...extra,
    }),
    octokit: {
      rest: {
        issues: {
          createComment: createCommentMock,
        },
      },
    },
  } as unknown as Context;

  return { mockCtx, createCommentMock };
}

function withAcknowledgeConfig(
  overrides: Partial<Config["hooks"]["acknowledge"]>,
): Config {
  return {
    ...defaultConfig,
    hooks: {
      ...defaultConfig.hooks,
      acknowledge: {
        ...acknowledgeSchema.parse({}),
        ...overrides,
      },
    },
  };
}

describe("acknowledge hook schema", () => {
  it("defaults everything to enabled with default messages", () => {
    const parsed = acknowledgeSchema.parse({});
    expect(parsed.enabled).toBe(true);
    expect(parsed.prOpen).toEqual({
      enabled: true,
      message: "Thanks for opening this PR!",
    });
    expect(parsed.prClose).toEqual({
      enabled: true,
      message: "Thanks for your contribution!",
    });
    expect(parsed.issueOpen).toEqual({
      enabled: true,
      message: "Thanks for opening this issue!",
    });
    expect(parsed.issueClose).toEqual({
      enabled: true,
      message: "Thanks for reporting!",
    });
  });
});

describe("acknowledge / prOpen", () => {
  it("registers pull_request.opened", () => {
    expect(prOpenHook.events).toEqual(["pull_request.opened"]);
  });

  it("comments the configured message for real users when enabled", async () => {
    const { mockCtx, createCommentMock } = createMockContext(
      "User",
      "pull_request",
    );
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withAcknowledgeConfig({
        prOpen: { enabled: true, message: "hi new PR" },
      }),
    );

    await prOpenHook.callback(mockCtx as Context<"pull_request.opened">);

    expect(createCommentMock).toHaveBeenCalledTimes(1);
    expect(createCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: "hi new PR" }),
    );
  });

  it("ignores PRs opened by bots", async () => {
    const { mockCtx, createCommentMock } = createMockContext(
      "Bot",
      "pull_request",
    );
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withAcknowledgeConfig({
        prOpen: { enabled: true, message: "hi new PR" },
      }),
    );

    await prOpenHook.callback(mockCtx as Context<"pull_request.opened">);

    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("does nothing when prOpen is disabled but the hook itself is enabled", async () => {
    const { mockCtx, createCommentMock } = createMockContext(
      "User",
      "pull_request",
    );
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withAcknowledgeConfig({
        prOpen: { enabled: false, message: "hi new PR" },
      }),
    );

    await prOpenHook.callback(mockCtx as Context<"pull_request.opened">);

    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("does nothing when the whole acknowledge hook is disabled", async () => {
    const { mockCtx, createCommentMock } = createMockContext(
      "User",
      "pull_request",
    );
    const config = withAcknowledgeConfig({
      prOpen: { enabled: true, message: "hi" },
    });
    config.hooks.acknowledge.enabled = false;
    vi.spyOn(configModule, "getConfig").mockResolvedValue(config);

    await prOpenHook.callback(mockCtx as Context<"pull_request.opened">);

    expect(createCommentMock).not.toHaveBeenCalled();
  });
});

describe("acknowledge / prClose", () => {
  it("registers pull_request.closed", () => {
    expect(prCloseHook.events).toEqual(["pull_request.closed"]);
  });

  it("comments the configured message for real users when enabled", async () => {
    const { mockCtx, createCommentMock } = createMockContext(
      "User",
      "pull_request",
    );
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withAcknowledgeConfig({ prClose: { enabled: true, message: "thanks!" } }),
    );

    await prCloseHook.callback(mockCtx as Context<"pull_request.closed">);

    expect(createCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: "thanks!" }),
    );
  });

  it("ignores PRs closed by bots", async () => {
    const { mockCtx, createCommentMock } = createMockContext(
      "Bot",
      "pull_request",
    );
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withAcknowledgeConfig({ prClose: { enabled: true, message: "thanks!" } }),
    );

    await prCloseHook.callback(mockCtx as Context<"pull_request.closed">);

    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("does nothing when disabled", async () => {
    const { mockCtx, createCommentMock } = createMockContext(
      "User",
      "pull_request",
    );
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withAcknowledgeConfig({
        prClose: { enabled: false, message: "thanks!" },
      }),
    );

    await prCloseHook.callback(mockCtx as Context<"pull_request.closed">);

    expect(createCommentMock).not.toHaveBeenCalled();
  });
});

describe("acknowledge / issueOpen", () => {
  it("registers issues.opened", () => {
    expect(issueOpenHook.events).toEqual(["issues.opened"]);
  });

  it("comments the configured message for real users when enabled", async () => {
    const { mockCtx, createCommentMock } = createMockContext("User", "issue");
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withAcknowledgeConfig({
        issueOpen: { enabled: true, message: "hi new issue" },
      }),
    );

    await issueOpenHook.callback(mockCtx as Context<"issues.opened">);

    expect(createCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: "hi new issue" }),
    );
  });

  it("ignores issues opened by bots", async () => {
    const { mockCtx, createCommentMock } = createMockContext("Bot", "issue");
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withAcknowledgeConfig({
        issueOpen: { enabled: true, message: "hi new issue" },
      }),
    );

    await issueOpenHook.callback(mockCtx as Context<"issues.opened">);

    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("does nothing when disabled", async () => {
    const { mockCtx, createCommentMock } = createMockContext("User", "issue");
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withAcknowledgeConfig({ issueOpen: { enabled: false, message: "hi" } }),
    );

    await issueOpenHook.callback(mockCtx as Context<"issues.opened">);

    expect(createCommentMock).not.toHaveBeenCalled();
  });
});

describe("acknowledge / issueClose", () => {
  it("registers issues.closed", () => {
    expect(issueCloseHook.events).toEqual(["issues.closed"]);
  });

  it("comments the configured message for real users when enabled", async () => {
    const { mockCtx, createCommentMock } = createMockContext("User", "issue");
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withAcknowledgeConfig({
        issueClose: { enabled: true, message: "closed, thanks" },
      }),
    );

    await issueCloseHook.callback(mockCtx as Context<"issues.closed">);

    expect(createCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: "closed, thanks" }),
    );
  });

  it("ignores issues closed by bots", async () => {
    const { mockCtx, createCommentMock } = createMockContext("Bot", "issue");
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withAcknowledgeConfig({
        issueClose: { enabled: true, message: "closed, thanks" },
      }),
    );

    await issueCloseHook.callback(mockCtx as Context<"issues.closed">);

    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("does nothing when disabled", async () => {
    const { mockCtx, createCommentMock } = createMockContext("User", "issue");
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withAcknowledgeConfig({
        issueClose: { enabled: false, message: "closed" },
      }),
    );

    await issueCloseHook.callback(mockCtx as Context<"issues.closed">);

    expect(createCommentMock).not.toHaveBeenCalled();
  });
});
