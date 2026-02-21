import { uploadMedia } from "../media.js";
import { outputOk, outputError, isPretty } from "../output.js";

export async function uploadMediaCommand(filePath: string): Promise<void> {
  try {
    const result = await uploadMedia(filePath);
    
    if (isPretty()) {
      console.log(`✅ Uploaded: media_id=${result.media_id}${result.media_key ? ` media_key=${result.media_key}` : ''}`);
    } else {
      outputOk(result);
    }
  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error));
  }
}