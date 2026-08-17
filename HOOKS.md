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

## `acknowledge`

Comments on pull requests and issues when they're opened or closed.

**Listens to:** `pull_request.opened`, `pull_request.closed`, `issues.opened`, `issues.closed`

### Config

| Setting              | Type      | Default                                                             |
| -------------------- | --------- | ------------------------------------------------------------------- |
| `enabled`            | `boolean` | `true`                                                              |
| `prOpen.enabled`     | `boolean` | `true`                                                              |
| `prOpen.message`     | `string`  | `"Thanks for opening this PR! A maintainer will take a look soon."` |
| `prClose.enabled`    | `boolean` | `true`                                                              |
| `prClose.message`    | `string`  | `"Thanks for your contribution!"`                                   |
| `issueOpen.enabled`  | `boolean` | `true`                                                              |
| `issueOpen.message`  | `string`  | `"Thanks for opening this issue!"`                                  |
| `issueClose.enabled` | `boolean` | `true`                                                              |
| `issueClose.message` | `string`  | `"Thanks for reporting!"`                                           |

## `unfurl`

Scans PR bodies, issue bodies, and comments for links, and edits them in place to add a rich preview card underneath, similar to how Slack or Discord unfurl links.

**Listens to:** `issue_comment.created`, `pull_request.opened`, `issues.opened`

### Config

| Setting                | Type      | Default |
| ---------------------- | --------- | ------- |
| `enabled`              | `boolean` | `false` |
| `issueComment.enabled` | `boolean` | `true`  |
| `prOpen.enabled`       | `boolean` | `true`  |
| `issueOpen.enabled`    | `boolean` | `true`  |

## `deleteMergedBranch`

Automatically deletes the head branch of a pull request once it has been successfully merged into the default branch.

**Listens to:** `pull_request.closed`

### Config

| Setting   | Type      | Default |
| --------- | --------- | ------- |
| `enabled` | `boolean` | `false` |

## `conventionalCommits`

Validates PR titles and commit messages to ensure they follow the [Conventional Commits](https://www.conventionalcommits.org/) standard (`type(scope): description`) and creates a GitHub Check run to report findings.

**Listens to:** `pull_request.opened`, `pull_request.reopened`, `pull_request.synchronize`

### Config

| Setting          | Type      | Default |
| ---------------- | --------- | ------- |
| `enabled`        | `boolean` | `false` |
| `fail`           | `boolean` | `true`  |
| `title`          | `boolean` | `true`  |
| `commitMessages` | `boolean` | `true`  |
