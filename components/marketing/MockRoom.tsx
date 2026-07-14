"use client";

import { useEffect, useState } from "react";
import { IconMic, IconPen, IconVideo, IconVolumeOff } from "@/components/icons";

/**
 * An animated, faithful mock of the in-room experience: video grid with a
 * cycling active speaker, live-quality details (mute badges, connection
 * bars), and the support panel receiving corrections. Pure CSS/React —
 * no media, no network.
 */

const PARTICIPANTS = [
  { name: "María", flag: "🇪🇸", tag: "host", gradient: "from-rose-500 to-orange-400" },
  { name: "Ken", flag: "🇯🇵", tag: null, gradient: "from-indigo-500 to-sky-400" },
  { name: "Ana", flag: "🇧🇷", tag: null, gradient: "from-emerald-500 to-teal-400" },
  { name: "Tom", flag: "🇬🇧", tag: "muted", gradient: "from-violet-500 to-fuchsia-400" },
];

const NOTES: Array<{ kind: string; color: string; text: string; author: string }> = [
  { kind: "CORRECTION", color: "text-amber-300", text: "“fui al cine” — not “fui a el cine” (a + el = al)", author: "María" },
  { kind: "VOCAB", color: "text-emerald-300", text: "madrugar — to get up very early", author: "Ana" },
  { kind: "CORRECTION", color: "text-amber-300", text: "say “estoy aprendiendo”, not “estoy aprendo”", author: "María" },
  { kind: "VOCAB", color: "text-emerald-300", text: "¡ojalá! — hopefully / if only", author: "Ken" },
];

export default function MockRoom() {
  const [speaker, setSpeaker] = useState(0);
  const [noteCount, setNoteCount] = useState(2);

  useEffect(() => {
    // Speaker changes feel conversational; skip the muted participant.
    const speakTimer = setInterval(() => {
      setSpeaker((s) => {
        let next = (s + 1) % PARTICIPANTS.length;
        if (PARTICIPANTS[next].tag === "muted") next = (next + 1) % PARTICIPANTS.length;
        return next;
      });
    }, 2800);
    const noteTimer = setInterval(
      () => setNoteCount((n) => (n >= NOTES.length ? 2 : n + 1)),
      4200,
    );
    return () => {
      clearInterval(speakTimer);
      clearInterval(noteTimer);
    };
  }, []);

  return (
    <div className="glass glow mx-auto w-full max-w-4xl rounded-3xl p-3 sm:p-4">
      {/* Window chrome */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="live-dot h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="text-sm font-semibold text-white">Spanish – B1 · Café talk ☕</span>
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400 sm:inline">
            🇪🇸 Spanish · B1
          </span>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
          ● LIVE — 4 inside
        </span>
      </div>

      <div className="flex gap-3">
        {/* Video grid */}
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2.5">
          {PARTICIPANTS.map((p, i) => {
            const isSpeaking = i === speaker;
            return (
              <div
                key={p.name}
                className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br ${p.gradient} ${
                  isSpeaking ? "speaking" : ""
                } transition-all duration-300`}
              >
                {/* “Camera” — soft persona silhouette */}
                <div className="absolute inset-0 bg-black/25" />
                <div className="absolute left-1/2 top-[30%] h-14 w-14 -translate-x-1/2 rounded-full bg-white/25 backdrop-blur-sm sm:h-16 sm:w-16" />
                <div className="absolute left-1/2 top-[62%] h-16 w-24 -translate-x-1/2 rounded-t-full bg-white/20 backdrop-blur-sm sm:w-28" />

                {/* Speaking bars */}
                {isSpeaking ? (
                  <div className="absolute right-2 top-2 flex h-4 items-end gap-0.5">
                    <span className="voice-bar h-full w-1 rounded bg-emerald-300" />
                    <span className="voice-bar h-full w-1 rounded bg-emerald-300" />
                    <span className="voice-bar h-full w-1 rounded bg-emerald-300" />
                  </div>
                ) : null}

                {/* Name bar */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-1.5 pt-5">
                  <span className="text-xs font-semibold text-white">
                    {p.flag} {p.name}
                    {p.tag === "host" ? (
                      <span className="ml-1.5 rounded bg-amber-400/90 px-1 text-[9px] font-bold text-black">
                        HOST
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-1">
                    {p.tag === "muted" ? (
                      <span className="text-zinc-300" title="muted"><IconVolumeOff size={11} /></span>
                    ) : null}
                    {/* Connection quality */}
                    <span className="flex items-end gap-px" aria-hidden>
                      <span className="h-1 w-0.5 rounded bg-emerald-300" />
                      <span className="h-1.5 w-0.5 rounded bg-emerald-300" />
                      <span className={`h-2 w-0.5 rounded ${i === 3 ? "bg-white/25" : "bg-emerald-300"}`} />
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Support panel */}
        <div className="hidden w-52 shrink-0 flex-col rounded-2xl border border-white/8 bg-black/30 sm:flex">
          <div className="border-b border-white/8 px-3 py-2">
            <p className="text-[11px] font-semibold text-zinc-200">Support panel</p>
            <p className="text-[9px] text-zinc-500">corrections · vocabulary</p>
          </div>
          <div className="flex-1 space-y-1.5 overflow-hidden p-2">
            {NOTES.slice(0, noteCount).map((note, i) => (
              <div
                key={`${note.text}-${i}`}
                className={`rounded-lg bg-white/5 px-2 py-1.5 ${i === noteCount - 1 ? "note-in" : ""}`}
              >
                <span className={`text-[8px] font-bold uppercase ${note.color}`}>
                  {note.kind}
                </span>
                <p className="text-[10px] leading-snug text-zinc-200">{note.text}</p>
                <p className="text-[8px] text-zinc-500">{note.author}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-white/8 p-2">
            <div className="rounded-lg bg-white/5 px-2 py-1 text-[9px] text-zinc-500">
              Share a correction…
            </div>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {[IconMic, IconVideo, IconPen].map((Icon, i) => (
          <span
            key={i}
            className="flex h-9 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            <Icon size={15} />
          </span>
        ))}
        <span className="flex h-9 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-rose-600 px-4 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          Leave
        </span>
      </div>
    </div>
  );
}
