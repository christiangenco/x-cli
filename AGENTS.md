# x-cli

CLI for organic posting to X (Twitter). For paid ads, use `~/tools/x-ads-cli`.

## Credentials

`.env` with `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` (same as x-ads-cli, minus `X_AD_ACCOUNT_ID`).

## Commands

```bash
x-cli auth login                                    # OAuth 1.0a login flow (opens browser)
x-cli auth status                                   # Verify tokens work, show @username

x-cli me                                            # Show authenticated user info

x-cli tweets create --text "Hello X!"               # Create a tweet
x-cli tweets create --text "Check this" --image ./photo.jpg           # Tweet with image
x-cli tweets create --text "Watch this" --video ./clip.mp4            # Tweet with video
x-cli tweets create --text "Read this" --quote <tweet-id>             # Quote tweet
x-cli tweets create --text "Thread time" --reply-to <tweet-id>        # Reply to a tweet

x-cli tweets thread --texts "First tweet" "Second tweet" "Third tweet"  # Post a thread
x-cli tweets thread --file thread.md                                     # Thread from markdown (--- separated)

x-cli dms send --user <username> --text "Hey!"       # Send DM by @username
x-cli dms send --user-id <id> --text "Hello"         # Send DM by user ID
x-cli dms send --conversation-id <id> --text "Reply"  # Reply in existing conversation
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

Markdown file with tweets separated by `---`:

```markdown
First tweet text goes here.
---
Second tweet text.

Can have multiple paragraphs within a tweet.
---
Third tweet. Include the CTA here.
```

## Output

JSON to stdout: `{"ok": true, "data": {...}}` or `{"ok": false, "error": "message"}`

Use `--pretty` for human-readable formatted output.
