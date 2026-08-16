# Hooks

This file documents every hook available in Hookto.

## What is a hook?

A small, self-contained feature that reacts to something happening on GitHub (a PR opened, an issue closed, etc). Each hook can be turned on or off independently, no code required.

## Where to configure hooks

Add a `.github/hookto.yml` (not `.yaml`) file to your repo. It's optional, if you skip it, every hook just uses its defaults. You only need to write the settings you want to change.

```yaml
hooks:
  <hook-name>:
    enabled: true
    # ...other settings for the hook
```

## Available hooks

| Hook                          | Description                                                        |
| ----------------------------- | ------------------------------------------------------------------ |
| [`acknowledge`](#acknowledge) | Comments a friendly message when a PR or issue is opened or closed |

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
