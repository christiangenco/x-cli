import { getConfig } from "./config.js";
import OAuth from "oauth-1.0a";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json";
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".mp4":
      return "video/mp4";
    default:
      throw new Error(`Unsupported file extension: ${ext}. Supported: .jpg, .jpeg, .png, .gif, .webp, .mp4`);
  }
}

function getMediaCategory(mimeType: string): string {
  return mimeType.startsWith("video/") ? "tweet_video" : "tweet_image";
}

function isVideo(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

function makeOAuth(config: { apiKey: string; apiSecret: string }) {
  return new OAuth({
    consumer: { key: config.apiKey, secret: config.apiSecret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString: string, key: string) {
      return crypto
        .createHmac("sha1", key)
        .update(baseString)
        .digest("base64");
    },
  });
}

async function uploadRequest(
  config: ReturnType<typeof getConfig>,
  formData: Record<string, string>
): Promise<any> {
  const oauth = makeOAuth(config);
  const token = { key: config.accessToken, secret: config.accessTokenSecret };

  const requestData: OAuth.RequestOptions = {
    url: UPLOAD_URL,
    method: "POST",
    data: formData,
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      ...authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(formData).toString(),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Media upload failed (${response.status}): ${text}`);
  }

  return text ? JSON.parse(text) : {};
}

async function uploadRequestMultipart(
  config: ReturnType<typeof getConfig>,
  mediaId: string,
  segmentIndex: number,
  chunk: Buffer
): Promise<any> {
  const oauth = makeOAuth(config);
  const token = { key: config.accessToken, secret: config.accessTokenSecret };

  // For multipart form data, OAuth signature is computed without the body params
  const requestData: OAuth.RequestOptions = {
    url: UPLOAD_URL,
    method: "POST",
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const formData = new FormData();
  formData.append("command", "APPEND");
  formData.append("media_id", mediaId);
  formData.append("segment_index", String(segmentIndex));
  formData.append("media_data", chunk.toString("base64"));

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      ...authHeader,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Media APPEND failed (${response.status}): ${text}`);
  }

  // APPEND returns 2xx with empty body on success
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function uploadStatusRequest(
  config: ReturnType<typeof getConfig>,
  mediaId: string
): Promise<any> {
  const oauth = makeOAuth(config);
  const token = { key: config.accessToken, secret: config.accessTokenSecret };

  const params: Record<string, string> = {
    command: "STATUS",
    media_id: mediaId,
  };

  const fullUrl = `${UPLOAD_URL}?${new URLSearchParams(params).toString()}`;

  const requestData: OAuth.RequestOptions = {
    url: fullUrl,
    method: "GET",
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const response = await fetch(fullUrl, {
    method: "GET",
    headers: {
      ...authHeader,
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Media STATUS failed (${response.status}): ${text}`);
  }

  return text ? JSON.parse(text) : {};
}

function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export interface MediaUploadResult {
  media_id: string;
  media_key?: string;
}

export async function uploadMedia(filePath: string): Promise<MediaUploadResult> {
  const config = getConfig();

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileSize = fileBuffer.length;
  const mimeType = getMimeType(filePath);
  const mediaCategory = getMediaCategory(mimeType);

  // Step 1: INIT
  const initResponse = await uploadRequest(config, {
    command: "INIT",
    total_bytes: String(fileSize),
    media_type: mimeType,
    media_category: mediaCategory,
  });

  const mediaId = initResponse.media_id_string;
  if (!mediaId) {
    throw new Error(`INIT did not return media_id_string: ${JSON.stringify(initResponse)}`);
  }

  // Step 2: APPEND (chunked)
  let segmentIndex = 0;
  let offset = 0;
  while (offset < fileSize) {
    const end = Math.min(offset + CHUNK_SIZE, fileSize);
    const chunk = fileBuffer.subarray(offset, end);

    await uploadRequestMultipart(config, mediaId, segmentIndex, chunk as Buffer);

    segmentIndex++;
    offset = end;
  }

  // Step 3: FINALIZE
  const finalizeResponse = await uploadRequest(config, {
    command: "FINALIZE",
    media_id: mediaId,
  });

  // Step 4: Poll STATUS for videos
  if (isVideo(mimeType) && finalizeResponse.processing_info) {
    let processingInfo = finalizeResponse.processing_info;

    while (processingInfo && processingInfo.state !== "succeeded" && processingInfo.state !== "failed") {
      const waitSeconds = processingInfo.check_after_secs || 5;
      console.error(`Processing video... waiting ${waitSeconds}s (state: ${processingInfo.state})`);
      await sleep(waitSeconds);

      const statusResponse = await uploadStatusRequest(config, mediaId);
      processingInfo = statusResponse.processing_info;
    }

    if (processingInfo && processingInfo.state === "failed") {
      throw new Error(`Video processing failed: ${JSON.stringify(processingInfo.error || processingInfo)}`);
    }
  }

  // Return both media_id (for v2 API) and media_key (if available)
  return {
    media_id: mediaId,
    media_key: finalizeResponse.media_key,
  };
}