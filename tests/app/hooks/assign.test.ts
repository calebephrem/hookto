import type { Context } from "probot";
import { beforeEach, describe, expect, it, vi } from "vitest";
import assignHook from "../../../src/app/hooks/assign/index.js";
import * as configModule from "../../../src/lib/getConfig.js";
import { defaultConfig, type Config } from "../../../src/schemas/config.js";

function createMockContext(files: string[], prAuthor = "author-user") {
  const addAssigneesMock = vi.fn().mockResolvedValue({ data: {} });
  const requestReviewersMock = vi.fn().mockResolvedValue({ data: {} });
  const paginateMock = vi
    .fn()
    .mockResolvedValue(files.map((filename) => ({ filename })));

  const mockCtx = {
    payload: {
      pull_request: {
        number: 1,
        user: { login: prAuthor },
      },
    },
    repo: (extra: Record<string, unknown> = {}) => ({
      owner: "testowner",
      repo: "testrepo",
      ...extra,
    }),
    issue: (extra: Record<string, unknown> = {}) => ({
      owner: "testowner",
      repo: "testrepo",
      issue_number: 1,
      ...extra,
    }),
    pullRequest: (extra: Record<string, unknown> = {}) => ({
      owner: "testowner",
      repo: "testrepo",
      pull_number: 1,
      ...extra,
    }),
    octokit: {
      paginate: paginateMock,
      rest: {
        pulls: {
          listFiles: vi.fn(),
          requestReviewers: requestReviewersMock,
        },
        issues: {
          addAssignees: addAssigneesMock,
        },
      },
    },
  } as unknown as Context<"pull_request.opened">;

  return {
    mockCtx,
    paginateMock,
    addAssigneesMock,
    requestReviewersMock,
  };
}

function withConfig(overrides: Partial<Config["hooks"]["assign"]>): Config {
  return {
    ...defaultConfig,
    hooks: {
      ...defaultConfig.hooks,
      assign: {
        enabled: true,
        rules: [],
        ...overrides,
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assign hook", () => {
  it("registers pull_request opened, reopened, and synchronize", () => {
    expect(assignHook.events).toEqual([
      "pull_request.opened",
      "pull_request.synchronize",
      "pull_request.reopened",
    ]);
  });

  it("does nothing when disabled", async () => {
    const { mockCtx, addAssigneesMock, requestReviewersMock } =
      createMockContext(["src/index.ts"]);
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({ enabled: false }),
    );

    await assignHook.callback(mockCtx);

    expect(addAssigneesMock).not.toHaveBeenCalled();
    expect(requestReviewersMock).not.toHaveBeenCalled();
  });

  it("assigns users and requests user/team reviewers when file paths match", async () => {
    const { mockCtx, addAssigneesMock, requestReviewersMock } =
      createMockContext(["src/components/Button.tsx"]);

    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({
        rules: [
          {
            paths: ["src/**/*.tsx"],
            assignees: ["@frontend-dev"],
            reviewers: ["@reviewer-one", "frontend-team"],
          },
        ],
      }),
    );

    await assignHook.callback(mockCtx);

    expect(addAssigneesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assignees: ["frontend-dev"],
      }),
    );
    expect(requestReviewersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewers: ["reviewer-one"],
        team_reviewers: ["frontend-team"],
      }),
    );
  });

  it("does not match when modified files fall outside specified path patterns", async () => {
    const { mockCtx, addAssigneesMock, requestReviewersMock } =
      createMockContext(["docs/readme.md"]);

    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({
        rules: [
          {
            paths: ["src/**/*.ts"],
            assignees: ["@backend-dev"],
            reviewers: ["@reviewer-one"],
          },
        ],
      }),
    );

    await assignHook.callback(mockCtx);

    expect(addAssigneesMock).not.toHaveBeenCalled();
    expect(requestReviewersMock).not.toHaveBeenCalled();
  });

  it("filters out the PR author from assignees and user reviewers", async () => {
    const { mockCtx, addAssigneesMock, requestReviewersMock } =
      createMockContext(["src/index.ts"], "calebephrem");

    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({
        rules: [
          {
            paths: ["**/*"],
            assignees: ["@calebephrem", "@other-user"],
            reviewers: ["@calebephrem", "dev-team"],
          },
        ],
      }),
    );

    await assignHook.callback(mockCtx);

    expect(addAssigneesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assignees: ["other-user"],
      }),
    );
    expect(requestReviewersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewers: [],
        team_reviewers: ["dev-team"],
      }),
    );
  });

  it("aggregates multiple matching rules without duplicates", async () => {
    const { mockCtx, addAssigneesMock, requestReviewersMock } =
      createMockContext(["src/index.ts", "package.json"]);

    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({
        rules: [
          {
            paths: ["src/**"],
            assignees: ["@lead-dev"],
            reviewers: ["@reviewer-a"],
          },
          {
            paths: ["package.json"],
            assignees: ["@lead-dev", "@ops-dev"],
            reviewers: ["@reviewer-a", "core-team"],
          },
        ],
      }),
    );

    await assignHook.callback(mockCtx);

    expect(addAssigneesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assignees: expect.arrayContaining(["lead-dev", "ops-dev"]),
      }),
    );
    expect(requestReviewersMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewers: ["reviewer-a"],
        team_reviewers: ["core-team"],
      }),
    );
  });
});
