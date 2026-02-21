import { twitterApi } from "../config.js";
import { outputOk, outputError, isPretty } from "../output.js";

export async function showMe(): Promise<void> {
  try {
    const result = await twitterApi(
      "GET",
      "users/me?user.fields=id,name,username,description,public_metrics,profile_image_url,created_at"
    );

    if (!result.data) {
      outputError("No user data returned from API");
      return;
    }

    const user = result.data;

    if (isPretty()) {
      const metrics = user.public_metrics || {};
      console.log(`👤 ${user.name} (@${user.username})`);
      console.log(`   ID: ${user.id}`);
      if (user.description) {
        console.log(`   Bio: ${user.description}`);
      }
      console.log(`   📊 ${metrics.followers_count || 0} followers • ${metrics.following_count || 0} following • ${metrics.tweet_count || 0} tweets`);
      if (user.created_at) {
        console.log(`   📅 Joined ${new Date(user.created_at).toLocaleDateString()}`);
      }
      if (user.profile_image_url) {
        console.log(`   🖼️  ${user.profile_image_url}`);
      }
    } else {
      outputOk({
        id: user.id,
        name: user.name,
        username: user.username,
        description: user.description,
        followers: user.public_metrics?.followers_count,
        following: user.public_metrics?.following_count,
        tweets: user.public_metrics?.tweet_count,
        likes: user.public_metrics?.like_count,
        profile_image_url: user.profile_image_url,
        created_at: user.created_at
      });
    }
  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error));
  }
}