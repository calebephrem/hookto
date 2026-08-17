# Hookto

> [!NOTE]
> Hookto is in early preview. Feel free to explore, test, and contribute, but expect frequent updates and changes.

Hookto is a self-hostable, all-in-one GitHub app built to automate the boring stuff in your org, account, or repo. You can install it org-wide, account-wide, or on a single repo, it fits anywhere. Since it's self-hosted, the bot's name and branding are entirely yours. All you need to do is fork and deploy.

## How it works

The whole app is made of small, toggleable, and customizable pieces called hooks. Each hook has one job (like commenting "thanks for opening this PR!" or labeling an issue based on its title), and you can turn any hook on or off without touching any code. Think of it like a big toolbox where you only pull out the tools you actually need.

Hookto is one app with many hooks. You install it once, then pick and choose which features you want, all from a single config file (or none at all, if you're happy with the defaults).

### In simple terms

- You fork and deploy Hookto (see "Getting started" below).
- In each repo, you add a file at `.github/hookto.yml` (not `.yaml`) that says which hooks you want turned on, and how you want them to behave. Config is completely optional, you can skip it entirely if you're fine with the defaults.
- If you manage many repos under one org or account, you can also set defaults once in a special `.github` repo instead of repeating yourself in every single repo. See "Org-wide and account-wide defaults" below.
- Whenever something happens on GitHub (a PR opens, an issue closes, someone comments), Hookto checks your config and runs the hooks that should respond to that event.

## Getting started

### 1. Fork this repo

### 2. Create a GitHub App

Go to [github.com/settings/apps/new](https://github.com/settings/apps/new) and create a new app. Give it any name, logo, and description you want, this is your bot now.

Set these permissions and events:

**Permissions**

- Repository permissions:
  - Contents: read and write
  - Issues: read and write
  - Pull requests: read and write
  - Metadata: read

**Events**

- Issue comment
- Issues
- Pull request
- Push

> [!NOTE]
> Permission and event settings might need to be updated as new hooks are added in future updates.

### 3. Deploy

#### Option 1: Serverless (Vercel recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Create a new project
3. Select GitHub as your provider, choose your Hookto fork, and import it
4. Set your GitHub App's webhook URL to `your-subdomain.vercel.app/api/github`

> [!NOTE]
> If you're deploying to a serverless platform other than Vercel, make sure to add `/api/github` to the end of your deployment URL.

#### Option 2: Self-hosted server

1. Pull down your fork of Hookto
2. Add your environment variables in a `.env` file (see [`.env.example`](./.env.example) for the required fields)
3. Run `bun run start` to start your Hookto instance

> [!TIP]
> On self-hosted servers, we recommend using [ngrok](https://ngrok.com) for your webhook URL. Smee.io is meant for local development only, not production use.
>
> 1. Go to [ngrok.com](https://ngrok.com) and sign in
> 2. Follow their setup guide to expose your local server
> 3. Use the ngrok URL as your GitHub App's webhook URL

## Configuration

All configuration happens in a file named `.github/hookto.yml`, placed inside a repository you want Hookto to manage. Every hook has its own section in this file, and you can enable, disable, or customize each one independently.

### Example Configuration

```yaml
# .github/hookto.yml
hooks:
  acknowledge:
    enabled: true
    prOpen:
      enabled: true
      message: "Thanks for opening this PR! A maintainer will take a look soon."
    prClose:
      enabled: true
      message: "Thanks for your contribution!"
    issueClose:
      enabled: false
  unfurl:
    enabled: true
    prOpen:
      enabled: false
```

You only need to write the parts you want to change. Anything left out falls back to the default.

For the full list of hooks and what they do, see [`HOOKS.md`](./HOOKS.md).

### Org-wide and account-wide defaults

If you manage a lot of repos under one org (or your personal account) and don't want to add `.github/hookto.yml` to every single one, you can set defaults once instead.

Create a special repo named `.github` under your org or account, and add a `.github/hookto.yml` file inside it. Every repo under that org or account will inherit those settings automatically, no per-repo config required.

```
your-org/
  .github/            <- special repo, config here applies org-wide
    .github/
      hookto.yml
  some-repo/          <- inherits the org-wide config automatically
  another-repo/       <- same here
    .github/
      hookto.yml      <- unless it sets its own overrides
```

Settings apply in this order, each one overriding the last:

1. Hookto's built-in defaults
2. Your org or account-wide `.github/hookto.yml`
3. The individual repo's own `.github/hookto.yml`, if it has one

So a repo only needs to specify what's actually different from your org-wide defaults, everything else is inherited automatically.

## Tech stack

- **[Probot](https://probot.github.io/)**, the framework that handles GitHub webhooks and app authentication
- **[Bun](https://bun.sh/)**, the JavaScript runtime, used for both development and production
- **TypeScript**, the whole app is written in it, no compiling to JavaScript needed thanks to Bun
- **[Zod](https://zod.dev/)**, validates your config file so a typo doesn't break the whole app
- **[Upstash Redis](https://upstash.com/)** _(optional)_, caches config between requests so we don't hit GitHub's API too often

## Contributing

Want to add a new hook, fix a bug, or improve the docs? Check out [`CONTRIBUTING.md`](./CONTRIBUTING.md) for a full walkthrough, including how the codebase is organized and how to add your own hook.

## License

Hookto is open source under the [MIT License](./LICENSE).
