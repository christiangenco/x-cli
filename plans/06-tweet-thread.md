# Plan 06: Thread Posting

## Goal

Implement `x-cli tweets thread` — post a multi-tweet thread by chaining replies automatically.

## Context

Read `AGENTS.md` in the project root.

## Prerequisites

- Plan 05 completed (single tweet creation works)

## How Threads Work on X

A thread is a series of tweets where each tweet is a reply to the previous one. The first tweet is a normal tweet, and each subsequent tweet has `reply.in_reply_to_tweet_id` set to the ID of the previous tweet.

## Steps

### 1. Implement thread posting in `src/commands/tweets.ts`

Export `createThread(opts)`:

**Options (two input modes):**
- `--texts "first" "second" "third"` — inline text arguments (variadic)
- `--file thread.md` — read from a markdown file, split on `---` separator lines

**Logic:**
1. Parse input: either from `texts` array or by reading the file and splitting on `\n---\n`
2. Trim each tweet text. Filter out empty segments.
3. Validate each segment is ≤ 280 characters. Error with segment index + length if any exceed.
4. Post the first tweet as a normal tweet (no `reply` field)
5. For each subsequent tweet, set `reply.in_reply_to_tweet_id` to the previous tweet's ID
6. Collect all tweet IDs

**Output:**
- JSON mode: `outputOk({ thread: [{ id, text }, ...], url: "https://x.com/{username}/status/{first_id}" })`
- Pretty mode:
  ```
  ✅ Thread posted (3 tweets):
     1/3: https://x.com/cgenco/status/111
     2/3: https://x.com/cgenco/status/222
     3/3: https://x.com/cgenco/status/333
  ```

**Error handling:**
- If posting fails mid-thread, output what was posted so far + the error
- Include the IDs of successfully posted tweets so they can be cleaned up

### 2. Thread file format

For `--file`, the format is:

```markdown
First tweet text goes here.
---
Second tweet text.

Can have multiple paragraphs within a single tweet.
---
Third tweet. Include the CTA here.
```

- Lines containing only `---` (with optional whitespace) are separators
- Leading/trailing whitespace in each segment is trimmed
- Empty segments (after trimming) are skipped
- Newlines within a segment are preserved (X supports multi-line tweets)

### 3. Wire up in `src/cli.ts`

```typescript
tweets
  .command("thread")
  .description("Post a thread (multiple tweets chained as replies)")
  .option("--texts <texts...>", "Tweet texts (one per argument)")
  .option("--file <path>", "Read thread from a markdown file (tweets separated by ---)")
  .action(async (opts) => {
    const { createThread } = await import("./commands/tweets.js");
    await createThread(opts);
  });
```

### 4. Build and test

```bash
npm run build

# Inline thread
x-cli tweets thread --texts "First tweet 🧵" "Second tweet" "Third tweet — fin."

# File-based thread
cat > /tmp/test-thread.md << 'EOF'
This is the first tweet in the thread. It sets the stage.
---
Here's the second tweet with more detail.

It even has a second paragraph.
---
And the final tweet with a CTA. Check out gen.co/ai-consulting-dfw
EOF

x-cli tweets thread --file /tmp/test-thread.md
```

After testing, delete the thread.

## Deliverables

- `createThread()` function added to `src/commands/tweets.ts`
- Thread command wired up in `src/cli.ts`

## Success Criteria

- `--texts` mode creates a properly chained thread
- `--file` mode reads markdown and splits correctly
- Each tweet in thread is ≤ 280 chars (validated before posting)
- Mid-thread failures report what was already posted
- Thread URL points to the first tweet
