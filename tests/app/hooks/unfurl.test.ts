import type { Context } from "probot";
import { describe, expect, it, vi } from "vitest";
import issueCommentHook from "../../../src/app/hooks/unfurl/issueComment.js";
import issueOpenHook from "../../../src/app/hooks/unfurl/issueOpen.js";
import prOpenHook from "../../../src/app/hooks/unfurl/prOpen.js";
import * as configModule from "../../../src/lib/getConfig.js";
import { defaultConfig, type Config } from "../../../src/schemas/config.js";

vi.mock("unfurl.js", () => ({
  unfurl: vi.fn(),
}));
vi.mock("../../../src/utils/buildEmbed.js", () => ({
  buildEmbed: vi.fn(() => "> embedded card"),
}));

import { unfurl } from "unfurl.js";

// NOTE: written against config.hooks.unfurl.* to match the hooks/unfurl
// folder name. If the config field is still named "embed" internally,
// swap every `unfurl:` below for `embed:`.
function withConfig(overrides: Partial<Config["hooks"]["unfurl"]>): Config {
  return {
    ...defaultConfig,
    hooks: {
      ...defaultConfig.hooks,
      unfurl: {
        enabled: true,
        issueComment: { enabled: true },
        prOpen: { enabled: true },
        issueOpen: { enabled: true },
        ...overrides,
      },
    },
  };
}

describe("unfurl / issueComment", () => {
  it("registers issue_comment.created", () => {
    expect(issueCommentHook.events).toEqual(["issue_comment.created"]);
  });

  it("skips comments from bots", async () => {
    const updateCommentMock = vi.fn();
    const mockCtx = {
      payload: {
        comment: {
          id: 1,
          body: "check out https://example.com",
          user: { type: "Bot" },
        },
      },
      issue: (extra: Record<string, unknown> = {}) => ({
        owner: "o",
        repo: "r",
        ...extra,
      }),
      octokit: { rest: { issues: { updateComment: updateCommentMock } } },
    } as unknown as Context<"issue_comment.created">;

    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await issueCommentHook.callback(mockCtx);

    expect(updateCommentMock).not.toHaveBeenCalled();
    expect(unfurl).not.toHaveBeenCalled();
  });

  it("does nothing when the comment has no links", async () => {
    const updateCommentMock = vi.fn();
    const mockCtx = {
      payload: {
        comment: { id: 1, body: "no links here", user: { type: "User" } },
      },
      issue: (extra: Record<string, unknown> = {}) => ({
        owner: "o",
        repo: "r",
        ...extra,
      }),
      octokit: { rest: { issues: { updateComment: updateCommentMock } } },
    } as unknown as Context<"issue_comment.created">;

    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await issueCommentHook.callback(mockCtx);

    expect(updateCommentMock).not.toHaveBeenCalled();
  });

  it("appends an embed to the comment when a link is found", async () => {
    vi.mocked(unfurl).mockResolvedValue({ title: "Example" } as never);
    const updateCommentMock = vi.fn().mockResolvedValue({});
    const mockCtx = {
      payload: {
        comment: {
          id: 55,
          body: "check out https://example.com/page",
          user: { type: "User" },
        },
      },
      issue: (extra: Record<string, unknown> = {}) => ({
        owner: "o",
        repo: "r",
        ...extra,
      }),
      octokit: { rest: { issues: { updateComment: updateCommentMock } } },
    } as unknown as Context<"issue_comment.created">;

    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await issueCommentHook.callback(mockCtx);

    expect(updateCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        comment_id: 55,
        body: expect.stringContaining("> embedded card"),
      }),
    );
  });

  it("does nothing when the hook-wide toggle is disabled", async () => {
    const updateCommentMock = vi.fn();
    const mockCtx = {
      payload: {
        comment: { id: 1, body: "https://example.com", user: { type: "User" } },
      },
      issue: (extra: Record<string, unknown> = {}) => ({
        owner: "o",
        repo: "r",
        ...extra,
      }),
      octokit: { rest: { issues: { updateComment: updateCommentMock } } },
    } as unknown as Context<"issue_comment.created">;

    const config = withConfig({});
    config.hooks.unfurl.enabled = false;
    vi.spyOn(configModule, "getConfig").mockResolvedValue(config);

    await issueCommentHook.callback(mockCtx);

    expect(updateCommentMock).not.toHaveBeenCalled();
  });

  it("does nothing when issueComment specifically is disabled", async () => {
    const updateCommentMock = vi.fn();
    const mockCtx = {
      payload: {
        comment: { id: 1, body: "https://example.com", user: { type: "User" } },
      },
      issue: (extra: Record<string, unknown> = {}) => ({
        owner: "o",
        repo: "r",
        ...extra,
      }),
      octokit: { rest: { issues: { updateComment: updateCommentMock } } },
    } as unknown as Context<"issue_comment.created">;

    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({ issueComment: { enabled: false } }),
    );

    await issueCommentHook.callback(mockCtx);

    expect(updateCommentMock).not.toHaveBeenCalled();
  });
});

describe("unfurl / prOpen", () => {
  it("registers pull_request.opened", () => {
    expect(prOpenHook.events).toEqual(["pull_request.opened"]);
  });

  it("appends an embed to the PR body when a link is found", async () => {
    vi.mocked(unfurl).mockResolvedValue({ title: "Example" } as never);
    const updateMock = vi.fn().mockResolvedValue({});
    const mockCtx = {
      payload: {
        pull_request: { body: "see https://example.com/page", number: 1 },
      },
      pullRequest: (extra: Record<string, unknown> = {}) => ({
        owner: "o",
        repo: "r",
        ...extra,
      }),
      octokit: { rest: { pulls: { update: updateMock } } },
    } as unknown as Context<"pull_request.opened">;

    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await prOpenHook.callback(mockCtx);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("> embedded card"),
      }),
    );
  });

  it("does nothing when the PR body has no links", async () => {
    const updateMock = vi.fn();
    const mockCtx = {
      payload: { pull_request: { body: "no links", number: 1 } },
      pullRequest: (extra: Record<string, unknown> = {}) => ({
        owner: "o",
        repo: "r",
        ...extra,
      }),
      octokit: { rest: { pulls: { update: updateMock } } },
    } as unknown as Context<"pull_request.opened">;

    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await prOpenHook.callback(mockCtx);

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("handles a null/empty PR body without throwing", async () => {
    const updateMock = vi.fn();
    const mockCtx = {
      payload: { pull_request: { body: null, number: 1 } },
      pullRequest: (extra: Record<string, unknown> = {}) => ({
        owner: "o",
        repo: "r",
        ...extra,
      }),
      octokit: { rest: { pulls: { update: updateMock } } },
    } as unknown as Context<"pull_request.opened">;

    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await expect(prOpenHook.callback(mockCtx)).resolves.not.toThrow();
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("unfurl / issueOpen", () => {
  it("registers issues.opened", () => {
    expect(issueOpenHook.events).toEqual(["issues.opened"]);
  });

  it("appends an embed to the issue body when a link is found", async () => {
    vi.mocked(unfurl).mockResolvedValue({ title: "Example" } as never);
    const updateMock = vi.fn().mockResolvedValue({});
    const mockCtx = {
      payload: { issue: { body: "see https://example.com/page", number: 1 } },
      issue: (extra: Record<string, unknown> = {}) => ({
        owner: "o",
        repo: "r",
        ...extra,
      }),
      octokit: { rest: { issues: { update: updateMock } } },
    } as unknown as Context<"issues.opened">;

    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await issueOpenHook.callback(mockCtx);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("> embedded card"),
      }),
    );
  });

  it("does nothing when issueOpen specifically is disabled", async () => {
    const updateMock = vi.fn();
    const mockCtx = {
      payload: { issue: { body: "https://example.com", number: 1 } },
      issue: (extra: Record<string, unknown> = {}) => ({
        owner: "o",
        repo: "r",
        ...extra,
      }),
      octokit: { rest: { issues: { update: updateMock } } },
    } as unknown as Context<"issues.opened">;

    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({ issueOpen: { enabled: false } }),
    );

    await issueOpenHook.callback(mockCtx);

    expect(updateMock).not.toHaveBeenCalled();
  });
});
