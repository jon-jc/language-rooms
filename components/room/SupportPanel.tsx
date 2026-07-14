"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDataChannel, useLocalParticipant } from "@livekit/components-react";
import {
  decodeSignal,
  encodeSignal,
  HandSignal,
  NOTE_KIND_LABELS,
  NotePayload,
  SupportSignal,
} from "@/components/room/signals";
import { inputClass } from "@/components/ui";
import { IconHand, IconMessage } from "@/components/icons";

const KIND_COLORS: Record<NotePayload["kind"], string> = {
  CORRECTION: "text-amber-300",
  VOCAB: "text-emerald-300",
  LINK: "text-sky-300",
  NOTE: "text-zinc-300",
};

/**
 * The secondary text channel: corrections, vocabulary, links. Notes are
 * persisted via the API (late joiners fetch history) and broadcast live over
 * the "support" data channel. Includes translation assist and, in moderated
 * rooms, the raise-hand control.
 */
export default function SupportPanel({
  roomId,
  isModerated,
  role,
  userId,
  displayName,
}: {
  roomId: string;
  isModerated: boolean;
  role: "HOST" | "MODERATOR" | "PARTICIPANT";
  userId: string;
  displayName: string;
}) {
  const [notes, setNotes] = useState<NotePayload[]>([]);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<NotePayload["kind"]>("NOTE");
  const [translateTo, setTranslateTo] = useState("");
  const [handUp, setHandUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { localParticipant } = useLocalParticipant();
  const canPublishMedia = localParticipant?.permissions?.canPublish ?? false;

  const { send: sendSupport } = useDataChannel("support", (msg) => {
    const signal = decodeSignal<SupportSignal>(msg.payload);
    if (signal?.t === "note") {
      setNotes((prev) =>
        prev.some((n) => n.id === signal.note.id) ? prev : [...prev, signal.note],
      );
    }
  });
  const { send: sendHand } = useDataChannel("hand");

  useEffect(() => {
    fetch(`/api/rooms/${roomId}/notes`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setNotes(data.notes))
      .catch(() => {});
  }, [roomId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [notes.length]);

  const postNote = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, text: trimmed }),
      });
      if (res.ok) {
        const { note } = await res.json();
        setNotes((prev) => [...prev, note]);
        sendSupport(encodeSignal({ t: "note", note }), { reliable: true });
        setText("");
      }
    } finally {
      setBusy(false);
    }
  }, [text, kind, roomId, busy, sendSupport]);

  async function translate() {
    const trimmed = text.trim();
    if (!trimmed || !translateTo) return;
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed, targetLanguage: translateTo }),
    });
    if (res.ok) {
      const data = await res.json();
      setText(data.translatedText);
    }
  }

  function toggleHand() {
    const up = !handUp;
    setHandUp(up);
    const signal: HandSignal = { t: "hand", up, userId, name: displayName };
    sendHand(encodeSignal(signal), { reliable: true });
  }

  return (
    <aside className="panel flex w-72 shrink-0 flex-col rounded-2xl">
      <div className="hairline-b flex items-center gap-2 px-3.5 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-[#8b85ff]">
          <IconMessage size={13} />
        </span>
        <div>
          <h2 className="text-[13px] font-semibold text-zinc-200">Support panel</h2>
          <p className="text-[10px] text-zinc-500">corrections · vocabulary · links</p>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {notes.length === 0 ? (
          <p className="text-xs text-zinc-600">
            No notes yet. Share a correction or a new word you learned.
          </p>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              className="rounded-xl border border-white/[0.05] bg-white/[0.03] px-2.5 py-2"
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${KIND_COLORS[n.kind]}`}>
                {NOTE_KIND_LABELS[n.kind]}
              </span>
              <p className="text-[13px] leading-snug text-zinc-200">{n.text}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{n.author}</p>
            </div>
          ))
        )}
      </div>

      <div className="hairline-t space-y-2 p-3">
        {isModerated && role === "PARTICIPANT" && !canPublishMedia ? (
          <button
            onClick={toggleHand}
            className={`flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold transition-all ${
              handUp
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                : "border border-white/15 bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]"
            }`}
          >
            <IconHand size={14} />
            {handUp ? "Hand raised — waiting…" : "Raise hand to speak"}
          </button>
        ) : null}
        <div className="flex gap-1">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as NotePayload["kind"])}
            className="input !w-auto !rounded-lg !px-2 !py-1 !text-xs"
          >
            {Object.entries(NOTE_KIND_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={translateTo}
            onChange={(e) => setTranslateTo(e.target.value)}
            className="input !w-auto !rounded-lg !px-2 !py-1 !text-xs"
            title="Translation assist"
          >
            <option value="">Translate…</option>
            <option value="en">→ English</option>
            <option value="es">→ Spanish</option>
            <option value="fr">→ French</option>
            <option value="de">→ German</option>
            <option value="ja">→ Japanese</option>
            <option value="zh">→ Chinese</option>
          </select>
          {translateTo ? (
            <button
              onClick={translate}
              className="btn btn-secondary !rounded-lg !px-2.5 !py-1 !text-xs"
            >
              Go
            </button>
          ) : null}
        </div>
        <div className="flex gap-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && postNote()}
            maxLength={500}
            placeholder="Share a correction, word, or link…"
            className={inputClass}
          />
          <button
            onClick={postNote}
            disabled={busy || !text.trim()}
            className="btn btn-primary !rounded-xl !px-3.5 !py-1 !text-[13px]"
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}
