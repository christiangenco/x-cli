# Plan 07: List, Get, and Delete Tweets

## Goal

Implement `x-cli tweets list`, `x-cli tweets get`, and `x-cli tweets delete` — the read and delete operations for managing tweets.

## Context

Read `AGENTS.md` in the project root.

## Prerequisites

- Plan 01 completed (config + twitterApi)
- Plan 03 completed (me command — need user ID for timeline)

## API Reference

### List user's tweets
`GET /2/users/:id/tweets`

Query params:
- `max_results` (5-100, default 10)
- `tweet.fields=id,text,created_at,public_metrics,source`
- `pagination_token` (for next page)

### Get single tweet
`GET /2/tweets/:id`

Query params:
- `tweet.fields=id,text,created_at,public_metrics,source,conversation_id,in_reply_to_user_id`
- `expansions=author_id`
- `user.fields=username`

### Delete tweet
`DELETE /2/tweets/:id`

Response: `{ "data": { "deleted": true } }`

### Get user by username
`GET /2/users/by/username/:username`

## Steps

### 1. Implement `listTweets(opts)` in `src/commands/tweets.ts`

**Options:**
- `--count` / `-n`: Number of tweets (default 10, max 100)
- `--user <username>`: List another user's tweets (default: authenticated user)

**Logic:**
1. Get user ID: if `--user` provided, look up via `/2/users/by/username/:username`. Otherwise, call `/2/users/me` to get own ID.
2. Call `GET /2/users/:id/tweets?max_results={count}&tweet.fields=id,text,created_at,public_metrics`
3. Output the list

**Output (pretty mode):**
```
  ID                  Date        ❤️     🔁    💬    Text
  1234567890123456789 2026-02-21  45     12    8     Hello X! This is my first...
  ...
```

Truncate text to ~60 chars in table view.

### 2. Implement `getTweet(tweetId)` in `src/commands/tweets.ts`

**Logic:**
1. Call `GET /2/tweets/:id?tweet.fields=id,text,created_at,public_metrics,source,conversation_id&expansions=author_id&user.fields=username`
2. Output full tweet details + metrics

**Output (pretty mode):**
```
Tweet 1234567890123456789
  Author:  @cgenco
  Date:    2026-02-21 13:45:00
  Text:    Hello X! This is my first tweet from x-cli.
  Likes:   45
  Retweets: 12
  Replies:  8
  URL:     https://x.com/cgenco/status/1234567890123456789
```

### 3. Implement `deleteTweet(tweetId)` in `src/commands/tweets.ts`

**Logic:**
1. Call `DELETE /2/tweets/:id` via `twitterApi("DELETE", "tweets/{id}")`
2. Verify response has `data.deleted === true`

**Output:**
- JSON: `outputOk({ deleted: true, id: "..." })`
- Pretty: `✅ Deleted tweet 1234567890123456789`

### 4. Wire up in `src/cli.ts`

```typescript
tweets
  .command("list")
  .description("List recent tweets")
  .option("-n, --count <number>", "Number of tweets to fetch", "10")
  .option("--user <username>", "List another user's tweets")
  .action(async (opts) => {
    const { listTweets } = await import("./commands/tweets.js");
    await listTweets(opts);
  });

tweets
  .command("get <id>")
  .description("Get a specific tweet with metrics")
  .action(async (id: string) => {
    const { getTweet } = await import("./commands/tweets.js");
    await getTweet(id);
  });

tweets
  .command("delete <id>")
  .description("Delete a tweet")
  .action(async (id: string) => {
    const { deleteTweet } = await import("./commands/tweets.js");
    await deleteTweet(id);
  });
```

### 5. Build and test

```bash
npm run build

x-cli tweets list
x-cli tweets list -n 5 --pretty
x-cli tweets list --user elonmusk -n 3

x-cli tweets get 1234567890  # use a real tweet ID

# Create and delete a test tweet
x-cli tweets create --text "Test tweet to delete"
x-cli tweets delete <id-from-above>
```

## Deliverables

- `listTweets()`, `getTweet()`, `deleteTweet()` added to `src/commands/tweets.ts`
- Commands wired up in `src/cli.ts`

## Success Criteria

- `x-cli tweets list` shows own timeline with metrics
- `x-cli tweets list --user <name>` shows another user's tweets
- `x-cli tweets get <id>` shows full tweet details
- `x-cli tweets delete <id>` removes the tweet
- Pretty mode shows clean, readable tables
- JSON mode outputs proper `{ok, data}` envelope
