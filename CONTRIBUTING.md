# Contributing to Hookto

Thanks for wanting to help out! This guide walks you through setting up the project locally, and either adding a new hook or updating an existing one, even if you've never contributed to an open source project before.

> [!TIP]
> Beyond opening PRs, giving the repo a ⭐ and following along is one of the best ways to contribute and keep this project growing!

## Before you start

You'll need:

- [Bun](https://bun.sh/) installed on your machine
- A GitHub account
- A little patience while you get your test GitHub App set up (this is a one-time thing)

> [!NOTE]
> We recommend using Bun for development, since that's what this project currently uses, and it's a fast runtime with TypeScript support built in. This guide sticks with Bun, but you're free to use any package manager you're comfortable with.

## Setting up your local environment

### 1. Clone the repo

```bash
git clone https://github.com/hookto/hookto.git
cd hookto
bun install
```

### 2. Create a test GitHub App

Since Hookto works by connecting to GitHub as an "app," you'll need your own test app to develop against. This keeps your testing separate from the real production Hookto.

1. Go to [github.com/settings/apps/new](https://github.com/settings/apps/new)
2. Give it any name you like (e.g. "hookto-dev-yourname")
3. Under **Webhook**, use a [smee.io](https://smee.io/) URL as a temporary webhook address (this lets GitHub send events to your local machine while you're developing)
4. Give it permissions for whatever you're working on (Issues, Pull requests, Contents are common ones)
5. Subscribe to the events you need (Issues, Pull request, Push, etc.)
6. Generate a private key and download the `.pem` file
7. Install the app on a test repository (a throwaway repo you don't mind experimenting on works great)

### 3. Set up your environment variables

Create a `.env` file in the project root:

```
WEBHOOK_PROXY_URL= # your smee.io link here

WEBHOOK_SECRET= # your github app webhook secret here

APP_ID= # your github app id here

# private key (replace the content inside the quotes with yours)
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
"

# redis cache for config caching (optional)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

> [!NOTE]
> Redis is optional for local development, but you can add it if you want to test the caching layer too.

### 4. Run it

```bash
bun run dev
```

If everything is set up right, you'll see your hooks get registered in the terminal, and a smee connection get established. Try triggering an event (open a PR, comment on an issue) on your test repo and watch the logs.

## How the project is organized

```
src/
  app/
    hooks/          <- one folder per hook (things that react to GitHub events)
      acknowledge/
        prOpen.ts   <- the hook's logic, split by event if needed
        prClose.ts
        issueOpen.ts
        issueClose.ts
        schema.ts   <- what settings this hook accepts, and their defaults
    commands/       <- same idea as hooks, but triggered by a comment like "!command"
    system/         <- same as the two above, but includes automatic updates like clearing cache
  lib/            <- shared code used across the app (config loading, caching, etc.)
  constants/      <- constant values used across files
  schemas/        <- top-level config schema (composes every hook's schema together)
  types/          <- shared TypeScript types
  utils/          <- utility functions
tests/            <- test files
```

Hooks and commands work exactly the same way under the hood. The only difference is which folder they live in and how they're defined.

## Adding a new hook

Let's say you want to build a hook that adds a "needs-triage" label to every new issue. Here's the process:

### 1. Create a folder for your hook

```
src/app/hooks/needs-triage/
  needs-triage.ts  <- naming this file "needs-triage.ts" isn't required. You can split
                       logic across multiple files if your hook listens to several
                       unrelated events.
  schema.ts        <- required, this is your hook's config schema
src/tests/app/hooks/
  needs-triage.test.ts <- test file for the new hook
```

### 2. Write its config schema

This defines what settings your hook accepts, and what happens if someone doesn't set them.

```typescript
// src/app/hooks/needs-triage/schema.ts
import { z } from "zod";

export const needsTriageSchema = z.object({
  enabled: z.boolean().default(true),
  label: z.string().min(1).default("needs-triage"),
});

export type NeedsTriageConfig = z.infer<typeof needsTriageSchema>;
```

### 3. Write the hook itself

```typescript
// src/app/hooks/needs-triage/needs-triage.ts
import { defineHook } from "@/lib/eventHandler.js";
import { getConfig } from "@/lib/getConfig.js";

export default defineHook({
  events: ["issues.opened"],
  async callback(ctx) {
    const config = await getConfig(ctx);
    const { enabled, label } = config.hooks.needsTriage;

    if (!enabled) return;

    await ctx.octokit.rest.issues.addLabels(ctx.issue({ labels: [label] }));
  },
});
```

### 4. Register your hook's schema

Open `src/schemas/config.ts` and add one line so your hook's settings show up in `.github/hookto.yml`:

```typescript
export const hooksSchema = z.object({
  acknowledge: acknowledgeSchema.default(acknowledgeSchema.parse({})),
  // ...
  needsTriage: needsTriageSchema.default(needsTriageSchema.parse({})), // add the schema you just created
});
```

That's it. Your hook now shows up automatically, gets validated automatically, and can be turned on or off from `.github/hookto.yml` without touching any other file.

> [!NOTE]
> Make sure to update [app.yml](./app.yml) if there's new permissions your hook requires.

### 5. Add it to the hooks list

Add a short entry to [`HOOKS.md`](./HOOKS.md) so other people know your hook exists.

## Updating an existing hook

Not every change is a brand new hook. Maybe you want to fix a bug in `acknowledge`, tweak its default message, or add a new option to an existing hook. Here's how to approach that.

### If you're just fixing behavior (no config changes)

Find the hook's folder under `src/hooks/`, make your change, and test it against a real (test) repo. No need to touch the schema or `HOOKS.md` unless the hook's documented behavior actually changes.

### If you're adding a new config option to an existing hook

1. Add the new field to that hook's `schema.ts`, with a sensible `.default(...)` value. This matters more than it might seem: people already have `.github/hookto.yml` files out there that don't know about your new field, and a missing default means their config would fail to validate.
2. Use the new field in the hook's logic.
3. Update the hook's entry in [`HOOKS.md`](./HOOKS.md) to mention the new option.

### If you're removing or renaming a config field

This is the one case where you need to slow down a little. Someone out there might already have `.github/hookto.yml` with the old field name in it. If you rename or remove a field:

- Consider keeping the old field name working for a while too (reading either the old or new name), rather than breaking it outright
- If a clean break is unavoidable, mention it clearly in your pull request description so it can be called out as a breaking change
- Update `HOOKS.md` to reflect the new shape

When in doubt, ask in your pull request rather than guessing. Breaking someone's config silently is worse than asking a question first.

## A few ground rules for hook code

- **Always check `enabled` before doing anything.** Even if the hook fires, respect the user's config.
- **Never assume the config is valid without checking.** The schema handles this for you as long as you define one.
- **Keep each hook focused on one job.** If you find yourself wanting to do three unrelated things in one hook, that's usually a sign you actually want three hooks.
- **Don't throw uncaught errors.** The loader wraps every hook in a try/catch so one bug doesn't take down the whole app, but it's still good practice to handle expected failure cases yourself (like a missing permission) rather than letting them bubble up as unhandled errors.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/). In short:

- `feat: add needs-triage hook`
- `fix: prevent crash when config is malformed`
- `docs: update README with new hook`

This isn't strictly enforced for small projects, but it makes the commit history much easier to read, so please try to follow it.

## Opening a pull request

1. Fork the repo and create a new branch for your change
2. Make your changes and test them locally against a real (test) repo
3. Open a pull request with a short description of what you changed and why, and whether it includes any config changes
4. Be patient. This is a small project maintained in spare time, so reviews might take a bit.
