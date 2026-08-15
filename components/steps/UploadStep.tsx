"use client";

import { useState } from "react";
import FileUploadInput from "@/components/ui/FileUploadInput";
import { parseScenes } from "@/lib/parse-scenes";
import { MAX_SCENES } from "@/lib/constants";
import {
  SAMPLE_STORY,
  SAMPLE_STYLE_GUIDE,
  SAMPLE_CHARACTER_SHEET,
} from "@/lib/sample-documents";
import type { Scene } from "@/types";

interface UploadStepProps {
  storyText: string;
  styleGuide: string;
  characterSheet: string;
  setStoryText: (v: string) => void;
  setStyleGuide: (v: string) => void;
  setCharacterSheet: (v: string) => void;
  onAdvance: (scenes: Scene[], truncated: boolean) => void;
  /** Pre-populate the parsed scenes preview when navigating back to this step */
  initialScenes?: Scene[];
  initialTruncated?: boolean;
}

// Filename labels shown in the upload rows when sample data is loaded
const SAMPLE_FILENAMES = {
  story: "sample-story.txt",
  style: "sample-style-guide.txt",
  characters: "sample-character-sheet.txt",
} as const;

export default function UploadStep({
  storyText,
  styleGuide,
  characterSheet,
  setStoryText,
  setStyleGuide,
  setCharacterSheet,
  onAdvance,
  initialScenes,
  initialTruncated = false,
}: UploadStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Pre-populate from initialScenes when navigating back so the preview is still visible
  const [scenes, setScenes] = useState<Scene[] | null>(initialScenes ?? null);
  const [truncated, setTruncated] = useState(initialTruncated);

  // Track which filename label each slot displays (null = nothing loaded yet)
  const [storyFilename, setStoryFilename] = useState<string | null>(null);
  const [styleFilename, setStyleFilename] = useState<string | null>(null);
  const [charFilename, setCharFilename] = useState<string | null>(null);

  const allFilesLoaded =
    storyText.length > 0 && styleGuide.length > 0 && characterSheet.length > 0;

  function handleLoadSample() {
    setStoryText(SAMPLE_STORY);
    setStyleGuide(SAMPLE_STYLE_GUIDE);
    setCharacterSheet(SAMPLE_CHARACTER_SHEET);
    setStoryFilename(SAMPLE_FILENAMES.story);
    setStyleFilename(SAMPLE_FILENAMES.style);
    setCharFilename(SAMPLE_FILENAMES.characters);
    // Reset any previous parse result
    setScenes(null);
    setError(null);
  }

  // These wrappers exist only to update the text state; filename display
  // is handled separately via onFilenameChange on each FileUploadInput.
  function handleStoryChange(text: string) { setStoryText(text); }
  function handleStyleChange(text: string) { setStyleGuide(text); }
  function handleCharChange(text: string)  { setCharacterSheet(text); }

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

      {/* ── Section heading ──────────────────────────────── */}
      <div>
        <h2>Upload Documents</h2>
        <p className="mt-2 font-sans text-sm text-ink-muted">
          Three plain-text files (.txt or .md). All processing happens server-side —
          your files never leave this session.
        </p>
      </div>

      {/* ── Sample documents callout ─────────────────────── */}
      {!allFilesLoaded && (
        <div className="border border-border rounded p-5 flex flex-col gap-3 bg-canvas">
          <div className="flex flex-col gap-1">
            <p className="font-sans text-sm font-medium text-ink">
              Try with sample documents
            </p>
            <p className="font-sans text-xs text-ink-muted leading-relaxed">
              &ldquo;The Cartographer&rsquo;s Last Map&rdquo; — a five-scene period
              short with three named characters (Maren, Dorian, Luca), a
              Bergman-influenced style guide, and a complete scene list.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLoadSample}
            className="btn-ghost self-start"
          >
            Load sample documents
          </button>
        </div>
      )}

      {/* ── File inputs ──────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <p className="font-sans text-xs text-ink-muted">
          One frame will be generated per scene in your story, up to a maximum of{" "}
          {MAX_SCENES}.
        </p>
        <FileUploadInput
          label="Story / Scene List"
          value={storyFilename}
          onChange={handleStoryChange}
          onFilenameChange={setStoryFilename}
        />
        <FileUploadInput
          label="Visual Style Guide"
          value={styleFilename}
          onChange={handleStyleChange}
          onFilenameChange={setStyleFilename}
        />
        <FileUploadInput
          label="Character Sheet"
          value={charFilename}
          onChange={handleCharChange}
          onFilenameChange={setCharFilename}
        />
      </div>

      {/* ── Parse trigger ────────────────────────────────── */}
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

      {/* ── Error ────────────────────────────────────────── */}
      {error && (
        <div className="notice">
          {error}
        </div>
      )}

      {/* ── Parsed scenes preview ────────────────────────── */}
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
