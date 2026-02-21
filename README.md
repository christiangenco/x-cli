# x-cli

CLI for organic posting to X (Twitter). Create tweets, threads, upload media, list your timeline, and manage posts.

For paid advertising, see [x-ads-cli](../x-ads-cli/).

## Prerequisites

- Node.js 20+
- X Developer App with OAuth 1.0a credentials (Consumer Key + Secret)
- User-level OAuth access token (obtained via `x-cli auth`)

## Setup

1. **Get API credentials:** Go to [developer.x.com](https://developer.x.com), create a project + app. Under "Keys and tokens", get your Consumer Key (API Key) and Consumer Secret.

2. **Configure `.env`:**
   ```bash
   cd ~/tools/x-cli
   cp .env.example .env
   # Edit .env with your Consumer Key and Secret
   ```

3. **Install dependencies:**
   ```bash
   npm install
   npm run build
   npm link
   ```

4. **Authenticate:**
   ```bash
   x-cli auth
   ```
   This opens a browser for OAuth authorization. Tokens are saved to `.env`.

## Usage

### Create a tweet

```bash
x-cli tweets create --text "Hello X!"
```

### Tweet with an image

```bash
x-cli tweets create --text "Check this out" --image ./photo.jpg
```

### Post a thread

```bash
x-cli tweets thread --texts "First tweet" "Second tweet" "Third tweet with CTA"
```

Or from a file (tweets separated by `---`):

```bash
x-cli tweets thread --file my-thread.md
```

### List your recent tweets

```bash
x-cli tweets list
x-cli tweets list -n 20
```

### Get a specific tweet with metrics

```bash
x-cli tweets get 1234567890
```

### Delete a tweet

```bash
x-cli tweets delete 1234567890
```

### Upload media separately

```bash
x-cli media upload ./video.mp4
```

## Output

All commands output JSON to stdout:

```json
{"ok": true, "data": {"id": "1234567890", "text": "Hello X!"}}
```

Use `--pretty` for human-readable output.

## How It Works

- Uses **X API v2** (`https://api.twitter.com/2/`) for tweet operations
- Uses **Twitter Upload API v1.1** for media uploads (chunked INIT/APPEND/FINALIZE)
- Auth: OAuth 1.0a with HMAC-SHA1 signing (same as x-ads-cli)
- Threads: sequential tweet creation with `reply.in_reply_to_tweet_id` chaining

## Credentials

| Variable | Description |
|----------|-------------|
| `X_API_KEY` | Consumer Key (API Key) from X Developer Portal |
| `X_API_SECRET` | Consumer Secret from X Developer Portal |
| `X_ACCESS_TOKEN` | User access token (set by `x-cli auth`) |
| `X_ACCESS_TOKEN_SECRET` | User access token secret (set by `x-cli auth`) |

If you already have `~/tools/x-ads-cli/.env` configured, you can reuse the same credentials.
