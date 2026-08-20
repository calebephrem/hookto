# AGENTS.md

This file gives AI coding agents (Claude, Codex, Cursor, etc.) the context needed to work on Hookto correctly. Read this before making changes, especially before touching config, hooks, or build/deploy files, several of these decisions came from real, repeated production failures and exist for specific reasons documented below.

## What Hookto is

Hookto is a self-hostable, fork-and-deploy GitHub App. It has no shared hosted instance, every user forks the repo, deploys their own copy, and creates their own GitHub App to power it. Its own name and branding are entirely up to whoever deploys it.

The app is built from small, independent, toggleable units called **hooks** (event-reactive) and **commands** (comment-triggered, e.g. `!ping`). Each one does exactly one job and can be turned on/off per-repo, per-org, or per-account via a config file, without touching code.

## Tech stack

- **Probot** — handles GitHub webhook delivery, signature verification, and app authentication
- **Bun** — package manager and local dev runtime. Note: **Bun is only used for local dev and building.** Production (both Vercel and self-hosted) runs the _compiled_ output under plain **Node.js** via the `probot run` CLI, which has a Node shebang and always executes under Node regardless of what invoked it (`bunx`, `npx`, etc.)
- **TypeScript** — the whole codebase. Compiled to plain JS via `tsup` before running, see "Build pipeline" below for why this is required (it wasn't always)
- **Zod** — validates all user-supplied config (`.hookto.yml`), so malformed config degrades gracefully to defaults instead of crashing
- **Upstash Redis** _(optional)_ — caches resolved config across requests. The app runs fine without it, Redis is a performance optimization, not a dependency

## Repository structure

```
src/
  app/
    hooks/<hookName>/                         one folder per hook
      <event>.ts                              hook logic, one file per listened event
      schema.ts                               zod schema for this hook's config (required)
    commands/<commandName>/<subcommand>       same shape as hooks, comment-triggered instead
  lib/                                        shared runtime logic (config loading, caching, event registration)
  schemas/                                    top-level config schema, composes every hook/command schema
  utils/                                      small reusable helpers (deepMerge, withTimeout, link parsing, etc.)
  constants/                                  shared constant values
  index.ts                                    registers every handler from the `app` directory
api/github
  webhooks.ts                                 Vercel serverless entrypoint (webhook route: /api/github/webhooks)
```

## How a hook/command is defined

Every hook and command file has the same shape, defined via `defineHook`:

```typescript
export default defineHook({
  events: ["pull_request.opened"], // GitHub webhook event.action names
  callback: async ({ ctx, config }) => {
    if (!config.hooks.myHook.enabled) return;
    // ... actual logic
  },
});
```

**Hooks and commands are registered identically.** The only difference between the two is which folder they live in, `commands` are just hooks that happen to listen for `issue_comment.created` and parse a `!command` prefix out of the body. There is no separate command-dispatch system.

## Config resolution

Config lives in a file named `.github/hookto.yml`, never `.yaml`. It's entirely optional, everything has a schema default.

### Three-tier resolution, in override order

1. **Schema defaults** (hardcoded in each hook's `schema.ts`, via Zod `.default()`)
2. **Org/account-wide config**, read from a special repo named `.github` under the same owner (e.g. `hookto-org/.github/.github/hookto.yml`, yes the path has `.github` twice, that's correct, see `README.md`). This lets someone managing hundreds of repos set defaults once instead of per-repo.
3. **Per-repo config**, from the actual repo being acted on

Each tier only needs to specify what it's overriding, everything else falls through to the tier below.

### Why raw YAML is merged before validation, not after

This matters and is easy to get wrong: `getConfig` fetches **raw, unvalidated** YAML from both the owner-level and repo-level sources, deep-merges those two raw objects (repo wins on conflicts), and only _then_ runs the combined result through Zod validation once.

If you instead validated each tier separately first (filling in schema defaults for anything unset) and merged the two _already-resolved_ objects, a repo that didn't override a field would still carry the _schema_ default in its resolved object, and that schema default would incorrectly steamroll the owner's real customization during the merge. Raw-merge-then-validate is the only order that produces correct layering.

### Caching

Two cache tiers, both optional, both fail open (a cache failure never breaks the app, it just falls through to a real fetch):

1. **In-memory `Map`** — fastest, but only lives as long as the process (irrelevant across separate Vercel invocations, useful within one warm instance or on a long-running self-hosted server)
2. **Upstash Redis** _(optional)_ — survives across invocations, with every call wrapped in a short timeout race so a slow/down Redis never blocks the response

Cache entries are invalidated automatically by a hook that watches `push` events for changes to `.github/hookto.yml` on the default branch (`app/hooks/config-sync`). If the pushed repo is the special `.github` repo, the _entire_ cache is cleared (since org-wide config affects every repo under that owner), not just that one repo's entry.

## Build pipeline (read this before touching build config)

**This project used to run TypeScript directly via Bun, with no compile step, using `@/` path aliases for imports.** That approach was abandoned after a full day of debugging deployment failures on Vercel. It's documented here so nobody re-introduces it by accident.

### `dotenv` must stay external in the tsup config

`tsup.config.ts` has `external: ["dotenv"]`. Without this, `dotenv` (a CommonJS package) gets bundled directly into the compiled ESM output, wrapped in a `require()` shim that plain Node's ESM loader cannot execute (`Dynamic require of "fs" is not supported`). This has broken the build twice already from an innocuous-looking `package.json` dependency reclassification. If a new CommonJS runtime dependency is added later and causes the same error, add it to `external` too rather than debugging the symptom again.

### `dts` and `sourcemap` are both disabled

`dts: true` caused an out-of-memory crash (`ERR_WORKER_OUT_OF_MEMORY`) generating type declarations across dozens of entry points, unnecessary anyway since this is a deployed app, not a published library. `sourcemap` was disabled because Vercel's function bundler appeared to use sourcemap comments while tracing files, resolving paths back to `src/` instead of the actual `dist/` output location.

## Deployment

### Vercel

- Entrypoint: `api/github/webhooks`, using `createNodeMiddleware` from Probot, importing the compiled app from `../../src/index.js`
- `vercel.json` sets `"outputDirectory": "dist"` (this project has no static frontend at all; without this, Vercel's static-output check fails looking for a `public/` folder that will never exist)
- Route `/api/github/webhooks`, file-based routing, means the URL always mirrors the file path under `api/`
- **The GitHub App's Webhook URL setting must match the actual deployed route exactly.** A stale URL pointing at an old route surfaces as GitHub reporting a delivery "timed out", which is a misleading error for what's actually a routing mismatch, worth checking first if webhooks aren't arriving at all

### Self-hosted

Runs via `bun run start`, which builds then runs `probot run ./dist/index.js`. Recommended webhook tunnel for self-hosted is ngrok, smee.io is explicitly for local development only.

## Adding or modifying a hook

See `CONTRIBUTING.md` for the full walkthrough. The short version: one folder per hook under `src/app/hooks/`, a `schema.ts` with Zod defaults on every field, register the schema in `src/schemas/hooks.ts` (or equivalent composing file), document it in `HOOKS.md` (following the existing documentation pattern). No other file needs to change, the build's codegen step picks up new handlers automatically.

## Conventions

- Relative imports only
- camelCase for all config field names
- Every hook/command wraps its actual logic such that a thrown error doesn't crash the whole app, the central loader in `src/index.ts` already wraps every handler's execution in try/catch, individual hooks don't need to duplicate this, but should still handle _expected_ failure states (missing permissions, already-deleted resources) explicitly rather than letting them surface as generic errors
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
- No emojis in documentation files or commit messages
