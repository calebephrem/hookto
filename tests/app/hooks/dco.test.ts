import type { Context } from "probot";
import { describe, expect, it, vi } from "vitest";
import dcoHook from "../../../src/app/hooks/dco/index.js";
import * as configModule from "../../../src/lib/getConfig.js";
import { defaultConfig, type Config } from "../../../src/schemas/config.js";

function createMockContext(
  commits: { message: string; sha: string; parents?: number }[],
) {
  const createCheckMock = vi.fn().mockResolvedValue({ data: { id: 42 } });
  const updateCheckMock = vi.fn().mockResolvedValue({});
  const paginateMock = vi.fn().mockResolvedValue(
    commits.map((c) => ({
      commit: { message: c.message },
      sha: c.sha,
      parents: Array.from({ length: c.parents ?? 1 }, (_, i) => ({
        sha: `parent${i}`,
      })),
    })),
  );
  const listCommentsMock = vi.fn().mockResolvedValue({ data: [] });
  const createCommentMock = vi.fn().mockResolvedValue({ data: { id: 1 } });
  const updateCommentMock = vi.fn().mockResolvedValue({});

  const mockCtx = {
    payload: {
      pull_request: {
        number: 1,
        head: { sha: "headsha123" },
        base: { ref: "main" },
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
      paginate: paginateMock,
      rest: {
        checks: { create: createCheckMock, update: updateCheckMock },
        pulls: { listCommits: vi.fn() },
        issues: {
          listComments: listCommentsMock,
          createComment: createCommentMock,
          updateComment: updateCommentMock,
        },
      },
    },
  } as unknown as Context<"pull_request.opened">;

  return {
    mockCtx,
    createCheckMock,
    updateCheckMock,
    listCommentsMock,
    createCommentMock,
    updateCommentMock,
  };
}

function withConfig(overrides: Partial<Config["hooks"]["dco"]>): Config {
  return {
    ...defaultConfig,
    hooks: {
      ...defaultConfig.hooks,
      dco: {
        enabled: true,
        fail: true,
        ...overrides,
      },
    },
  };
}

const signed = (msg: string) =>
  `${msg}\n\nSigned-off-by: Dev Name <dev@example.com>`;

describe("dco hook", () => {
  it("registers pull_request opened, reopened, and synchronize", () => {
    expect(dcoHook.events).toEqual([
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.synchronize",
    ]);
  });

  it("does nothing when disabled", async () => {
    const { mockCtx, createCheckMock, createCommentMock } = createMockContext([
      { message: "feat: unsigned", sha: "abc1234" },
    ]);
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({ enabled: false }),
    );

    await dcoHook.callback(mockCtx);

    expect(createCheckMock).not.toHaveBeenCalled();
    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("posts a success comment and passing check when all commits are signed off", async () => {
    const { mockCtx, createCheckMock, updateCheckMock, createCommentMock } =
      createMockContext([
        { message: signed("feat: thing"), sha: "abc1234" },
        { message: signed("fix: other"), sha: "def5678" },
      ]);
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await dcoHook.callback(mockCtx);

    expect(createCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "in_progress",
        head_sha: "headsha123",
      }),
    );
    expect(updateCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({ conclusion: "success" }),
    );
    expect(createCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("All commits are signed off"),
      }),
    );
  });

  it("posts a failure comment and failing check when a commit is not signed off", async () => {
    const { mockCtx, updateCheckMock, createCommentMock } = createMockContext([
      { message: signed("feat: fine"), sha: "abc1234" },
      { message: "feat: unsigned commit", sha: "def5678" },
    ]);
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await dcoHook.callback(mockCtx);

    expect(updateCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({ conclusion: "failure" }),
    );
    expect(createCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("feat: unsigned commit"),
      }),
    );
    expect(createCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("git rebase --signoff origin/main"),
      }),
    );
  });

  it("ignores merge commits", async () => {
    const { mockCtx, updateCheckMock } = createMockContext([
      { message: signed("feat: fine"), sha: "abc1234" },
      {
        message: "Merge branch 'main' into feature",
        sha: "def5678",
        parents: 2,
      },
    ]);
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await dcoHook.callback(mockCtx);

    expect(updateCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({ conclusion: "success" }),
    );
  });

  it("skips creating a check run when fail is false, but still comments", async () => {
    const { mockCtx, createCheckMock, updateCheckMock, createCommentMock } =
      createMockContext([{ message: "feat: unsigned", sha: "abc1234" }]);
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({ fail: false }),
    );

    await dcoHook.callback(mockCtx);

    expect(createCheckMock).not.toHaveBeenCalled();
    expect(updateCheckMock).not.toHaveBeenCalled();
    expect(createCommentMock).toHaveBeenCalled();
  });

  it("updates an existing bot comment instead of creating a new one", async () => {
    const { mockCtx, listCommentsMock, createCommentMock, updateCommentMock } =
      createMockContext([{ message: signed("feat: thing"), sha: "abc1234" }]);
    listCommentsMock.mockResolvedValue({
      data: [
        {
          id: 999,
          user: { type: "Bot" },
          body: "<!-- hookto-dco -->\nold summary",
        },
      ],
    });
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await dcoHook.callback(mockCtx);

    expect(updateCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 999 }),
    );
    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("rejects a sign-off with an invalid email", async () => {
    const { mockCtx, updateCheckMock } = createMockContext([
      {
        message: "feat: thing\n\nSigned-off-by: Dev Name <not-an-email>",
        sha: "abc1234",
      },
    ]);
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await dcoHook.callback(mockCtx);

    expect(updateCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({ conclusion: "failure" }),
    );
  });
});
