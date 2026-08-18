import type { Context } from "probot";
import { describe, expect, it, vi } from "vitest";
import pasteCIHook from "../../../src/app/hooks/pasteCI/index.js";
import * as configModule from "../../../src/lib/getConfig.js";
import { defaultConfig, type Config } from "../../../src/schemas/config.js";

function createMockContext({
  conclusion = "failure",
  pullRequests = [{ number: 1 }],
  jobs = [] as {
    id: number;
    name: string;
    conclusion: string;
    html_url: string;
  }[],
  log = "",
  existingComments = [] as {
    id: number;
    user: { type: string };
    body: string;
  }[],
} = {}) {
  const listJobsMock = vi.fn().mockResolvedValue({ data: { jobs } });
  const downloadLogsMock = vi.fn().mockResolvedValue({ data: log });
  const listCommentsMock = vi
    .fn()
    .mockResolvedValue({ data: existingComments });
  const createCommentMock = vi.fn().mockResolvedValue({ data: { id: 1 } });
  const updateCommentMock = vi.fn().mockResolvedValue({});

  const mockCtx = {
    payload: {
      workflow_run: {
        id: 777,
        name: "CI",
        html_url: "https://github.com/testowner/testrepo/actions/runs/777",
        conclusion,
        pull_requests: pullRequests,
      },
    },
    repo: () => ({ owner: "testowner", repo: "testrepo" }),
    octokit: {
      rest: {
        actions: {
          listJobsForWorkflowRun: listJobsMock,
          downloadJobLogsForWorkflowRun: downloadLogsMock,
        },
        issues: {
          listComments: listCommentsMock,
          createComment: createCommentMock,
          updateComment: updateCommentMock,
        },
      },
    },
  } as unknown as Context<"workflow_run.completed">;

  return {
    mockCtx,
    listJobsMock,
    downloadLogsMock,
    listCommentsMock,
    createCommentMock,
    updateCommentMock,
  };
}

function withConfig(overrides: Partial<Config["hooks"]["pasteCI"]>): Config {
  return {
    ...defaultConfig,
    hooks: {
      ...defaultConfig.hooks,
      pasteCI: {
        enabled: true,
        lines: 50,
        ...overrides,
      },
    },
  };
}

const failedJob = {
  id: 10,
  name: "test",
  conclusion: "failure",
  html_url: "https://github.com/testowner/testrepo/actions/runs/777/job/10",
};

describe("pasteCI hook", () => {
  it("registers workflow_run.completed", () => {
    expect(pasteCIHook.events).toEqual(["workflow_run.completed"]);
  });

  it("does nothing when disabled", async () => {
    const { mockCtx, listJobsMock, createCommentMock } = createMockContext();
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({ enabled: false }),
    );

    await pasteCIHook.callback(mockCtx);

    expect(listJobsMock).not.toHaveBeenCalled();
    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("does nothing for runs without an attached pull request", async () => {
    const { mockCtx, createCommentMock } = createMockContext({
      pullRequests: [],
    });
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await pasteCIHook.callback(mockCtx);

    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("pastes the failing job log tail as a PR comment", async () => {
    const { mockCtx, createCommentMock, downloadLogsMock } = createMockContext({
      jobs: [failedJob],
      log: "2026-08-18T10:00:00.000Z line one\n2026-08-18T10:00:01.000Z Error: it broke\n",
    });
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await pasteCIHook.callback(mockCtx);

    expect(downloadLogsMock).toHaveBeenCalledWith(
      expect.objectContaining({ job_id: 10 }),
    );
    expect(createCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 1,
        body: expect.stringContaining("Error: it broke"),
      }),
    );
    // Log timestamps are stripped for readability
    const body = createCommentMock.mock.calls[0][0].body as string;
    expect(body).not.toContain("2026-08-18T10:00:01.000Z");
    expect(body).toContain("<!-- hookto-paste-ci -->");
  });

  it("only pastes the last configured number of lines", async () => {
    const log = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join(
      "\n",
    );
    const { mockCtx, createCommentMock } = createMockContext({
      jobs: [failedJob],
      log,
    });
    vi.spyOn(configModule, "getConfig").mockResolvedValue(
      withConfig({ lines: 10 }),
    );

    await pasteCIHook.callback(mockCtx);

    const body = createCommentMock.mock.calls[0][0].body as string;
    expect(body).toContain("line 100");
    expect(body).not.toContain("line 90\n");
  });

  it("updates the existing bot comment instead of creating a new one", async () => {
    const { mockCtx, createCommentMock, updateCommentMock } = createMockContext(
      {
        jobs: [failedJob],
        log: "boom",
        existingComments: [
          {
            id: 999,
            user: { type: "Bot" },
            body: "<!-- hookto-paste-ci -->\nold output",
          },
        ],
      },
    );
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await pasteCIHook.callback(mockCtx);

    expect(updateCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 999 }),
    );
    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("refreshes an existing comment when CI passes again, without creating one", async () => {
    const { mockCtx, createCommentMock, updateCommentMock } = createMockContext(
      {
        conclusion: "success",
        existingComments: [
          {
            id: 999,
            user: { type: "Bot" },
            body: "<!-- hookto-paste-ci -->\nold failure output",
          },
        ],
      },
    );
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await pasteCIHook.callback(mockCtx);

    expect(updateCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        comment_id: 999,
        body: expect.stringContaining("passing again"),
      }),
    );
    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("stays silent on success when no comment exists", async () => {
    const { mockCtx, createCommentMock, updateCommentMock } = createMockContext(
      { conclusion: "success" },
    );
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await pasteCIHook.callback(mockCtx);

    expect(createCommentMock).not.toHaveBeenCalled();
    expect(updateCommentMock).not.toHaveBeenCalled();
  });

  it("still lists the failed job when its logs cannot be retrieved", async () => {
    const { mockCtx, createCommentMock, downloadLogsMock } = createMockContext({
      jobs: [failedJob],
    });
    downloadLogsMock.mockRejectedValue(new Error("410 Gone"));
    vi.spyOn(configModule, "getConfig").mockResolvedValue(withConfig({}));

    await pasteCIHook.callback(mockCtx);

    expect(createCommentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("Logs could not be retrieved."),
      }),
    );
  });
});
