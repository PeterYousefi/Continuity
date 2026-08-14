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
  // Keep a ref to the latest cards so the loop can read current state
  // without stale closures, while still updating via onCardsChange.
  const cardsRef = useRef<StoryboardCard[]>(cards);

  // Sync ref whenever parent updates cards
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  // Sequential generation loop — runs once on mount
  useEffect(() => {
    let cancelled = false;

    async function runLoop() {
      for (let i = 0; i < cardsRef.current.length; i++) {
        if (cancelled) break;

        // Set card to active
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
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          cardsRef.current = cardsRef.current.map((c, idx) =>
            idx === i
              ? { ...c, status: "error" as const, errorMessage }
              : c
          );
        }

        onCardsChange([...cardsRef.current]);
      }

      if (!cancelled) {
        setDone(true);
      }
    }

    runLoop();

    return () => {
      cancelled = true;
    };
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
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      cardsRef.current = cardsRef.current.map((c, i) =>
        i === idx
          ? { ...c, status: "error" as const, errorMessage }
          : c
      );
    }

    onCardsChange([...cardsRef.current]);
  }

  const successCount = cards.filter((c) => c.status === "done").length;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Storyboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <SceneCard key={card.scene.id} card={card} onRetry={handleRetry} />
        ))}
      </div>

      {done && (
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded text-center">
          <p className="text-gray-800 font-medium">Storyboard complete.</p>
          <p className="text-gray-500 text-sm mt-1">
            {successCount} of {cards.length} image
            {cards.length !== 1 ? "s" : ""} generated successfully.
          </p>
        </div>
      )}
    </div>
  );
}
