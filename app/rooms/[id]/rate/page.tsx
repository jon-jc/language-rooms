"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, buttonSecondaryClass, Card, inputClass } from "@/components/ui";

/** Post-session rating shown after leaving a room. Skippable. */
export default function RateRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (rating < 1) return;
    setBusy(true);
    await fetch(`/api/rooms/${id}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, feedback: feedback || undefined }),
    }).catch(() => {});
    router.push("/rooms");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-16 max-w-md">
      <Card className="space-y-4 text-center">
        <h1 className="text-lg font-bold">How was that session?</h1>
        <div className="flex justify-center gap-1 text-3xl">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              aria-label={`${star} stars`}
              className={star <= rating ? "text-amber-400" : "text-zinc-700 hover:text-zinc-500"}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Anything to add? (optional)"
          className={inputClass}
        />
        <div className="flex justify-center gap-2">
          <button
            onClick={submit}
            disabled={rating < 1 || busy}
            className={buttonClass}
          >
            Submit rating
          </button>
          <button onClick={() => router.push("/rooms")} className={buttonSecondaryClass}>
            Skip
          </button>
        </div>
      </Card>
    </div>
  );
}
