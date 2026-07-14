"use client";

import { useEffect, useState } from "react";

const GREETINGS: Array<{ word: string; lang: string }> = [
  { word: "Hola", lang: "Spanish" },
  { word: "Bonjour", lang: "French" },
  { word: "こんにちは", lang: "Japanese" },
  { word: "Hallo", lang: "German" },
  { word: "안녕하세요", lang: "Korean" },
  { word: "Ciao", lang: "Italian" },
  { word: "Olá", lang: "Portuguese" },
  { word: "مرحبا", lang: "Arabic" },
  { word: "你好", lang: "Chinese" },
  { word: "Привіт", lang: "Ukrainian" },
];

/** Cycles a greeting through ten languages, synced to the CSS animation. */
export default function RotatingGreeting() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % GREETINGS.length),
      2600, // matches .greet-word's animation duration
    );
    return () => clearInterval(timer);
  }, []);

  const current = GREETINGS[index];

  return (
    <span className="inline-flex flex-col items-center">
      <span
        key={current.word}
        className="greet-word gradient-text inline-block"
        style={{ perspective: "400px" }}
      >
        {current.word}
      </span>
      <span className="mt-1 text-xs font-normal tracking-widest text-zinc-500 uppercase">
        {current.lang}
      </span>
    </span>
  );
}
