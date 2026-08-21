import type { Context } from "probot";
import { beforeEach, describe, expect, it, vi } from "vitest";
import conventionalCommitsHook from "../../../src/app/hooks/conventionalCommits/index.js";
import * as configModule from "../../../src/lib/getConfig.js";
import { defaultConfig, type Config } from "../../../src/schemas/config.js";

vi.mock("../../../src/utils/conventionalCommits.js", () => ({
  conventionalCommitTypes: ["feat", "fix", "chore", "docs"],
  parseConventionalCommits: vi.fn(),
}));

import {
  parseConventionalCommits,
  type ConventionalCommit,
} from "../../../src/utils/conventionalCommits.js";

const validCommit: ConventionalCommit = {
  type: "feat",
  description: "a valid conventional commit",
  breaking: false,
};

function createMockContext(
  title: string,
  commits: { message: string; sha: string }[],
) {
  const createCheckMock = vi.fn().mockResolvedValue({ data: { id: 42 } });
  const updateCheckMock = vi.fn().mockResolvedValue({});
  const listCommitsMock = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(
        commits.map((c) => ({ commit: { message: c.message }, sha: c.sha })),
      ),
    );
  const listCommentsMock = vi.fn().mockResolvedValue({ data: [] });
  const createCommentMock = vi.fn().mockResolvedValue({ data: { id: 1 } });
  const updateCommentMock = vi.fn().mockResolvedValue({});

  const mockCtx = {
    payload: {
      pull_request: {
        title,
        number: 1,
        head: {
          sha: "headsha123",
          ref: "feature-branch",
        },
        base: {
          ref: "main",
        },
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
      paginate: vi.fn().mockImplementation(async (fn, params) => {
        const res = await fn(params);
        return res;
      }),
      rest: {
        checks: { create: createCheckMock, update: updateCheckMock },
        pulls: { listCommits: listCommitsMock },
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

function withConfig(
  overrides: Partial<Config["hooks"]["conventionalCommits"]>,
): Config {
  return {
    ...defaultConfig,
    hooks: {
      ...defaultConfig.hooks,
      conventionalCommits: {
        enabled: true,
        fail: true,
        title: true,
        commitMessages: true,
        ...overrides,
      },
    },
  };
}

beforeEach(() => {
  vi.mocked(parseConventionalCommits).mockReset();
});

describe("conventionalCommits hook", () => {
  it("registers pull_request opened, reopened, and synchronize", () => {
    expect(conventionalCommitsHook.events).toEqual([
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.synchronize",
    ]);
  });

  it("does nothing when disabled", async () => {
    const { mockCtx, createCheckMock, createCommentMock } = createMockContext(
      "feat: thing",
      [],
    );
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({ enabled: false }),
    );

    await conventionalCommitsHook.callback(mockCtx);

    expect(createCheckMock).not.toHaveBeenCalled();
    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("posts a success comment and passing check when title and commits are valid", async () => {
    vi.mocked(parseConventionalCommits).mockReturnValue(validCommit);
    const { mockCtx, createCheckMock, updateCheckMock, createCommentMock } =
      createMockContext("feat: add new thing", [
        { message: "feat: add new thing", sha: "abc1234" },
      ]);
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await conventionalCommitsHook.callback(mockCtx);

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
        body: expect.stringContaining(
          "All commits and the PR title adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification. Good to go!",
        ),
      }),
    );
  });

  it("posts a failure comment and failing check when the title is invalid", async () => {
    vi.mocked(parseConventionalCommits).mockImplementation((msg: string) =>
      msg !== "bad title" ? validCommit : false,
    );
    const { mockCtx, updateCheckMock, createCommentMock } = createMockContext(
      "bad title",
      [{ message: "feat: fine", sha: "abc1234" }],
    );
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await conventionalCommitsHook.callback(mockCtx);

    expect(updateCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({ conclusion: "failure" }),
    );
    expect(createCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("bad title"),
      }),
    );
  });

  it("skips creating a check run when fail is false, but still comments", async () => {
    vi.mocked(parseConventionalCommits).mockReturnValue(false);
    const { mockCtx, createCheckMock, updateCheckMock, createCommentMock } =
      createMockContext("bad title", []);
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({ fail: false }),
    );

    await conventionalCommitsHook.callback(mockCtx);

    expect(createCheckMock).not.toHaveBeenCalled();
    expect(updateCheckMock).not.toHaveBeenCalled();
    expect(createCommentMock).toHaveBeenCalled();
  });

  it("updates an existing bot comment instead of creating a new one", async () => {
    vi.mocked(parseConventionalCommits).mockReturnValue(validCommit);
    const { mockCtx, listCommentsMock, createCommentMock, updateCommentMock } =
      createMockContext("feat: thing", []);
    listCommentsMock.mockResolvedValue({
      data: [
        {
          id: 999,
          user: { type: "Bot" },
          body: "<!-- hookto-conventional-commits -->\nold summary",
        },
      ],
    });
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await conventionalCommitsHook.callback(mockCtx);

    expect(updateCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 999 }),
    );
    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("includes the comment mark in the success comment so it can be updated later", async () => {
    vi.mocked(parseConventionalCommits).mockReturnValue(validCommit);
    const { mockCtx, createCommentMock } = createMockContext("feat: thing", []);
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await conventionalCommitsHook.callback(mockCtx);

    expect(createCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("<!-- hookto-conventional-commits -->"),
      }),
    );
  });

  it("only checks the title when commitMessages is disabled", async () => {
    vi.mocked(parseConventionalCommits).mockImplementation((msg: string) =>
      msg !== "bad commit" ? validCommit : false,
    );
    const { mockCtx, createCommentMock } = createMockContext(
      "feat: fine title",
      [{ message: "bad commit", sha: "abc1234" }],
    );
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({ commitMessages: false }),
    );

    await conventionalCommitsHook.callback(mockCtx);

    expect(createCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining(
          "All commits and the PR title adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification. Good to go!",
        ),
      }),
    );
  });
});
