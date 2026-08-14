import type { StoryboardCard } from "@/types";

interface SceneCardProps {
  card: StoryboardCard;
  onRetry: (cardId: string) => void;
}

// 1536:1024 → 3:2 aspect ratio
const ASPECT = "aspect-[3/2]";

export default function SceneCard({ card, onRetry }: SceneCardProps) {
  const { scene, status, dataUri, errorMessage } = card;

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
          <div className="absolute inset-0 flex items-end p-3">
            <span className="eyebrow text-ink-muted">Generating…</span>
          </div>
        </div>
      )}

      {/* ── Done ─────────────────────────────────────────── */}
      {status === "done" && dataUri && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUri}
          alt={scene.title}
          className={`${ASPECT} w-full object-cover rounded border border-border`}
        />
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
            onClick={() => onRetry(scene.id)}
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
