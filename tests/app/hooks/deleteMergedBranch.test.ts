import type { Context } from "probot";
import { describe, expect, it, vi } from "vitest";
import deleteMergedBranchHook from "../../../src/app/hooks/deleteMergedBranch/index.js";
import * as configModule from "../../../src/lib/getConfig.js";
import { defaultConfig, type Config } from "../../../src/schemas/config.js";

function createMockContext(overrides: {
  merged: boolean;
  headRef?: string;
  defaultBranch?: string;
  headRepoId?: number;
  baseRepoId?: number;
  deleteRefImpl?: () => Promise<unknown>;
}) {
  const {
    merged,
    headRef = "feature-branch",
    defaultBranch = "main",
    headRepoId = 1,
    baseRepoId = 1,
    deleteRefImpl = vi.fn().mockResolvedValue({}),
  } = overrides;

  const deleteRefMock = vi.fn(deleteRefImpl);

  const mockCtx = {
    payload: {
      pull_request: {
        merged,
        head: {
          ref: headRef,
          repo: {
            id: headRepoId,
            name: "testrepo",
            owner: { login: "testowner" },
          },
        },
        base: {
          repo: {
            id: baseRepoId,
            name: "testrepo",
            default_branch: defaultBranch,
          },
        },
      },
    },
    octokit: {
      rest: {
        git: {
          deleteRef: deleteRefMock,
        },
      },
    },
  } as unknown as Context<"pull_request.closed">;

  return { mockCtx, deleteRefMock };
}

function withEnabled(enabled: boolean): Config {
  return {
    ...defaultConfig,
    hooks: {
      ...defaultConfig.hooks,
      deleteMergedBranch: { enabled },
    },
  };
}

describe("deleteMergedBranch hook", () => {
  it("registers pull_request.closed", () => {
    expect(deleteMergedBranchHook.events).toEqual(["pull_request.closed"]);
  });

  it("does nothing when the hook is disabled", async () => {
    const { mockCtx, deleteRefMock } = createMockContext({ merged: true });
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withEnabled(false));

    await deleteMergedBranchHook.callback(mockCtx);

    expect(deleteRefMock).not.toHaveBeenCalled();
  });

  it("does nothing when the PR was closed without merging", async () => {
    const { mockCtx, deleteRefMock } = createMockContext({ merged: false });
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withEnabled(true));

    await deleteMergedBranchHook.callback(mockCtx);

    expect(deleteRefMock).not.toHaveBeenCalled();
  });

  it("does nothing when the branch is the repo's default branch", async () => {
    const { mockCtx, deleteRefMock } = createMockContext({
      merged: true,
      headRef: "main",
      defaultBranch: "main",
    });
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withEnabled(true));

    await deleteMergedBranchHook.callback(mockCtx);

    expect(deleteRefMock).not.toHaveBeenCalled();
  });

  it("does nothing when the PR came from a fork", async () => {
    const { mockCtx, deleteRefMock } = createMockContext({
      merged: true,
      headRepoId: 1,
      baseRepoId: 2,
    });
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withEnabled(true));

    await deleteMergedBranchHook.callback(mockCtx);

    expect(deleteRefMock).not.toHaveBeenCalled();
  });

  it("deletes the branch when merged, non-default, and same-repo", async () => {
    const { mockCtx, deleteRefMock } = createMockContext({
      merged: true,
      headRef: "feature-x",
    });
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withEnabled(true));

    await deleteMergedBranchHook.callback(mockCtx);

    expect(deleteRefMock).toHaveBeenCalledWith({
      owner: "testowner",
      repo: "testrepo",
      ref: "heads/feature-x",
    });
  });

  it("silently ignores a 404 (branch already gone)", async () => {
    const notFoundError = Object.assign(new Error("Not Found"), {
      status: 404,
    });
    const { mockCtx, deleteRefMock } = createMockContext({
      merged: true,
      deleteRefImpl: () => Promise.reject(notFoundError),
    });
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withEnabled(true));

    await expect(
      deleteMergedBranchHook.callback(mockCtx),
    ).resolves.not.toThrow();
    expect(deleteRefMock).toHaveBeenCalledTimes(1);
  });

  it("silently ignores a 422 (branch already gone)", async () => {
    const unprocessableError = Object.assign(new Error("Unprocessable"), {
      status: 422,
    });
    const { mockCtx } = createMockContext({
      merged: true,
      deleteRefImpl: () => Promise.reject(unprocessableError),
    });
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withEnabled(true));

    await expect(
      deleteMergedBranchHook.callback(mockCtx),
    ).resolves.not.toThrow();
  });

  it("rethrows an unexpected error (e.g. permissions)", async () => {
    const permissionError = Object.assign(new Error("Forbidden"), {
      status: 403,
    });
    const { mockCtx } = createMockContext({
      merged: true,
      deleteRefImpl: () => Promise.reject(permissionError),
    });
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withEnabled(true));

    await expect(deleteMergedBranchHook.callback(mockCtx)).rejects.toThrow(
      "Forbidden",
    );
  });
});
