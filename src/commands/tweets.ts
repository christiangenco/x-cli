import { twitterApi } from "../config.js";
import { outputOk, outputError, isPretty } from "../output.js";
import { uploadMedia } from "../media.js";
import { readFileSync } from "fs";

interface CreateTweetOptions {
  text: string;
  image?: string;
  video?: string;
  mediaIds?: string;
  replyTo?: string;
  quote?: string;
}

interface CreateThreadOptions {
  texts?: string[];
  file?: string;
}

interface ListTweetsOptions {
  count?: string;
  user?: string;
}

export async function deleteTweet(tweetId: string): Promise<void> {
  try {
    const result = await twitterApi("DELETE", `tweets/${tweetId}`);

    if (result.data?.deleted) {
      if (isPretty()) {
        console.log(`✅ Tweet deleted: ${tweetId}`);
      } else {
        outputOk({ deleted: true, id: tweetId });
      }
    } else {
      outputError("Failed to delete tweet");
    }
  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error));
  }
}

export async function listTweets(opts: ListTweetsOptions): Promise<void> {
  try {
    const requested = parseInt(opts.count || "10");
    if (isNaN(requested) || requested < 1 || requested > 100) {
      outputError("Count must be a number between 1 and 100");
      return;
    }
    // X API requires min 5 for max_results; fetch 5 and slice if fewer requested
    const count = Math.max(5, requested);

    let userId: string;

    // Get user ID
    if (opts.user) {
      // Look up user by username
      const userResult = await twitterApi("GET", `users/by/username/${opts.user}`);
      if (!userResult.data) {
        outputError(`User @${opts.user} not found`);
        return;
      }
      userId = userResult.data.id;
    } else {
      // Get authenticated user's ID
      const meResult = await twitterApi("GET", "users/me");
      if (!meResult.data) {
        outputError("Could not get authenticated user info");
        return;
      }
      userId = meResult.data.id;
    }

    // Fetch tweets
    const result = await twitterApi("GET", `users/${userId}/tweets?max_results=${count}&tweet.fields=id,text,created_at,public_metrics`);

    if (!result.data || !Array.isArray(result.data)) {
      outputError("No tweets found");
      return;
    }

    const tweets = result.data.slice(0, requested);

    if (isPretty()) {
      // Table header
      console.log("ID                   Date        ❤️     🔁    💬    Text");
      console.log("─".repeat(80));

      tweets.forEach((tweet: any) => {
        const id = tweet.id;
        const date = new Date(tweet.created_at).toISOString().slice(0, 10); // YYYY-MM-DD
        const likes = tweet.public_metrics?.like_count || 0;
        const retweets = tweet.public_metrics?.retweet_count || 0;
        const replies = tweet.public_metrics?.reply_count || 0;
        const text = tweet.text.length > 50 ? tweet.text.slice(0, 47) + "..." : tweet.text;
        const textSafe = text.replace(/\n/g, " ");

        console.log(
          `${id.padEnd(20)} ${date} ${likes.toString().padStart(5)} ${retweets.toString().padStart(5)} ${replies.toString().padStart(5)} ${textSafe}`
        );
      });
    } else {
      outputOk({ tweets });
    }
  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error));
  }
}

export async function getTweet(tweetId: string): Promise<void> {
  try {
    const result = await twitterApi("GET", `tweets/${tweetId}?tweet.fields=id,text,created_at,public_metrics,source,conversation_id&expansions=author_id&user.fields=username`);

    if (!result.data) {
      outputError(`Tweet ${tweetId} not found`);
      return;
    }

    const tweet = result.data;
    const author = result.includes?.users?.[0];

    if (isPretty()) {
      console.log(`Tweet ${tweet.id}`);
      if (author) {
        console.log(`  Author:  @${author.username}`);
      }
      console.log(`  Date:    ${new Date(tweet.created_at).toLocaleString()}`);
      console.log(`  Text:    ${tweet.text}`);
      if (tweet.public_metrics) {
        console.log(`  Likes:   ${tweet.public_metrics.like_count}`);
        console.log(`  Retweets: ${tweet.public_metrics.retweet_count}`);
        console.log(`  Replies:  ${tweet.public_metrics.reply_count}`);
      }
      const username = author?.username || "unknown";
      console.log(`  URL:     https://x.com/${username}/status/${tweet.id}`);
    } else {
      outputOk({ tweet, author });
    }
  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error));
  }
}

export async function createTweet(opts: CreateTweetOptions): Promise<void> {
  try {
    // X Premium accounts can post up to 25,000 characters
    if (opts.text.length > 25000) {
      outputError(`Tweet text is ${opts.text.length} characters (max 25,000 for Premium accounts).`);
      return;
    }

    const requestBody: any = {
      text: opts.text,
    };

    // Handle media uploads
    const mediaIds: string[] = [];
    
    if (opts.image) {
      const result = await uploadMedia(opts.image);
      mediaIds.push(result.media_id);
    }

    if (opts.video) {
      const result = await uploadMedia(opts.video);
      mediaIds.push(result.media_id);
    }

    // Handle pre-uploaded media IDs
    if (opts.mediaIds) {
      const ids = opts.mediaIds.split(',').map(id => id.trim()).filter(Boolean);
      mediaIds.push(...ids);
    }

    // Add media to request if any
    if (mediaIds.length > 0) {
      requestBody.media = {
        media_ids: mediaIds,
      };
    }

    // Handle reply
    if (opts.replyTo) {
      requestBody.reply = {
        in_reply_to_tweet_id: opts.replyTo,
      };
    }

    // Handle quote tweet
    if (opts.quote) {
      requestBody.quote_tweet_id = opts.quote;
    }

    // Create the tweet
    const result = await twitterApi("POST", "tweets", requestBody);

    if (!result.data) {
      outputError("No tweet data returned from API");
      return;
    }

    const tweet = result.data;

    if (isPretty()) {
      console.log(`✅ Tweet posted: https://x.com/cgenco/status/${tweet.id}`);
      console.log(`   Text: "${tweet.text}"`);
      console.log(`   ID: ${tweet.id}`);
    } else {
      outputOk({
        id: tweet.id,
        text: tweet.text,
        url: `https://x.com/cgenco/status/${tweet.id}`,
      });
    }
  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error));
  }
}

export async function createThread(opts: CreateThreadOptions): Promise<void> {
  try {
    let tweetTexts: string[] = [];

    // Parse input: either from texts array or file
    if (opts.texts && opts.file) {
      outputError("Cannot use both --texts and --file options together");
      return;
    }

    if (opts.texts) {
      tweetTexts = opts.texts;
    } else if (opts.file) {
      try {
        const fileContent = readFileSync(opts.file, 'utf-8');
        tweetTexts = fileContent
          .split(/\n\s*---\s*\n/)
          .map(segment => segment.trim())
          .filter(segment => segment.length > 0);
      } catch (error) {
        outputError(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
    } else {
      outputError("Must provide either --texts or --file option");
      return;
    }

    if (tweetTexts.length === 0) {
      outputError("No tweets to post");
      return;
    }

    if (tweetTexts.length === 1) {
      outputError("Thread must contain at least 2 tweets. Use 'x-cli tweets create' for single tweets.");
      return;
    }

    // Validate each segment is ≤ 280 characters (note: X counts URLs as 23 chars regardless of actual length)
    for (let i = 0; i < tweetTexts.length; i++) {
      const text = tweetTexts[i];
      if (text.length > 280) {
        outputError(`Tweet ${i + 1} is ${text.length} characters (max 280). Note: X counts URLs as 23 chars.`);
        return;
      }
    }

    const postedTweets: Array<{ id: string; text: string }> = [];
    let previousTweetId: string | null = null;

    // Post tweets sequentially
    for (let i = 0; i < tweetTexts.length; i++) {
      const text = tweetTexts[i];
      
      try {
        const requestBody: any = { text };

        // For replies (not the first tweet), set reply info
        if (previousTweetId) {
          requestBody.reply = {
            in_reply_to_tweet_id: previousTweetId,
          };
        }

        const result = await twitterApi("POST", "tweets", requestBody);

        if (!result.data) {
          throw new Error("No tweet data returned from API");
        }

        const tweet = result.data;
        postedTweets.push({ id: tweet.id, text: tweet.text });
        previousTweetId = tweet.id;

      } catch (error) {
        // If posting fails mid-thread, output what was posted so far + error
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (isPretty()) {
          console.error(`❌ Thread posting failed at tweet ${i + 1}: ${errorMessage}`);
          if (postedTweets.length > 0) {
            console.error(`✅ Successfully posted ${postedTweets.length} tweet(s):`);
            postedTweets.forEach((tweet, idx) => {
              console.error(`   ${idx + 1}/${postedTweets.length}: https://x.com/cgenco/status/${tweet.id}`);
            });
          }
        } else {
          outputError(`Thread posting failed at tweet ${i + 1}: ${errorMessage}`, {
            posted: postedTweets,
            failed_at: i + 1,
          });
        }
        return;
      }
    }

    // Success - output all posted tweets
    const firstTweetId = postedTweets[0].id;
    const threadUrl = `https://x.com/cgenco/status/${firstTweetId}`;

    if (isPretty()) {
      console.log(`✅ Thread posted (${postedTweets.length} tweets):`);
      postedTweets.forEach((tweet, idx) => {
        console.log(`   ${idx + 1}/${postedTweets.length}: https://x.com/cgenco/status/${tweet.id}`);
      });
    } else {
      outputOk({
        thread: postedTweets,
        url: threadUrl,
      });
    }

  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error));
  }
}