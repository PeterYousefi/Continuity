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
    storyText.length > 0 && styleGuide.length > 0 && characterSheet.length > 0;

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
    <div className="flex flex-col gap-10">
      {/* Section heading */}
      <div>
        <h2>Upload Documents</h2>
        <p className="mt-2 font-sans text-sm text-ink-muted">
          Three plain-text files (.txt or .md). All processing happens server-side —
          your files never leave this session.
        </p>
      </div>

      {/* File inputs */}
      <div className="flex flex-col gap-4">
        <FileUploadInput label="Story / Scene List" onChange={setStoryText} />
        <FileUploadInput label="Visual Style Guide" onChange={setStyleGuide} />
        <FileUploadInput label="Character Sheet" onChange={setCharacterSheet} />
      </div>

      {/* Parse trigger */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleParse}
          disabled={!allFilesLoaded || loading}
          className="btn-primary"
        >
          {loading ? "Parsing scenes…" : "Parse Scenes"}
        </button>
        {!allFilesLoaded && (
          <span className="font-sans text-xs text-ink-muted">
            Upload all three files to continue
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="notice">
          {error}
        </div>
      )}

      {/* Parsed scenes preview */}
      {scenes && (
        <div className="flex flex-col gap-6">
          {truncated && (
            <div className="notice">
              Your story had more than {MAX_SCENES} scenes. Only the first{" "}
              {MAX_SCENES} are shown — edit your story document to reorder if needed.
            </div>
          )}

          <div className="flex flex-col gap-px border border-border rounded overflow-hidden">
            {scenes.map((scene, i) => (
              <div
                key={scene.id}
                className="flex gap-5 px-5 py-4 bg-canvas hover:bg-terra-light/30 transition-colors"
              >
                <span className="eyebrow pt-0.5 w-14 shrink-0">
                  Scene {i + 1}
                </span>
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="font-sans text-sm font-medium text-ink leading-snug">
                    {scene.title}
                  </p>
                  <p className="font-sans text-sm text-ink-muted leading-relaxed">
                    {scene.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="font-sans text-xs text-ink-muted">
              {scenes.length} scene{scenes.length !== 1 ? "s" : ""} found
            </span>
            <button
              type="button"
              onClick={() => onAdvance(scenes, truncated)}
              className="btn-primary"
            >
              Looks good →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
