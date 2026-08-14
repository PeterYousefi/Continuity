"use client";

import { useEffect, useRef, useState } from "react";
import type { StoryboardCard } from "@/types";
import SceneCard from "@/components/ui/SceneCard";
import { generateImage } from "@/lib/generate-image";

interface StoryboardStepProps {
  cards: StoryboardCard[];
  onCardsChange: (cards: StoryboardCard[]) => void;
}

export default function StoryboardStep({ cards, onCardsChange }: StoryboardStepProps) {
  const [done, setDone] = useState(false);
  // Keep a ref to the latest cards so the loop avoids stale closures
  const cardsRef = useRef<StoryboardCard[]>(cards);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  // Sequential generation loop — runs once on mount
  useEffect(() => {
    let cancelled = false;

    async function runLoop() {
      for (let i = 0; i < cardsRef.current.length; i++) {
        if (cancelled) break;

        cardsRef.current = cardsRef.current.map((c, idx) =>
          idx === i ? { ...c, status: "active" as const } : c
        );
        onCardsChange([...cardsRef.current]);

        try {
          const dataUri = await generateImage(cardsRef.current[i].prompt);
          if (cancelled) break;
          cardsRef.current = cardsRef.current.map((c, idx) =>
            idx === i ? { ...c, status: "done" as const, dataUri } : c
          );
        } catch (err) {
          if (cancelled) break;
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          cardsRef.current = cardsRef.current.map((c, idx) =>
            idx === i ? { ...c, status: "error" as const, errorMessage } : c
          );
        }

        onCardsChange([...cardsRef.current]);
      }

      if (!cancelled) setDone(true);
    }

    runLoop();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRetry(cardId: string) {
    const idx = cardsRef.current.findIndex((c) => c.scene.id === cardId);
    if (idx === -1) return;

    cardsRef.current = cardsRef.current.map((c, i) =>
      i === idx ? { ...c, status: "active" as const, errorMessage: undefined } : c
    );
    onCardsChange([...cardsRef.current]);

    try {
      const dataUri = await generateImage(cardsRef.current[idx].prompt);
      cardsRef.current = cardsRef.current.map((c, i) =>
        i === idx ? { ...c, status: "done" as const, dataUri } : c
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      cardsRef.current = cardsRef.current.map((c, i) =>
        i === idx ? { ...c, status: "error" as const, errorMessage } : c
      );
    }

    onCardsChange([...cardsRef.current]);
  }

  const successCount = cards.filter((c) => c.status === "done").length;
  const activeCard = cards.find((c) => c.status === "active");

  return (
    <div className="flex flex-col gap-10">
      {/* Section heading + live status */}
      <div className="flex items-baseline justify-between">
        <h2>Storyboard</h2>
        {!done && activeCard && (
          <span className="eyebrow text-terra">
            Generating {cards.findIndex((c) => c.status === "active") + 1} of {cards.length}
          </span>
        )}
        {done && (
          <span className="eyebrow text-ink-muted">
            {successCount} / {cards.length} complete
          </span>
        )}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <SceneCard key={card.scene.id} card={card} onRetry={handleRetry} />
        ))}
      </div>

      {/* Completion banner */}
      {done && (
        <div className="border-t border-border pt-8 text-center flex flex-col gap-1">
          <p className="font-serif text-lg">Storyboard complete.</p>
          <p className="font-sans text-sm text-ink-muted">
            {successCount} of {cards.length} image{cards.length !== 1 ? "s" : ""} generated
            successfully.
          </p>
        </div>
      )}
    </div>
  );
}
