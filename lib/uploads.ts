import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { MAX_IMAGE_BYTES } from "@/lib/whiteboard";

export interface ParsedUploadImage {
  buffer: Buffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sha256: string;
}

/** Parse and validate a user-uploaded image data URL (whiteboard photos). */
export function parseImageDataUrl(dataUrl: string): ParsedUploadImage | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    dataUrl,
  );
  if (!match) return null;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(match[2], "base64");
  } catch {
    return null;
  }
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;
  return {
    buffer,
    contentType: match[1] as ParsedUploadImage["contentType"],
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

const EXT: Record<ParsedUploadImage["contentType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Persist an upload to the user-content store (local dir in dev; the seam
 * for S3/GCS in production — storagePath is opaque to everything else).
 */
export async function storeUpload(
  roomId: string,
  upload: ParsedUploadImage,
): Promise<string> {
  const dir = path.join(env().UPLOAD_STORAGE_DIR, "whiteboard", roomId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(
    dir,
    `${upload.sha256.slice(0, 16)}-${Date.now()}.${EXT[upload.contentType]}`,
  );
  await writeFile(filePath, upload.buffer);
  return filePath;
}
