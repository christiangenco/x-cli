# Plan 01: Project Setup & Core Infrastructure

## Goal

Set up the TypeScript project, install dependencies, and implement the core infrastructure: config loading, OAuth 1.0a signing, output helpers, and the CLI entry point. After this plan, `x-cli --help` should work.

## Context

Read `AGENTS.md` in the project root for the full architecture, API reference, and conventions.

This tool follows the same patterns as `~/tools/x-ads-cli` and `~/tools/linkedin-cli`. Reference those for implementation patterns.

## Prerequisites

- `package.json`, `tsconfig.json`, `bin/x-cli.js` already exist
- `.env.example` and `.gitignore` already exist

## Steps

### 1. Install dependencies

```bash
cd ~/tools/x-cli
npm install
```

### 2. Implement `src/config.ts`

Port from `~/tools/x-ads-cli/src/config.ts`. This file should:
- Load `.env` via `dotenv/config`
- Export `getConfig()` → returns `{ apiKey, apiSecret, accessToken, accessTokenSecret }`
- Validate all 4 env vars are present, throw descriptive error if not
- Export `twitterApi(method, path, jsonBody?)` → makes OAuth 1.0a signed requests to `https://api.twitter.com/2/`
  - For GET requests: no body, sign URL + method
  - For POST/PUT/DELETE with JSON body: sign URL + method only (body params NOT included in OAuth signature), set `Content-Type: application/json`
  - Return parsed JSON
  - On error (response has `errors` array), format and throw
- Export `uploadApi(method, formData)` → for media upload endpoint (used later in media.ts)

**Reference:** Copy the `twitterApi` function from `~/tools/x-ads-cli/src/config.ts` — it already implements the correct v2 API signing pattern. Do NOT copy `xApi` (that's for the Ads API).

### 3. Implement `src/output.ts`

Port from `~/tools/x-ads-cli/src/output.ts`:
- `setPretty(val)` / `isPretty()`
- `outputOk(data)` → `console.log(JSON.stringify({ ok: true, data }))`
- `outputError(error, details?)` → `console.log(JSON.stringify({ ok: false, error }))` + `process.exit(1)`
- In pretty mode, `outputOk` should print formatted data, `outputError` should print to stderr

### 4. Implement `src/cli.ts`

Create the Commander program with:
- Name: `x-cli`
- Description: "CLI for organic posting to X (Twitter)"
- Global `--pretty` flag
- Stub commands (just the command definitions, actions will be implemented in later plans):
  - `auth` (with `login` and `status` subcommands)
  - `me`
  - `tweets` (with `create`, `thread`, `list`, `get`, `delete` subcommands)
  - `media` (with `upload` subcommand)

For now, each action can just print "Not implemented yet" — later plans fill them in.

### 5. Build and verify

```bash
npm run build
chmod +x bin/x-cli.js
npx x-cli --help
```

Verify the help output shows all commands.

### 6. Link globally

```bash
npm link
x-cli --help
```

## Deliverables

- `src/config.ts` — config loading + `twitterApi()` + OAuth signing
- `src/output.ts` — JSON output helpers
- `src/cli.ts` — Commander program with all command stubs
- Tool builds and `x-cli --help` works from any directory

## Success Criteria

- `npm run build` succeeds with no errors
- `x-cli --help` shows all commands and options
- `src/config.ts` correctly validates env vars and has working `twitterApi()` function
- Code matches the patterns in `~/tools/x-ads-cli`
