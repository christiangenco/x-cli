# Plan 05: Tweet Creation

## Goal

Implement `x-cli tweets create` — the core command for posting tweets with text, images, video, quote tweets, and replies.

## Context

Read `AGENTS.md` in the project root.

## Prerequisites

- Plan 01 completed (config + twitterApi)
- Plan 04 completed (media upload)

## API Reference

**Create tweet:** `POST https://api.twitter.com/2/tweets`

Request body (JSON):
```json
{
  "text": "Hello world!",
  "media": {
    "media_ids": ["1234567890"]
  },
  "reply": {
    "in_reply_to_tweet_id": "9876543210"
  },
  "quote_tweet_id": "1111111111"
}
```

Response:
```json
{
  "data": {
    "id": "1234567890",
    "text": "Hello world!"
  }
}
```

## Steps

### 1. Implement tweet creation in `src/commands/tweets.ts`

Export `createTweet(opts)`:

**Options:**
- `text` (required): Tweet text (max 280 chars)
- `image`: Path to image file — upload via `uploadMedia()`, attach as `media.media_ids`
- `video`: Path to video file — upload via `uploadMedia()`, attach as `media.media_ids`
- `mediaIds`: Pre-uploaded media IDs (comma-separated string) — for when user already uploaded via `x-cli media upload`
- `replyTo`: Tweet ID to reply to — sets `reply.in_reply_to_tweet_id`
- `quote`: Tweet ID to quote — sets `quote_tweet_id`

**Logic:**
1. Validate text length ≤ 280 characters. If exceeded, error with: `"Tweet text is {n} characters (max 280). Use 'x-cli tweets thread' for longer content."`
2. If `--image` or `--video` provided, call `uploadMedia()` to get `media_id`
3. Build request body
4. Call `POST /2/tweets` via `twitterApi("POST", "tweets", body)`
5. Output the created tweet

**Output:**
- JSON mode: `outputOk({ id: "...", text: "..." })`
- Pretty mode: `✅ Tweet posted: https://x.com/{username}/status/{id}`

### 2. Wire up in `src/cli.ts`

```typescript
tweets
  .command("create")
  .description("Create a new tweet")
  .requiredOption("--text <text>", "Tweet text (max 280 characters)")
  .option("--image <path>", "Attach an image file (JPG/PNG/GIF/WebP)")
  .option("--video <path>", "Attach a video file (MP4)")
  .option("--media-ids <ids>", "Pre-uploaded media IDs (comma-separated)")
  .option("--reply-to <id>", "Tweet ID to reply to")
  .option("--quote <id>", "Tweet ID to quote")
  .action(async (opts) => {
    const { createTweet } = await import("./commands/tweets.js");
    await createTweet(opts);
  });
```

### 3. Build and test

```bash
npm run build

# Text-only tweet
x-cli tweets create --text "Testing x-cli 🚀"

# Tweet with image
x-cli tweets create --text "Look at this" --image ./photo.jpg

# Reply to a tweet
x-cli tweets create --text "Great point!" --reply-to 1234567890

# Quote tweet
x-cli tweets create --text "This 👆" --quote 1234567890
```

After testing, delete test tweets with their IDs.

## Deliverables

- `src/commands/tweets.ts` with `createTweet()` function
- Command wired up in `src/cli.ts`

## Success Criteria

- Text-only tweets post successfully
- Image/video tweets upload media then post
- Reply and quote tweet params are set correctly
- Character limit is validated with helpful error
- Output includes tweet URL in pretty mode
