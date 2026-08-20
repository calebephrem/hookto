# Hooks

This file documents every hook available in Hookto.

## What is a hook?

A small, self-contained feature that reacts to something happening on GitHub (a PR opened, an issue closed, etc). Each hook can be turned on or off independently, no code required.

## Where to configure hooks

Add a `.github/hookto.yml` (not `.yaml`) file to your repo, or to a `.github` repo under your org/account for org-wide defaults.

> [!NOTE]
> Config is optional. If you skip it, every hook just uses its defaults. You only need to write the settings you want to change.

```yaml
hooks:
  <hook-name>:
    enabled: true
    # ...other settings for the hook
```

## Available hooks

| Hook                                          | Description                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`acknowledge`](#acknowledge)                 | Comments a friendly message when a PR or issue is opened or closed                                  |
| [`unfurl`](#unfurl)                           | Unfurls links posted in comments into a rich preview card                                           |
| [`deleteMergedBranch`](#deletemergedbranch)   | Automatically deletes the head branch of a pull request once merged                                 |
| [`conventionalCommits`](#conventionalcommits) | Validates PR titles and commit messages against Conventional Commits specs and posts a status check |
| [`wip`](#wip)                                 | Blocks pull requests from being merged if they contain "WIP" in their title                         |
| [`dco`](#dco)                                 | Enforces the Developer Certificate of Origin (`Signed-off-by`) on every commit of a pull request    |
| [`label`](#label)                             | Automatically applies labels to pull requests and issues based on keywords or file paths            |
| [`assign`](#assign)                           | Automatically assigns reviewers and assignees to pull requests based on file path pattern matching  |

## `acknowledge`

Comments on pull requests and issues when they're opened or closed.

**Listens to:** `pull_request.opened`, `pull_request.closed`, `issues.opened`, `issues.closed`

### Config

| Setting              | Type      | Default                                                             | Description                                                |
| -------------------- | --------- | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| `enabled`            | `boolean` | `true`                                                              | Enables the acknowledge hook                               |
| `prOpen.enabled`     | `boolean` | `true`                                                              | Enables automatic commenting when a pull request is opened |
| `prOpen.message`     | `string`  | `"Thanks for opening this PR! A maintainer will take a look soon."` | Comment body posted on opened pull requests                |
| `prClose.enabled`    | `boolean` | `true`                                                              | Enables automatic commenting when a pull request is closed |
| `prClose.message`    | `string`  | `"Thanks for your contribution!"`                                   | Comment body posted on closed pull requests                |
| `issueOpen.enabled`  | `boolean` | `true`                                                              | Enables automatic commenting when an issue is opened       |
| `issueOpen.message`  | `string`  | `"Thanks for opening this issue!"`                                  | Comment body posted on opened issues                       |
| `issueClose.enabled` | `boolean` | `true`                                                              | Enables automatic commenting when an issue is closed       |
| `issueClose.message` | `string`  | `"Thanks for reporting!"`                                           | Comment body posted on closed issues                       |

## `unfurl`

Scans PR bodies, issue bodies, and comments for links, and edits them in place to add a rich preview card underneath, similar to how Slack or Discord unfurl links.

**Listens to:** `issue_comment.created`, `pull_request.opened`, `issues.opened`

### Config

| Setting                | Type      | Default | Description                                                 |
| ---------------------- | --------- | ------- | ----------------------------------------------------------- |
| `enabled`              | `boolean` | `false` | Enables link unfurling                                      |
| `issueComment.enabled` | `boolean` | `true`  | Unfurls links found in issue and pull request comments      |
| `prOpen.enabled`       | `boolean` | `true`  | Unfurls links found in the initial pull request description |
| `issueOpen.enabled`    | `boolean` | `true`  | Unfurls links found in the initial issue description        |

## `deleteMergedBranch`

Automatically deletes the head branch of a pull request once it has been successfully merged into the default branch.

**Listens to:** `pull_request.closed`

### Config

| Setting   | Type       | Default | Description                                            |
| --------- | ---------- | ------- | ------------------------------------------------------ |
| `enabled` | `boolean`  | `false` | Enables automatic deletion after a pull request merges |
| `exclude` | `string[]` | `[]`    | Exact branch names that should never be deleted        |

## `conventionalCommits`

Validates PR titles and commit messages to ensure they follow the [Conventional Commits](https://www.conventionalcommits.org/) standard (`type(scope): description`) and creates a GitHub Check run to report findings.

**Listens to:** `pull_request.opened`, `pull_request.reopened`, `pull_request.synchronize`

### Config

| Setting          | Type      | Default | Description                                                              |
| ---------------- | --------- | ------- | ------------------------------------------------------------------------ |
| `enabled`        | `boolean` | `false` | Enables Conventional Commits validation                                  |
| `fail`           | `boolean` | `true`  | Creates a failing check run if non-compliant commits or titles are found |
| `title`          | `boolean` | `true`  | Validates the pull request title against Conventional Commits format     |
| `commitMessages` | `boolean` | `true`  | Validates individual commit messages against Conventional Commits format |

## `wip`

Validates pull request titles and creates a GitHub Check run named `WIP`. If the title contains "WIP" (case-insensitive), the check completes with conclusion `failure` to block merging when configured as a required status check in branch protection. Once "WIP" is removed from the title, the check completes with conclusion `success`.

**Listens to:** `pull_request.opened`, `pull_request.reopened`, `pull_request.edited`, `pull_request.synchronize`

### Config

| Setting   | Type      | Default | Description                                  |
| --------- | --------- | ------- | -------------------------------------------- |
| `enabled` | `boolean` | `true`  | Enables WIP title checking and status checks |

## `dco`

Enforces the [Developer Certificate of Origin](https://developercertificate.org/) on pull requests. Scans every commit message for a `Signed-off-by: Name <email>` trailer, comments on the PR listing the commits that are missing one (updating the same comment on later pushes), and creates a `Developer Certificate of Origin` check run that fails when `fail` is enabled. Merge commits are skipped, since GitHub creates them without a sign-off.

**Listens to:** `pull_request.opened`, `pull_request.reopened`, `pull_request.synchronize`

### Config

| Setting   | Type      | Default | Description                                            |
| --------- | --------- | ------- | ------------------------------------------------------ |
| `enabled` | `boolean` | `false` | Enables the DCO validation                             |
| `fail`    | `boolean` | `true`  | Creates a failing check run when a sign-off is missing |

## `assign`

Automatically assigns reviewers and assignees to pull requests based on file path pattern matching rules. Supports individual user handles (`@user`) and GitHub team slugs (`team-slug`).

**Listens to:** `pull_request.opened`, `pull_request.reopened`, `pull_request.synchronize`

### Config

| Setting             | Type       | Default | Description                                                  |
| ------------------- | ---------- | ------- | ------------------------------------------------------------ |
| `enabled`           | `boolean`  | `false` | Enables automatic reviewer and assignee matching             |
| `rules[].paths`     | `string[]` | `["*"]` | File path patterns (globs) that trigger this assignment rule |
| `rules[].reviewers` | `string[]` | `[]`    | User handles or team slugs to add as requested reviewers     |
| `rules[].assignees` | `string[]` | `[]`    | User handles to set as issue/PR assignees                    |

## `label`

Automatically applies labels to pull requests and issues based on keyword occurrences in titles and bodies, or matching file path rules for pull requests.

**Listens to:** `pull_request.opened`, `pull_request.reopened`, `pull_request.synchronize`, `issues.opened`, `issues.reopened`

### Config

| Setting                              | Type       | Default | Description                                            |
| ------------------------------------ | ---------- | ------- | ------------------------------------------------------ |
| `enabled`                            | `boolean`  | `false` | Enables the label hook globally                        |
| `prOpen.enabled`                     | `boolean`  | `true`  | Enables labeling when a pull request is opened/updated |
| `prOpen.rules[].keywords[].keywords` | `string[]` | `[]`    | Keywords to search for in title or body                |
| `prOpen.rules[].keywords[].labels`   | `string[]` | `[]`    | Labels to apply when keywords match                    |
| `prOpen.rules[].keywords[].title`    | `boolean`  | `true`  | Search for keywords in the PR title                    |
| `prOpen.rules[].keywords[].body`     | `boolean`  | `true`  | Search for keywords in the PR body                     |
| `prOpen.rules[].paths[].paths`       | `string[]` | `[]`    | File path patterns to evaluate                         |
| `prOpen.rules[].paths[].labels`      | `string[]` | `[]`    | Labels to apply when paths match                       |
| `issueOpen.enabled`                  | `boolean`  | `true`  | Enables labeling when an issue is opened               |
| `issueOpen.rules[].keywords`         | `string[]` | `[]`    | Keywords to search for in title or body                |
| `issueOpen.rules[].labels`           | `string[]` | `[]`    | Labels to apply when keywords match                    |
| `issueOpen.rules[].title`            | `boolean`  | `true`  | Search for keywords in the issue title                 |
| `issueOpen.rules[].body`             | `boolean`  | `true`  | Search for keywords in the issue body                  |
