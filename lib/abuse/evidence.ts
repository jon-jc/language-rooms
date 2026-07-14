import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const log = logger("evidence");

export const MAX_FRAMES_PER_REPORT = 3;
export const MAX_FRAME_BYTES = 1_500_000; // ~1.5 MB per JPEG frame

export interface ParsedFrame {
  buffer: Buffer;
  contentType: "image/jpeg" | "image/png";
  sha256: string;
}

/**
 * Parse and validate a client-captured evidence frame (data URL). Pure with
 * respect to the filesystem — unit-testable.
 */
export function parseFrameDataUrl(dataUrl: string): ParsedFrame | null {
  const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  const contentType = match[1] as ParsedFrame["contentType"];
  let buffer: Buffer;
  try {
    buffer = Buffer.from(match[2], "base64");
  } catch {
    return null;
  }
  if (buffer.length === 0 || buffer.length > MAX_FRAME_BYTES) return null;
  return {
    buffer,
    contentType,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

/**
 * Persist a frame to the evidence store.
 *
 * Dev: local directory (EVIDENCE_STORAGE_DIR, gitignored).
 * Production: replace with an object store (S3 + SSE, versioned,
 * lifecycle-locked bucket) behind this same function — the storagePath
 * recorded on EvidenceFrame is opaque to the rest of the system.
 */
export async function storeFrame(
  reportId: string,
  index: number,
  frame: ParsedFrame,
): Promise<string> {
  const dir = path.join(env().EVIDENCE_STORAGE_DIR, reportId);
  await mkdir(dir, { recursive: true });
  const ext = frame.contentType === "image/png" ? "png" : "jpg";
  const filePath = path.join(dir, `frame-${index}.${ext}`);
  await writeFile(filePath, frame.buffer);
  log.info({ reportId, filePath, sha256: frame.sha256 }, "evidence frame stored");
  return filePath;
}
