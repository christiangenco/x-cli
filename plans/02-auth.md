# Plan 02: OAuth Authentication

## Goal

Implement the `x-cli auth` and `x-cli auth status` commands. After this plan, users can authenticate and verify their tokens.

## Context

Read `AGENTS.md` in the project root for the full architecture and credentials.

## Prerequisites

- Plan 01 completed (project builds, `src/config.ts` has OAuth signing)

## Steps

### 1. Implement `src/auth.ts`

Port from `~/tools/x-ads-cli/src/auth.ts`. The OAuth 1.0a 3-legged flow:

1. **Request token:** `POST https://api.x.com/oauth/request_token` with `oauth_callback=http://localhost:3456/callback`
2. **Open browser:** Direct user to `https://api.x.com/oauth/authorize?oauth_token=TOKEN`
3. **Callback server:** Listen on `localhost:3456`, receive `oauth_token` + `oauth_verifier`
4. **Exchange tokens:** `POST https://api.x.com/oauth/access_token` with the verifier
5. **Save to .env:** Write `X_ACCESS_TOKEN` and `X_ACCESS_TOKEN_SECRET` to the tool's `.env` file

**Key differences from x-ads-cli:**
- The `.env` file path should resolve relative to the x-cli package directory (use `import.meta.url` or `__dirname` equivalent), NOT `process.cwd()`. This ensures tokens are saved to `~/tools/x-cli/.env` regardless of where the command is run from.
- Print `✅ Authenticated as @{screen_name}. Tokens saved to .env.`

Export:
- `runAuth()` — the full OAuth flow
- `authStatus()` — verify tokens by calling `GET /2/users/me` and printing user info

### 2. Implement `authStatus()`

Call `GET https://api.twitter.com/2/users/me?user.fields=public_metrics,description` using `twitterApi()` from config.ts.

Output:
```
✅ Authenticated as @cgenco
   Name: Christian Genco
   Followers: 12,345
   Following: 678
```

On failure: `❌ Authentication failed. Run 'x-cli auth' to re-authenticate.`

### 3. Wire up CLI commands

In `src/cli.ts`, replace the auth command stubs with real imports:
- `x-cli auth` → `runAuth()`
- `x-cli auth status` → `authStatus()`

### 4. Build and test

```bash
npm run build
x-cli auth status   # Should fail gracefully if no tokens
x-cli auth          # Run the full flow
x-cli auth status   # Should succeed
```

## Deliverables

- `src/auth.ts` — OAuth 1.0a flow + status check
- Auth commands wired up in `src/cli.ts`

## Success Criteria

- `x-cli auth` opens browser, completes OAuth, saves tokens to `.env`
- `x-cli auth status` shows username and follower count
- Tokens persist across invocations (saved to `.env`)
- Errors are clear and actionable
