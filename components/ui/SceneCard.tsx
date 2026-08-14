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
      {status === "pending" && (
        <div className={`${ASPECT} w-full bg-gray-200 rounded`} />
      )}

      {status === "active" && (
        <div className={`${ASPECT} w-full bg-gray-200 rounded relative animate-pulse`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-500 text-sm font-medium">Generating…</span>
          </div>
        </div>
      )}

      {status === "done" && dataUri && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUri}
          alt={scene.title}
          className={`${ASPECT} w-full object-cover rounded`}
        />
      )}

      {status === "error" && (
        <div
          className={`${ASPECT} w-full bg-red-50 border border-red-300 rounded flex flex-col items-center justify-center gap-2 p-4`}
        >
          <p className="text-red-700 text-sm text-center">
            {errorMessage ?? "An error occurred."}
          </p>
          <button
            onClick={() => onRetry(scene.id)}
            className="px-3 py-1 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <p className="text-sm font-medium text-gray-800 truncate">{scene.title}</p>
    </div>
  );
}
