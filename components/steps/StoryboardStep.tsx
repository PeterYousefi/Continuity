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
  // Refs so the loop always reads/calls the latest values without stale closures
  const cardsRef = useRef<StoryboardCard[]>(cards);
  const onCardsChangeRef = useRef(onCardsChange);

  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { onCardsChangeRef.current = onCardsChange; }, [onCardsChange]);

  // Sequential generation loop — runs once on mount
  useEffect(() => {
    let cancelled = false;

    async function runLoop() {
      for (let i = 0; i < cardsRef.current.length; i++) {
        if (cancelled) break;

        // Mark card active
        cardsRef.current = cardsRef.current.map((c, idx) =>
          idx === i ? { ...c, status: "active" as const } : c
        );
        onCardsChangeRef.current([...cardsRef.current]);

        let dataUri: string | undefined;
        let errorMessage: string | undefined;

        try {
          dataUri = await generateImage(cardsRef.current[i].prompt);
        } catch (err) {
          errorMessage = err instanceof Error ? err.message : "Unknown error";
        }

        // Don't update state if the component unmounted mid-flight
        if (cancelled) break;

        cardsRef.current = cardsRef.current.map((c, idx) => {
          if (idx !== i) return c;
          return dataUri
            ? { ...c, status: "done" as const, dataUri }
            : { ...c, status: "error" as const, errorMessage };
        });
        onCardsChangeRef.current([...cardsRef.current]);
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
    onCardsChangeRef.current([...cardsRef.current]);

    let dataUri: string | undefined;
    let errorMessage: string | undefined;
    try {
      dataUri = await generateImage(cardsRef.current[idx].prompt);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Unknown error";
    }

    cardsRef.current = cardsRef.current.map((c, i) => {
      if (i !== idx) return c;
      return dataUri
        ? { ...c, status: "done" as const, dataUri }
        : { ...c, status: "error" as const, errorMessage };
    });
    onCardsChangeRef.current([...cardsRef.current]);
  }

  const successCount = cards.filter((c) => c.status === "done").length;
  const activeIndex  = cards.findIndex((c) => c.status === "active");

  /** Trigger a staggered browser download for every completed card */
  function handleDownloadAll() {
    const done = cards.filter((c) => c.status === "done" && c.dataUri);
    done.forEach((card, i) => {
      setTimeout(() => {
        const slug = card.scene.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 60);
        const filename = `${card.scene.id}-${slug || "scene"}.png`;
        const a = document.createElement("a");
        a.href = card.dataUri!;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, i * 80);
    });
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Section heading + live status */}
      <div className="flex items-baseline justify-between">
        <h2>Storyboard</h2>
        {!done && activeIndex !== -1 && (
          <span className="eyebrow text-terra">
            Generating {activeIndex + 1} of {cards.length}
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
        <div className="border-t border-border pt-8 flex flex-col items-center gap-4">
          <div className="text-center flex flex-col gap-1">
            <p className="font-serif text-lg">Storyboard complete.</p>
            <p className="font-sans text-sm text-ink-muted">
              {successCount} of {cards.length} image{cards.length !== 1 ? "s" : ""} generated
              successfully.
            </p>
          </div>
          {successCount > 0 && (
            <button
              type="button"
              onClick={handleDownloadAll}
              className="btn-primary"
            >
              ↓ Download all images
            </button>
          )}
        </div>
      )}
    </div>
  );
}
