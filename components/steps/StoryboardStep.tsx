"use client";

import { useEffect, useRef, useState } from "react";
import type { StoryboardCard } from "@/types";
import SceneCard from "@/components/ui/SceneCard";
import { generateImage } from "@/lib/generate-image";

// ---------------------------------------------------------------------------
// Shared generation loop hook
// Runs once on mount. Iterates cards sequentially, marks each active, awaits
// generateImage, then sets done/error. Never aborts on error — continues.
// ---------------------------------------------------------------------------
function useGenerationLoop(
  cards: StoryboardCard[],
  setCards: (cards: StoryboardCard[]) => void,
  enabled: boolean           // only start when true
): { done: boolean } {
  const [done, setDone] = useState(false);
  const cardsRef     = useRef<StoryboardCard[]>(cards);
  const setCardsRef  = useRef(setCards);
  const startedRef   = useRef(false);

  useEffect(() => { cardsRef.current = cards; },   [cards]);
  useEffect(() => { setCardsRef.current = setCards; }, [setCards]);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    async function runLoop() {
      for (let i = 0; i < cardsRef.current.length; i++) {
        if (cancelled) break;

        cardsRef.current = cardsRef.current.map((c, idx) =>
          idx === i ? { ...c, status: "active" as const } : c
        );
        setCardsRef.current([...cardsRef.current]);

        let dataUri: string | undefined;
        let errorMessage: string | undefined;
        try {
          dataUri = await generateImage(cardsRef.current[i].prompt);
        } catch (err) {
          errorMessage = err instanceof Error ? err.message : "Unknown error";
        }

        if (cancelled) break;

        cardsRef.current = cardsRef.current.map((c, idx) => {
          if (idx !== i) return c;
          return dataUri
            ? { ...c, status: "done" as const, dataUri }
            : { ...c, status: "error" as const, errorMessage };
        });
        setCardsRef.current([...cardsRef.current]);
      }
      if (!cancelled) setDone(true);
    }

    runLoop();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { done };
}

// ---------------------------------------------------------------------------
// Retry helper (card-level, independent of the main loop)
// ---------------------------------------------------------------------------
async function retryCard(
  cardId: string,
  cardsRef: React.MutableRefObject<StoryboardCard[]>,
  setCards: (cards: StoryboardCard[]) => void
) {
  const idx = cardsRef.current.findIndex((c) => c.scene.id === cardId);
  if (idx === -1) return;

  cardsRef.current = cardsRef.current.map((c, i) =>
    i === idx ? { ...c, status: "active" as const, errorMessage: undefined } : c
  );
  setCards([...cardsRef.current]);

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
  setCards([...cardsRef.current]);
}

// ---------------------------------------------------------------------------
// Download helpers
// ---------------------------------------------------------------------------
function downloadAll(cards: StoryboardCard[]) {
  cards.filter((c) => c.status === "done" && c.dataUri).forEach((card, i) => {
    setTimeout(() => {
      const slug = card.scene.title
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
      const a = document.createElement("a");
      a.href = card.dataUri!;
      a.download = `${card.scene.id}-${slug || "scene"}.png`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, i * 80);
  });
}

// ---------------------------------------------------------------------------
// Toggle pill component
// ---------------------------------------------------------------------------
function CompareToggle({
  view,
  onChange,
}: {
  view: "with" | "without";
  onChange: (v: "with" | "without") => void;
}) {
  return (
    <div className="flex items-center border border-border rounded overflow-hidden font-sans text-xs">
      <button
        type="button"
        onClick={() => onChange("with")}
        className={`px-4 py-2 transition-colors ${
          view === "with"
            ? "bg-ink text-canvas"
            : "bg-canvas text-ink-muted hover:text-ink"
        }`}
      >
        With character sheet
      </button>
      <div className="w-px h-full bg-border self-stretch" />
      <button
        type="button"
        onClick={() => onChange("without")}
        className={`px-4 py-2 transition-colors ${
          view === "without"
            ? "bg-ink text-canvas"
            : "bg-canvas text-ink-muted hover:text-ink"
        }`}
      >
        Without
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface StoryboardStepProps {
  cards: StoryboardCard[];
  onCardsChange: (cards: StoryboardCard[]) => void;
  cardsWithout: StoryboardCard[];
  onCardsWithoutChange: (cards: StoryboardCard[]) => void;
  onInitCardsWithout: () => void;
}

export default function StoryboardStep({
  cards,
  onCardsChange,
  cardsWithout,
  onCardsWithoutChange,
  onInitCardsWithout,
}: StoryboardStepProps) {
  const [view, setView] = useState<"with" | "without">("with");
  // "without" generation only starts when the toggle is first flipped
  const [withoutEnabled, setWithoutEnabled] = useState(false);

  // Stable refs for retry — one per card set
  const cardsRef        = useRef<StoryboardCard[]>(cards);
  const cardsWithoutRef = useRef<StoryboardCard[]>(cardsWithout);
  useEffect(() => { cardsRef.current = cards; },        [cards]);
  useEffect(() => { cardsWithoutRef.current = cardsWithout; }, [cardsWithout]);

  // Generation loops
  const { done: doneWith }    = useGenerationLoop(cards,        onCardsChange,        true);
  const { done: doneWithout } = useGenerationLoop(cardsWithout, onCardsWithoutChange, withoutEnabled);

  function handleToggle(v: "with" | "without") {
    setView(v);
    if (v === "without" && !withoutEnabled) {
      onInitCardsWithout();   // populate cardsWithout in WizardShell state
      setWithoutEnabled(true); // arm the loop — fires on next render when cardsWithout is non-empty
    }
  }

  const activeCards = view === "with" ? cards : cardsWithout;
  const activeDone  = view === "with" ? doneWith : doneWithout;
  const activeRef   = view === "with" ? cardsRef : cardsWithoutRef;
  const activeSet   = view === "with" ? onCardsChange : onCardsWithoutChange;

  const successCount = activeCards.filter((c) => c.status === "done").length;
  const activeIndex  = activeCards.findIndex((c) => c.status === "active");

  // Status label for the heading area
  const withStatus    = doneWith
    ? `${cards.filter((c) => c.status === "done").length}/${cards.length}`
    : cards.findIndex((c) => c.status === "active") !== -1
      ? `Generating ${cards.findIndex((c) => c.status === "active") + 1}/${cards.length}`
      : null;

  const withoutStatus = !withoutEnabled
    ? "not yet generated"
    : doneWithout
      ? `${cardsWithout.filter((c) => c.status === "done").length}/${cardsWithout.length}`
      : cardsWithout.findIndex((c) => c.status === "active") !== -1
        ? `Generating ${cardsWithout.findIndex((c) => c.status === "active") + 1}/${cardsWithout.length}`
        : null;

  return (
    <div className="flex flex-col gap-10">

      {/* ── Heading row ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2>Storyboard</h2>
          {/* Per-view status line */}
          <p className="mt-1 font-sans text-xs text-ink-muted">
            <span className={view === "with" ? "text-terra" : ""}>
              With: {withStatus ?? "starting…"}
            </span>
            <span className="mx-2 text-border select-none">|</span>
            <span className={view === "without" ? "text-terra" : ""}>
              Without: {withoutStatus}
            </span>
          </p>
        </div>
        <CompareToggle view={view} onChange={handleToggle} />
      </div>

      {/* ── Card grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Show a placeholder grid while "without" hasn't started */}
        {view === "without" && !withoutEnabled ? (
          Array.from({ length: cards.length }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-[3/2] w-full bg-border rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-border rounded" />
            </div>
          ))
        ) : (
          activeCards.map((card, i) => (
            <SceneCard
              key={card.scene.id}
              card={card}
              onRegenerate={(id) => retryCard(id, activeRef, activeSet)}
              activeIndex={card.status === "active" ? i + 1 : undefined}
              totalCount={card.status === "active" ? activeCards.length : undefined}
            />
          ))
        )}
      </div>

      {/* ── Completion banner ───────────────────────────── */}
      {activeDone && (
        <div className="border-t border-border pt-8 flex flex-col items-center gap-4">
          <div className="text-center flex flex-col gap-1">
            <p className="font-serif text-lg">
              {view === "with" ? "Storyboard complete." : "Comparison complete."}
            </p>
            <p className="font-sans text-sm text-ink-muted">
              {successCount} of {activeCards.length} image
              {activeCards.length !== 1 ? "s" : ""} generated successfully.
            </p>
          </div>
          {successCount > 0 && (
            <button
              type="button"
              onClick={() => downloadAll(activeCards)}
              className="btn-primary"
            >
              ↓ Download {view === "with" ? "storyboard" : "comparison"} images
            </button>
          )}
        </div>
      )}

    </div>
  );
}
