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
    <aside className="glass flex w-72 shrink-0 flex-col rounded-2xl">
      <div className="border-b border-white/8 px-3 py-2">
        <h2 className="text-sm font-semibold text-zinc-200">Support panel</h2>
        <p className="text-xs text-zinc-500">Corrections · vocabulary · links</p>
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {notes.length === 0 ? (
          <p className="text-xs text-zinc-600">
            No notes yet. Share a correction or a new word you learned.
          </p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-lg bg-zinc-950 px-2 py-1.5">
              <span className={`text-[10px] font-semibold uppercase ${KIND_COLORS[n.kind]}`}>
                {NOTE_KIND_LABELS[n.kind]}
              </span>
              <p className="text-sm text-zinc-200">{n.text}</p>
              <p className="text-[10px] text-zinc-500">{n.author}</p>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2 border-t border-white/8 p-3">
        {isModerated && role === "PARTICIPANT" && !canPublishMedia ? (
          <button
            onClick={toggleHand}
            className={`w-full rounded-lg px-3 py-1.5 text-sm font-semibold ${
              handUp
                ? "bg-amber-600 text-white"
                : "border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            {handUp ? "✋ Hand raised — waiting…" : "✋ Raise hand to speak"}
          </button>
        ) : null}
        <div className="flex gap-1">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as NotePayload["kind"])}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-1 py-1 text-xs"
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
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-1 py-1 text-xs"
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
              className="rounded-lg border border-zinc-700 px-2 text-xs text-zinc-300 hover:bg-zinc-800"
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
            className="rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}
