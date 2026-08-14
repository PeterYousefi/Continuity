"use client";

import { useState } from "react";
import FileUploadInput from "@/components/ui/FileUploadInput";
import { parseScenes } from "@/lib/parse-scenes";
import { MAX_SCENES } from "@/lib/constants";
import type { Scene } from "@/types";

interface UploadStepProps {
  storyText: string;
  styleGuide: string;
  characterSheet: string;
  setStoryText: (v: string) => void;
  setStyleGuide: (v: string) => void;
  setCharacterSheet: (v: string) => void;
  onAdvance: (scenes: Scene[], truncated: boolean) => void;
}

export default function UploadStep({
  storyText,
  styleGuide,
  characterSheet,
  setStoryText,
  setStyleGuide,
  setCharacterSheet,
  onAdvance,
}: UploadStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [truncated, setTruncated] = useState(false);

  const allFilesLoaded =
    storyText.length > 0 &&
    styleGuide.length > 0 &&
    characterSheet.length > 0;

  async function handleParse() {
    setLoading(true);
    setError(null);
    setScenes(null);
    try {
      const result = await parseScenes(storyText);
      setScenes(result.scenes);
      setTruncated(result.truncated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <FileUploadInput label="Story / Scene List" onChange={setStoryText} />
        <FileUploadInput label="Visual Style Guide" onChange={setStyleGuide} />
        <FileUploadInput label="Character Sheet" onChange={setCharacterSheet} />
      </div>

      <button
        type="button"
        onClick={handleParse}
        disabled={!allFilesLoaded || loading}
        className="self-start px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {loading ? "Parsing scenes…" : "Parse Scenes"}
      </button>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {scenes && (
        <div className="flex flex-col gap-4">
          {truncated && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Your story had more than {MAX_SCENES} scenes. Only the first{" "}
              {MAX_SCENES} are shown — edit your story document to reorder if
              needed.
            </div>
          )}

          <div className="flex flex-col gap-3">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className="border border-gray-200 rounded p-3 bg-gray-50"
              >
                <p className="text-sm font-semibold text-gray-800">
                  {scene.title}
                </p>
                <p className="text-sm text-gray-600 mt-1">{scene.description}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onAdvance(scenes, truncated)}
            className="self-start px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Looks good →
          </button>
        </div>
      )}
    </div>
  );
}
