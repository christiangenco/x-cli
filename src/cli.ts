import { Command } from "commander";
import { setPretty } from "./output.js";
import { runAuth, authStatus } from "./auth.js";

const program = new Command();

program
  .name("x-cli")
  .description("CLI for organic posting to X (Twitter)")
  .version("0.1.0")
  .option("--pretty", "Human-readable formatted output (default: JSON)")
  .hook("preAction", () => {
    if (program.opts().pretty) setPretty(true);
  });

const auth = program
  .command("auth")
  .description("Authenticate with X (OAuth 1.0a)");

auth
  .command("login", { isDefault: true })
  .description("Run OAuth 1.0a 3-legged flow to obtain access tokens")
  .addHelpText('after', `
Examples:
  x-cli auth          # Run OAuth flow (opens browser)`)
  .action(async () => {
    await runAuth();
  });

auth
  .command("status")
  .description("Verify tokens work and show @username")
  .addHelpText('after', `
Examples:
  x-cli auth status   # Check if authenticated`)
  .action(async () => {
    await authStatus();
  });

program
  .command("me")
  .description("Show authenticated user info (id, username, name)")
  .addHelpText('after', `
Examples:
  x-cli me            # Show profile info
  x-cli me --pretty   # Human-readable format`)
  .action(async () => {
    const { showMe } = await import("./commands/me.js");
    await showMe();
  });

const tweets = program
  .command("tweets")
  .description("Manage tweets");

tweets
  .command("create")
  .description("Create a new tweet")
  .requiredOption("--text <text>", "Tweet text (max 280 characters)")
  .option("--image <path>", "Attach an image file (JPG/PNG/GIF/WebP)")
  .option("--video <path>", "Attach a video file (MP4)")
  .option("--media-ids <ids>", "Pre-uploaded media IDs (comma-separated)")
  .option("--reply-to <id>", "Tweet ID to reply to")
  .option("--quote <id>", "Tweet ID to quote")
  .addHelpText('after', `
Examples:
  x-cli tweets create --text "Hello X!"
  x-cli tweets create --text "Check this out" --image ./photo.jpg
  x-cli tweets create --text "Great thread" --reply-to 1234567890
  x-cli tweets create --text "Sharing this" --quote 1234567890`)
  .action(async (opts) => {
    const { createTweet } = await import("./commands/tweets.js");
    await createTweet(opts);
  });

tweets
  .command("thread")
  .description("Post a thread")
  .option("--texts <texts...>", "Tweet texts for thread (repeat for multiple)")
  .option("--file <path>", "Markdown file with tweets separated by ---")
  .addHelpText('after', `
Examples:
  x-cli tweets thread --texts "First tweet" "Second tweet" "Third tweet"
  x-cli tweets thread --file thread.md`)
  .action(async (opts) => {
    const { createThread } = await import("./commands/tweets.js");
    await createThread(opts);
  });

tweets
  .command("list", { isDefault: true })
  .description("List recent tweets")
  .option("-n, --count <n>", "Number of tweets to list", "10")
  .option("--user <username>", "Username to list tweets for (default: authenticated user)")
  .addHelpText('after', `
Examples:
  x-cli tweets list              # List your 10 recent tweets
  x-cli tweets list -n 20        # List 20 recent tweets
  x-cli tweets list --user elonmusk --pretty  # List someone else's tweets`)
  .action(async (opts) => {
    const { listTweets } = await import("./commands/tweets.js");
    await listTweets(opts);
  });

tweets
  .command("get")
  .description("Get tweet details + metrics")
  .argument("<tweet-id>", "Tweet ID")
  .addHelpText('after', `
Examples:
  x-cli tweets get 1234567890    # Get tweet details
  x-cli tweets get 1234567890 --pretty  # Human-readable format`)
  .action(async (tweetId: string) => {
    const { getTweet } = await import("./commands/tweets.js");
    await getTweet(tweetId);
  });

tweets
  .command("delete")
  .description("Delete a tweet")
  .argument("<tweet-id>", "Tweet ID")
  .addHelpText('after', `
Examples:
  x-cli tweets delete 1234567890    # Delete a tweet`)
  .action(async (tweetId: string) => {
    const { deleteTweet } = await import("./commands/tweets.js");
    await deleteTweet(tweetId);
  });

const media = program
  .command("media")
  .description("Media upload utilities");

media
  .command("upload")
  .description("Upload a media file and return media_id")
  .argument("<path>", "Path to media file (.jpg, .png, .gif, .webp, .mp4)")
  .addHelpText('after', `
Examples:
  x-cli media upload ./photo.jpg     # Upload image, get media_id
  x-cli media upload ./video.mp4     # Upload video (with processing)`)
  .action(async (filePath: string) => {
    const { uploadMediaCommand } = await import("./commands/media.js");
    await uploadMediaCommand(filePath);
  });

program.parse();