# Module: shared whiteboard

Each room has one collaborative whiteboard for studying together: freehand
strokes plus **photo uploads** (textbook pages, menus, signs, handwriting)
placed on a 1600×1000 logical canvas.

## Sync model

- **Persistence**: every committed item is a `WhiteboardItem` row
  (STROKE with points/color/width, or IMAGE with placement + storage path).
  Late joiners `GET /api/rooms/:id/whiteboard` for the current state.
- **Live updates**: after persisting, the author broadcasts the item on the
  LiveKit `whiteboard` data-channel topic; peers merge by item id
  (idempotent). Clears broadcast a `clear` op.
- Strokes are committed on pointer-up (the in-progress stroke renders
  locally); points are jitter-filtered client-side and capped at 2,000.

## Photo uploads & safety

Uploads go through `POST /api/rooms/:id/whiteboard/image`:

1. participant-only + rate limit (12 uploads / 10 min per user);
2. client downscales to ≤1280px JPEG; server accepts JPEG/PNG/WebP ≤ 4 MB
   (`parseImageDataUrl`, unit-tested — SVG and GIF are rejected);
3. **the content-moderation provider scans the image before it is stored or
   shown** — the same pipeline as sampled video frames
   (docs/abuse-handling.md). Flagged uploads are refused with a deliberately
   vague error and generate an automated report (with the image as
   evidence) in the moderation queue;
4. accepted bytes live in the user-content store (`UPLOAD_STORAGE_DIR` in
   dev; S3-shaped seam) and are served only to room participants via
   `GET /api/rooms/:id/whiteboard/file/:itemId` — the storage path never
   leaves the server.

## Permissions

| action | who |
| --- | --- |
| draw, upload | any active participant |
| clear board | host / room moderator (audit-logged as `room.whiteboard_cleared`) |

Boards cap at 500 items; the limit surfaces as a friendly "clear it to keep
drawing" error.
