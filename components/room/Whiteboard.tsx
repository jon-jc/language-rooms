"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDataChannel } from "@livekit/components-react";
import { decodeSignal, encodeSignal, WhiteboardSignal } from "@/components/room/signals";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  StrokeData,
  WhiteboardItemView,
} from "@/lib/whiteboard";

const COLORS = ["#f4f4f5", "#818cf8", "#34d399", "#fbbf24", "#fb7185", "#38bdf8"];
const WIDTHS = [3, 6, 12];

/**
 * Shared whiteboard: draw strokes and pin photos (textbook pages, menus…)
 * while talking. State is persisted server-side (late joiners load it) and
 * synced live over the "whiteboard" data channel. Photo uploads are scanned
 * by content moderation before they appear.
 */
export default function Whiteboard({
  roomId,
  canClear,
}: {
  roomId: string;
  canClear: boolean;
}) {
  const [items, setItems] = useState<WhiteboardItemView[]>([]);
  const [color, setColor] = useState(COLORS[1]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [draft, setDraft] = useState<StrokeData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { send } = useDataChannel("whiteboard", (msg) => {
    const signal = decodeSignal<WhiteboardSignal>(msg.payload);
    if (signal?.t !== "wb") return;
    if (signal.op === "clear") {
      setItems([]);
      return;
    }
    const item = signal.item as WhiteboardItemView;
    setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item]));
  });

  useEffect(() => {
    fetch(`/api/rooms/${roomId}/whiteboard`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setItems(data.items))
      .catch(() => {});
  }, [roomId]);

  const toBoard = useCallback((e: React.PointerEvent): [number, number] | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * BOARD_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * BOARD_HEIGHT;
    if (x < 0 || y < 0 || x > BOARD_WIDTH || y > BOARD_HEIGHT) return null;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    const pt = toBoard(e);
    if (!pt) return;
    drawing.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDraft({ points: [pt, pt], color, width });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawing.current) return;
    const pt = toBoard(e);
    if (!pt) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const last = prev.points[prev.points.length - 1];
      const dx = pt[0] - last[0];
      const dy = pt[1] - last[1];
      if (dx * dx + dy * dy < 9) return prev; // ignore sub-3px jitter
      return { ...prev, points: [...prev.points, pt] };
    });
  }

  async function onPointerUp() {
    if (!drawing.current) return;
    drawing.current = false;
    const stroke = draft;
    setDraft(null);
    if (!stroke || stroke.points.length < 2) return;

    const res = await fetch(`/api/rooms/${roomId}/whiteboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stroke }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setNotice(data?.error?.message ?? "Couldn't save that stroke.");
      return;
    }
    const { item } = await res.json();
    setItems((prev) => [...prev, item]);
    send(encodeSignal({ t: "wb", op: "add", item }), { reliable: true });
  }

  async function uploadPhoto(file: File) {
    setNotice(null);
    const dataUrl = await downscale(file);
    if (!dataUrl) {
      setNotice("Use a JPEG, PNG, or WebP image.");
      return;
    }
    const { w, h } = await imageSize(dataUrl);
    const scale = Math.min(600 / w, 500 / h, 1);
    const placement = {
      x: Math.round(BOARD_WIDTH / 2 - (w * scale) / 2),
      y: Math.round(BOARD_HEIGHT / 2 - (h * scale) / 2),
      w: Math.round(w * scale),
      h: Math.round(h * scale),
    };
    const res = await fetch(`/api/rooms/${roomId}/whiteboard/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placement, image: dataUrl }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setNotice(data?.error?.message ?? "Couldn't add that image.");
      return;
    }
    const { item } = await res.json();
    setItems((prev) => [...prev, item]);
    send(encodeSignal({ t: "wb", op: "add", item }), { reliable: true });
  }

  async function clearBoard() {
    const res = await fetch(`/api/rooms/${roomId}/whiteboard`, { method: "DELETE" });
    if (res.ok) {
      setItems([]);
      send(encodeSignal({ t: "wb", op: "clear" }), { reliable: true });
    }
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="glass flex items-center gap-1.5 rounded-xl px-2.5 py-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className={`h-5 w-5 rounded-full transition-transform ${
                color === c ? "scale-125 ring-2 ring-white/60" : "hover:scale-110"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="glass flex items-center gap-1.5 rounded-xl px-2.5 py-1.5">
          {WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setWidth(w)}
              aria-label={`Pen width ${w}`}
              className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                width === w ? "bg-white/20" : "hover:bg-white/10"
              }`}
            >
              <span
                className="rounded-full bg-zinc-200"
                style={{ width: w + 2, height: w + 2 }}
              />
            </button>
          ))}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="glass rounded-xl px-3.5 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10"
        >
          📷 Add photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadPhoto(file);
            e.target.value = "";
          }}
        />
        {canClear ? (
          <button
            onClick={clearBoard}
            className="glass ml-auto rounded-xl px-3.5 py-1.5 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/10"
          >
            Clear board
          </button>
        ) : null}
      </div>

      {notice ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
          {notice}
        </p>
      ) : null}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
        className="wb-surface min-h-0 flex-1 rounded-2xl border border-white/10"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {items.map((item) =>
          item.kind === "IMAGE" ? (
            <image
              key={item.id}
              href={(item.data as { url: string }).url}
              x={(item.data as { x: number }).x}
              y={(item.data as { y: number }).y}
              width={(item.data as { w: number }).w}
              height={(item.data as { h: number }).h}
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <path
              key={item.id}
              d={toPath((item.data as StrokeData).points)}
              stroke={(item.data as StrokeData).color}
              strokeWidth={(item.data as StrokeData).width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ),
        )}
        {draft ? (
          <path
            d={toPath(draft.points)}
            stroke={draft.color}
            strokeWidth={draft.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.9}
          />
        ) : null}
      </svg>
    </div>
  );
}

function toPath(points: Array<[number, number]>): string {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`)
    .join(" ");
}

/** Downscale to ≤1280px and re-encode as JPEG to keep uploads small. */
async function downscale(file: File): Promise<string | null> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return null;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  const scale = Math.min(1280 / bitmap.width, 1280 / bitmap.height, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 400, h: 300 });
    img.src = dataUrl;
  });
}
