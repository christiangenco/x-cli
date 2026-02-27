# x-cli

CLI for organic posting to X (Twitter) from a personal account. Create tweets, threads, upload media, list your timeline, and manage posts. This is for organic content — for paid ads, use `~/tools/x-ads-cli`.

## Commands

```bash
x-cli auth login                                    # OAuth 1.0a login flow (opens browser)
x-cli auth status                                   # Verify tokens work, show @username

x-cli me                                            # Show authenticated user info (id, username, name)

x-cli tweets create --text "Hello X!"               # Create a tweet
x-cli tweets create --text "Check this" --image ./photo.jpg           # Tweet with image
x-cli tweets create --text "Watch this" --video ./clip.mp4            # Tweet with video
x-cli tweets create --text "Read this" --quote <tweet-id>             # Quote tweet
x-cli tweets create --text "Thread time" --reply-to <tweet-id>        # Reply to a tweet
x-cli tweets create --text "Multi" --media-ids 123,456               # Pre-uploaded media IDs

x-cli tweets thread --texts "First tweet" "Second tweet" "Third tweet"  # Post a thread (auto-chains replies)
x-cli tweets thread --file thread.md                                     # Post thread from markdown file (--- separated)

x-cli dms send --user <username> --text "Hey!"       # Send a DM to a user by @username
x-cli dms send --user-id <id> --text "Hello"         # Send a DM by user ID
x-cli dms send --conversation-id <id> --text "Reply"  # Reply in an existing conversation
x-cli dms list                                       # List recent DM events (default 20)
x-cli dms list -n 50                                 # List more events
x-cli dms list --conversation-id <id>                # Messages in a specific conversation
x-cli dms conversations                              # List recent DM conversations

x-cli tweets list                                   # List your recent tweets (default 10)
x-cli tweets list -n 20                             # List more
x-cli tweets list --user <username>                 # List another user's tweets

x-cli tweets get <tweet-id>                         # Get tweet details + metrics
x-cli tweets delete <tweet-id>                      # Delete a tweet

x-cli media upload <path>                           # Upload media, return media_id
```

## Thread File Format

For `x-cli tweets thread --file`, use a markdown file with tweets separated by `---`:

```markdown
First tweet text goes here.
---
Second tweet text.

Can have multiple paragraphs within a tweet.
---
Third tweet. Include the CTA here.
```

## Credentials

`.env` with:
- `X_API_KEY` — Consumer Key (from X Developer Portal)
- `X_API_SECRET` — Consumer Secret
- `X_ACCESS_TOKEN` — User OAuth access token (set by `x-cli auth`)
- `X_ACCESS_TOKEN_SECRET` — User OAuth access token secret (set by `x-cli auth`)

These are the same credentials used by `x-ads-cli`. If you already have `~/tools/x-ads-cli/.env` configured, copy those 4 values (the `X_AD_ACCOUNT_ID` is not needed here).

## Output

JSON to stdout: `{"ok": true, "data": {...}}` or `{"ok": false, "error": "message"}`

Use `--pretty` for human-readable formatted output (global flag).

## X API v2 Reference

All organic endpoints use the **X API v2** at `https://api.twitter.com/2/`.

| Action | Method | Endpoint |
|--------|--------|----------|
| Create tweet | POST | `/2/tweets` |
| Delete tweet | DELETE | `/2/tweets/:id` |
| Get tweet | GET | `/2/tweets/:id` |
| User timeline | GET | `/2/users/:id/tweets` |
| Get user by username | GET | `/2/users/by/username/:username` |
| Get authenticated user | GET | `/2/users/me` |
| Upload media | POST | `https://upload.twitter.com/1.1/media/upload.json` |
| Send DM (to user) | POST | `/2/dm_conversations/with/:participant_id/messages` |
| Send DM (to conversation) | POST | `/2/dm_conversations/:dm_conversation_id/messages` |
| List DM events | GET | `/2/dm_events` |
| List conversation events | GET | `/2/dm_conversations/:id/dm_events` |

Auth: OAuth 1.0a (HMAC-SHA1 signed). Same signing as x-ads-cli.

## Rate Limits

- Create tweet: 200 per 15 min (per user), 300 per 15 min (per app)
- User timeline: 900 per 15 min (per user)
- Single tweet lookup: 900 per 15 min (per user)
- Delete tweet: 50 per 15 min (per user)
- DM send: 200 per 15 min (per user), 1000 per 24 hours (per user)
- DM events list: 300 per 15 min (per user)

## Architecture

```
x-cli/
├── bin/x-cli.js           # #!/usr/bin/env node → import "../dist/cli.js"
├── src/
│   ├── cli.ts             # Commander program definition
│   ├── config.ts          # dotenv + env var validation + OAuth signing
│   ├── auth.ts            # OAuth 1.0a 3-legged flow (reused from x-ads-cli)
│   ├── media.ts           # Media upload (INIT/APPEND/FINALIZE, same as x-ads-cli)
│   ├── output.ts          # JSON envelope helpers + --pretty support
│   └── commands/
│       ├── me.ts          # Authenticated user info
│       ├── tweets.ts      # Create, list, get, delete tweets + threads
│       ├── dms.ts         # Send, list DMs + list conversations
│       └── media.ts       # Media upload command
├── plans/                 # Build plans for pi agents
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── AGENTS.md
└── README.md
```

## Key Implementation Notes

- Reuses the same OAuth 1.0a signing pattern from `~/tools/x-ads-cli/src/config.ts` (the `twitterApi` function)
- Media upload reuses the same chunked INIT/APPEND/FINALIZE flow from `~/tools/x-ads-cli/src/media.ts`
- Threads are implemented by creating tweets sequentially, each with `reply.in_reply_to_tweet_id` set to the previous tweet's ID
- The `--file` flag for threads reads a markdown file and splits on `---` lines
- Tweet text is limited to 25,000 characters (Premium). The `--text` option documents this limit.
