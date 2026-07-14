import { z } from "zod";

/**
 * Whiteboard domain rules (docs/modules/whiteboard.md).
 * The board is a 1600×1000 logical canvas; items are strokes or images.
 */

export const BOARD_WIDTH = 1600;
export const BOARD_HEIGHT = 1000;
export const MAX_STROKE_POINTS = 2000;
export const MAX_ITEMS_PER_BOARD = 500;
export const MAX_IMAGE_BYTES = 4_000_000; // ~4 MB before client downscaling

const coord = (max: number) => z.number().min(0).max(max);

export const strokeDataSchema = z.object({
  points: z
    .array(z.tuple([coord(BOARD_WIDTH), coord(BOARD_HEIGHT)]))
    .min(2)
    .max(MAX_STROKE_POINTS),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  width: z.number().min(1).max(24),
});

export type StrokeData = z.infer<typeof strokeDataSchema>;

export const imagePlacementSchema = z.object({
  x: coord(BOARD_WIDTH),
  y: coord(BOARD_HEIGHT),
  w: z.number().min(40).max(BOARD_WIDTH),
  h: z.number().min(40).max(BOARD_HEIGHT),
});

export type ImagePlacement = z.infer<typeof imagePlacementSchema>;

/** Image upload payload: placement + data URL (validated further server-side). */
export const imageUploadSchema = z.object({
  placement: imagePlacementSchema,
  // jpeg/png/webp data URL; byte size enforced after decoding
  image: z.string().max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 256),
});

/** What clients receive for each board item. */
export interface WhiteboardItemView {
  id: string;
  kind: "STROKE" | "IMAGE";
  author: string;
  /** STROKE: StrokeData. IMAGE: placement + url (never the storage path). */
  data: StrokeData | (ImagePlacement & { url: string });
}
