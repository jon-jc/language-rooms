import { describe, expect, it } from "vitest";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  imageUploadSchema,
  strokeDataSchema,
} from "@/lib/whiteboard";
import { parseImageDataUrl } from "@/lib/uploads";
import { MAX_IMAGE_BYTES } from "@/lib/whiteboard";

describe("strokeDataSchema", () => {
  const stroke = {
    points: [
      [10, 10],
      [50, 80],
      [120, 90],
    ],
    color: "#818cf8",
    width: 6,
  };

  it("accepts a valid stroke", () => {
    expect(strokeDataSchema.safeParse(stroke).success).toBe(true);
  });

  it("rejects points outside the board", () => {
    expect(
      strokeDataSchema.safeParse({
        ...stroke,
        points: [
          [10, 10],
          [BOARD_WIDTH + 1, 10],
        ],
      }).success,
    ).toBe(false);
    expect(
      strokeDataSchema.safeParse({
        ...stroke,
        points: [
          [10, 10],
          [10, BOARD_HEIGHT + 1],
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects single-point strokes, bad colors, and absurd widths", () => {
    expect(strokeDataSchema.safeParse({ ...stroke, points: [[1, 1]] }).success).toBe(false);
    expect(strokeDataSchema.safeParse({ ...stroke, color: "red" }).success).toBe(false);
    expect(strokeDataSchema.safeParse({ ...stroke, color: "#12345" }).success).toBe(false);
    expect(strokeDataSchema.safeParse({ ...stroke, width: 0 }).success).toBe(false);
    expect(strokeDataSchema.safeParse({ ...stroke, width: 200 }).success).toBe(false);
  });

  it("caps stroke length", () => {
    const tooMany = Array.from({ length: 2001 }, (_, i) => [i % 100, i % 100]);
    expect(strokeDataSchema.safeParse({ ...stroke, points: tooMany }).success).toBe(false);
  });
});

describe("imageUploadSchema placement", () => {
  const valid = {
    placement: { x: 100, y: 100, w: 400, h: 300 },
    image: "data:image/jpeg;base64,AAAA",
  };

  it("accepts valid placement", () => {
    expect(imageUploadSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects placements off the board or too small", () => {
    expect(
      imageUploadSchema.safeParse({
        ...valid,
        placement: { x: -5, y: 0, w: 400, h: 300 },
      }).success,
    ).toBe(false);
    expect(
      imageUploadSchema.safeParse({
        ...valid,
        placement: { x: 0, y: 0, w: 10, h: 10 },
      }).success,
    ).toBe(false);
  });
});

describe("parseImageDataUrl", () => {
  const tinyPngB64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  it("parses jpeg, png, and webp data URLs", () => {
    expect(parseImageDataUrl(`data:image/png;base64,${tinyPngB64}`)).not.toBeNull();
    expect(parseImageDataUrl(`data:image/jpeg;base64,${tinyPngB64}`)).not.toBeNull();
    expect(parseImageDataUrl(`data:image/webp;base64,${tinyPngB64}`)).not.toBeNull();
  });

  it("rejects other content types and malformed payloads", () => {
    expect(parseImageDataUrl(`data:image/gif;base64,${tinyPngB64}`)).toBeNull();
    expect(parseImageDataUrl(`data:image/svg+xml;base64,${tinyPngB64}`)).toBeNull();
    expect(parseImageDataUrl("not-a-data-url")).toBeNull();
    expect(parseImageDataUrl("data:image/png;base64,!!!!")).toBeNull();
  });

  it("rejects oversized images", () => {
    const big = Buffer.alloc(MAX_IMAGE_BYTES + 1).toString("base64");
    expect(parseImageDataUrl(`data:image/png;base64,${big}`)).toBeNull();
  });

  it("computes a stable sha256", () => {
    const a = parseImageDataUrl(`data:image/png;base64,${tinyPngB64}`);
    const b = parseImageDataUrl(`data:image/png;base64,${tinyPngB64}`);
    expect(a?.sha256).toBe(b?.sha256);
    expect(a?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});
