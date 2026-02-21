import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import OAuth from "oauth-1.0a";
import crypto from "node:crypto";

// Load .env from the package directory, not cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = join(__dirname, "..");
dotenvConfig({ path: join(packageDir, ".env") });

interface Config {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export function getConfig(): Config {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  const missing: string[] = [];
  if (!apiKey) missing.push("X_API_KEY");
  if (!apiSecret) missing.push("X_API_SECRET");
  if (!accessToken) missing.push("X_ACCESS_TOKEN");
  if (!accessTokenSecret) missing.push("X_ACCESS_TOKEN_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Copy .env.example to .env and fill in your credentials.`
    );
  }

  return {
    apiKey: apiKey!,
    apiSecret: apiSecret!,
    accessToken: accessToken!,
    accessTokenSecret: accessTokenSecret!,
  };
}

export async function twitterApi(
  method: string,
  path: string,
  jsonBody?: Record<string, any>
): Promise<any> {
  try {
    const config = getConfig();

    const cleanPath = path.replace(/^\//, "");
    const fullUrl = `https://api.twitter.com/2/${cleanPath}`;

    const oauth = new OAuth({
      consumer: { key: config.apiKey, secret: config.apiSecret },
      signature_method: "HMAC-SHA1",
      hash_function(baseString: string, key: string) {
        return crypto
          .createHmac("sha1", key)
          .update(baseString)
          .digest("base64");
      },
    });

    const token = { key: config.accessToken, secret: config.accessTokenSecret };

    // For JSON POST bodies, only sign URL + method (body params are NOT included in OAuth signature)
    const requestData: OAuth.RequestOptions = { url: fullUrl, method: method.toUpperCase() };
    const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
      },
    };

    if (jsonBody && (method.toUpperCase() === "POST" || method.toUpperCase() === "PUT")) {
      fetchOptions.body = JSON.stringify(jsonBody);
    }

    const response = await fetch(fullUrl, fetchOptions);

    // Handle HTTP errors
    if (!response.ok) {
      // Rate limit handling
      if (response.status === 429) {
        const resetTime = response.headers.get("x-rate-limit-reset");
        if (resetTime) {
          const resetDate = new Date(parseInt(resetTime) * 1000);
          const waitSeconds = Math.ceil((resetDate.getTime() - Date.now()) / 1000);
          throw new Error(`Rate limited. Try again in ${waitSeconds > 0 ? waitSeconds : 60} seconds.`);
        } else {
          throw new Error("Rate limited. Try again in a few minutes.");
        }
      }

      // Auth errors
      if (response.status === 401 || response.status === 403) {
        throw new Error("Authentication failed. Run 'x-cli auth' to re-authenticate.");
      }

      // Other HTTP errors
      const errorText = await response.text().catch(() => "");
      throw new Error(`API request failed (${response.status}): ${errorText || response.statusText}`);
    }

    const json = await response.json().catch(() => ({}));

    // Handle API-level errors
    if (json.errors) {
      const errorMessages = json.errors.map((err: any) => 
        err.message || err.detail || `Error code: ${err.code || err.type || 'unknown'}`
      );
      throw new Error(errorMessages.join("; "));
    }

    return json;

  } catch (error) {
    // Network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Network error: Unable to connect to X API. Check your internet connection.");
    }
    
    // Re-throw other errors as-is (they're already formatted nicely)
    throw error;
  }
}

export async function uploadApi(
  method: string,
  formData: FormData
): Promise<any> {
  try {
    const config = getConfig();

    const fullUrl = "https://upload.twitter.com/1.1/media/upload.json";

    const oauth = new OAuth({
      consumer: { key: config.apiKey, secret: config.apiSecret },
      signature_method: "HMAC-SHA1",
      hash_function(baseString: string, key: string) {
        return crypto
          .createHmac("sha1", key)
          .update(baseString)
          .digest("base64");
      },
    });

    const token = { key: config.accessToken, secret: config.accessTokenSecret };

    const requestData: OAuth.RequestOptions = { url: fullUrl, method: method.toUpperCase() };
    const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        ...authHeader,
      },
      body: formData,
    };

    const response = await fetch(fullUrl, fetchOptions);

    // Handle HTTP errors
    if (!response.ok) {
      // Rate limit handling
      if (response.status === 429) {
        const resetTime = response.headers.get("x-rate-limit-reset");
        if (resetTime) {
          const resetDate = new Date(parseInt(resetTime) * 1000);
          const waitSeconds = Math.ceil((resetDate.getTime() - Date.now()) / 1000);
          throw new Error(`Rate limited. Try again in ${waitSeconds > 0 ? waitSeconds : 60} seconds.`);
        } else {
          throw new Error("Rate limited. Try again in a few minutes.");
        }
      }

      // Auth errors
      if (response.status === 401 || response.status === 403) {
        throw new Error("Authentication failed. Run 'x-cli auth' to re-authenticate.");
      }

      // Other HTTP errors
      const errorText = await response.text().catch(() => "");
      throw new Error(`Media upload failed (${response.status}): ${errorText || response.statusText}`);
    }

    const json = await response.json().catch(() => ({}));

    // Handle API-level errors
    if (json.errors) {
      const errorMessages = json.errors.map((err: any) => 
        err.message || err.detail || `Error code: ${err.code || err.type || 'unknown'}`
      );
      throw new Error(errorMessages.join("; "));
    }

    return json;

  } catch (error) {
    // Network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Network error: Unable to connect to X upload API. Check your internet connection.");
    }
    
    // Re-throw other errors as-is (they're already formatted nicely)
    throw error;
  }
}