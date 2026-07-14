import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const log = logger("content-moderation");

/**
 * Automated content-moderation provider interface (docs/abuse-handling.md).
 *
 * Sampled frames from active video streams are run through this interface.
 * Production implementations plug in here — e.g. AWS Rekognition Content
 * Moderation, Google Cloud Vision SafeSearch, Hive, or Microsoft PhotoDNA
 * (for known-CSAM hashing; PhotoDNA results must feed the escalation path,
 * not the ordinary queue). Select via CONTENT_MODERATION_PROVIDER.
 */
export interface FrameScanResult {
  flagged: boolean;
  /** Categories the provider matched, e.g. ["nudity"], ["violence"]. */
  categories: string[];
  /** Provider-normalized 0..1 confidence for the strongest category. */
  score: number;
  provider: string;
}

export interface ContentModerationProvider {
  name: string;
  scanFrame(frame: Buffer): Promise<FrameScanResult>;
}

/**
 * Dev stub: never calls out, flags nothing — except frames whose bytes start
 * with the ASCII marker "NSFW-TEST", which lets the end-to-end pipeline
 * (sample → scan → automated report → queue) be exercised deterministically
 * in development and tests without real unsafe content.
 */
export class StubContentModerationProvider implements ContentModerationProvider {
  name = "stub";

  async scanFrame(frame: Buffer): Promise<FrameScanResult> {
    const flagged = frame.subarray(0, 9).toString("utf8") === "NSFW-TEST";
    if (flagged) {
      log.warn("stub provider flagged a test-marked frame");
    }
    return {
      flagged,
      categories: flagged ? ["test-marker"] : [],
      score: flagged ? 0.99 : 0,
      provider: this.name,
    };
  }
}

export function contentModerationProvider(): ContentModerationProvider {
  switch (env().CONTENT_MODERATION_PROVIDER) {
    case "stub":
    default:
      return new StubContentModerationProvider();
  }
}
