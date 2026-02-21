# Plan 03: Me Command (Authenticated User Info)

## Goal

Implement `x-cli me` to show the authenticated user's profile information. This is a simple command that validates the full API pipeline works end-to-end.

## Context

Read `AGENTS.md` in the project root.

## Prerequisites

- Plan 01 completed (config + twitterApi works)
- Plan 02 completed (auth works, tokens in .env)

## Steps

### 1. Implement `src/commands/me.ts`

Call `GET /2/users/me` with these fields:
- `user.fields=id,name,username,description,public_metrics,profile_image_url,created_at`

Export `showMe()`:
- In JSON mode: `outputOk({ id, name, username, description, followers, following, tweets, ... })`
- In pretty mode: Print formatted profile info

### 2. Wire up in `src/cli.ts`

Replace the `me` command stub:
```typescript
program
  .command("me")
  .description("Show authenticated user info")
  .action(async () => {
    const { showMe } = await import("./commands/me.js");
    await showMe();
  });
```

### 3. Build and test

```bash
npm run build
x-cli me
x-cli me --pretty
```

## Deliverables

- `src/commands/me.ts`
- Command wired up in `src/cli.ts`

## Success Criteria

- `x-cli me` outputs JSON with user id, name, username, metrics
- `x-cli me --pretty` shows formatted profile
- Errors (bad token, network) are handled gracefully
