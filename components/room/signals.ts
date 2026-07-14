/**
 * In-room realtime signals ride LiveKit's reliable data channels.
 * Two topics: "support" (notes) and "hand" (raise-hand in moderated rooms).
 */

export interface NotePayload {
  id: string;
  kind: "CORRECTION" | "VOCAB" | "LINK" | "NOTE";
  text: string;
  author: string;
  createdAt: string;
}

export type SupportSignal = { t: "note"; note: NotePayload };

export type HandSignal = {
  t: "hand";
  up: boolean;
  userId: string;
  name: string;
};

/** Whiteboard sync: add one item (already persisted) or clear the board. */
export type WhiteboardSignal =
  | { t: "wb"; op: "add"; item: unknown }
  | { t: "wb"; op: "clear" };

export function encodeSignal(
  signal: SupportSignal | HandSignal | WhiteboardSignal,
): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(signal));
}

export function decodeSignal<T>(payload: Uint8Array): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(payload)) as T;
  } catch {
    return null;
  }
}

export const NOTE_KIND_LABELS: Record<NotePayload["kind"], string> = {
  CORRECTION: "Correction",
  VOCAB: "Vocabulary",
  LINK: "Link",
  NOTE: "Note",
};
