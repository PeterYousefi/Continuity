"use client";

import { useEffect, useState } from "react";
import type { StoryboardCard } from "@/types";

interface SceneCardProps {
  card: StoryboardCard;
  onRegenerate: (cardId: string) => void;
  /** 1-based position of this card in the active generation run (only when status==="active") */
  activeIndex?: number;
  /** Total number of cards in the run */
  totalCount?: number;
}

// 1536:1024 → 3:2 aspect ratio
const ASPECT = "aspect-[3/2]";

/** Derive a safe filename from the scene title */
function toFilename(title: string, id: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${id}-${slug || "scene"}.png`;
}

/** Ticks every second while the card is active; resets when it stops. */
function useElapsedSeconds(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  return elapsed;
}

export default function SceneCard({
  card,
  onRegenerate,
  activeIndex,
  totalCount,
}: SceneCardProps) {
  const { scene, status, dataUri, errorMessage } = card;
  const isActive = status === "active";
  const elapsed  = useElapsedSeconds(isActive);

  return (
    <div className="flex flex-col gap-2">
      {/* ── Pending ──────────────────────────────────────── */}
      {status === "pending" && (
        <div className={`${ASPECT} w-full bg-border rounded`} />
      )}

      {/* ── Active / generating ──────────────────────────── */}
      {status === "active" && (
        <div className={`${ASPECT} w-full bg-border rounded relative overflow-hidden`}>
          {/* Shimmer sweep */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-canvas/60 to-transparent" />
          {/* Status overlay — counter + elapsed */}
          <div className="absolute inset-0 flex flex-col items-start justify-end p-3 gap-0.5">
            {activeIndex !== undefined && totalCount !== undefined && (
              <span className="eyebrow text-ink leading-none">
                Generating {activeIndex} of {totalCount}
              </span>
            )}
            <span className="font-mono text-[11px] text-ink-muted leading-none tabular-nums">
              {elapsed}s
            </span>
          </div>
        </div>
      )}

      {/* ── Done ─────────────────────────────────────────── */}
      {status === "done" && dataUri && (
        <div className={`${ASPECT} w-full relative group rounded overflow-hidden border border-border`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUri}
            alt={scene.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Hover overlay — regenerate + download */}
          <div className="absolute bottom-2 right-2 flex gap-1.5
                          opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              type="button"
              onClick={() => onRegenerate(scene.id)}
              className="bg-canvas/90 border border-border rounded
                         px-2.5 py-1 font-sans text-xs text-ink
                         hover:border-ink leading-none transition-colors"
              title="Regenerate this frame"
            >
              ↺ Redo
            </button>
            <a
              href={dataUri}
              download={toFilename(scene.title, scene.id)}
              className="bg-canvas/90 border border-border rounded
                         px-2.5 py-1 font-sans text-xs text-ink
                         hover:border-ink leading-none transition-colors"
              title="Download image"
            >
              ↓ Save
            </a>
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────── */}
      {status === "error" && (
        <div
          className={`${ASPECT} w-full bg-terra-light border border-[#D99B85] rounded
                      flex flex-col items-center justify-center gap-3 p-5`}
        >
          <p className="text-terra font-sans text-xs text-center leading-relaxed">
            {errorMessage ?? "Generation failed."}
          </p>
          <button
            type="button"
            onClick={() => onRegenerate(scene.id)}
            className="btn-danger py-1.5 px-4 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Caption ──────────────────────────────────────── */}
      <p className="font-sans text-sm text-ink leading-snug truncate">{scene.title}</p>
    </div>
  );
}
