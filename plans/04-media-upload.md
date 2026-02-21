# Plan 04: Media Upload

## Goal

Implement `x-cli media upload <path>` for uploading images and videos. This is needed before tweet creation (Plan 05) since tweets with media require uploading first, then attaching the media_id.

## Context

Read `AGENTS.md` in the project root.

The media upload uses the **Twitter v1.1 Upload API** (NOT v2). It uses a chunked upload flow:
1. **INIT** — declare file size and type, get `media_id`
2. **APPEND** — upload file in chunks (5MB each)
3. **FINALIZE** — signal upload complete
4. **STATUS** (video only) — poll until processing completes

## Prerequisites

- Plan 01 completed (config + OAuth signing works)
- Plan 02 completed (auth works)

## Steps

### 1. Implement `src/media.ts`

Port from `~/tools/x-ads-cli/src/media.ts`. The implementation is nearly identical:

- `uploadMedia(filePath: string): Promise<string>` — returns the `media_id_string`
- Supports: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.mp4`
- Chunked upload: 5MB chunks
- For video: poll STATUS endpoint until `state === "succeeded"`
- Uses OAuth 1.0a signing against `https://upload.twitter.com/1.1/media/upload.json`

**Key difference from x-ads-cli:** The x-ads-cli media.ts returns `media_key`. For organic tweets via v2 API, you need the `media_id_string` (v2 tweet creation uses `media.media_ids` array). Return both and let the caller decide.

### 2. Implement `src/commands/media.ts`

Export `uploadMediaCommand(filePath: string)`:
- Call `uploadMedia(filePath)`
- Output: `outputOk({ media_id: "...", media_key: "..." })`
- Pretty mode: `✅ Uploaded: media_id=... media_key=...`

### 3. Wire up in `src/cli.ts`

```typescript
const media = program.command("media").description("Media upload utilities");
media
  .command("upload")
  .description("Upload a media file and print the media_id")
  .argument("<path>", "Path to media file (.jpg, .png, .gif, .webp, .mp4)")
  .action(async (filePath: string) => {
    const { uploadMediaCommand } = await import("./commands/media.js");
    await uploadMediaCommand(filePath);
  });
```

### 4. Build and test

```bash
npm run build
x-cli media upload ./test-image.jpg
x-cli media upload ./test-video.mp4   # if available
```

## Deliverables

- `src/media.ts` — chunked upload logic
- `src/commands/media.ts` — CLI command wrapper
- Media command wired up in `src/cli.ts`

## Success Criteria

- `x-cli media upload photo.jpg` returns a valid `media_id`
- Video uploads poll STATUS until complete
- Unsupported file types get a clear error
- File-not-found gets a clear error
