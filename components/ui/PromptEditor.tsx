"use client";

import type { Scene } from "@/types";

interface PromptEditorProps {
  scene: Scene;
  prompt: string;
  onChange: (newPrompt: string) => void;
}

/**
 * Splits the structured prompt from buildPrompt() into its labelled sections.
 * Characters section is optional — buildPrompt() omits it when no character
 * sheet is provided. Falls back to null if the two required sections are absent,
 * which triggers the freeform textarea fallback.
 */
function parsePromptSections(prompt: string): {
  scene: string;
  style: string;
  characters: string | null;
} | null {
  const sceneMatch = prompt.match(
    /=== SCENE DESCRIPTION ===\n([\s\S]*?)(?=\n=== VISUAL STYLE DIRECTIVES ===|$)/
  );
  const styleMatch = prompt.match(
    /=== VISUAL STYLE DIRECTIVES ===\n([\s\S]*?)(?=\n=== CHARACTER DESCRIPTIONS ===|$)/
  );
  const charMatch = prompt.match(
    /=== CHARACTER DESCRIPTIONS ===\n([\s\S]*?)$/
  );

  // Only the scene + style sections are required for structured display
  if (!sceneMatch || !styleMatch) return null;

  return {
    scene:      sceneMatch[1].trim(),
    style:      styleMatch[1].trim(),
    characters: charMatch ? charMatch[1].trim() : null,
  };
}

export default function PromptEditor({ scene, prompt, onChange }: PromptEditorProps) {
  const sections = parsePromptSections(prompt);

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-8 first:border-t-0 first:pt-0">

      {/* ── Scene identity ─────────────────────────────────── */}
      <div className="flex items-baseline gap-3">
        <span className="eyebrow shrink-0">{scene.id.replace("scene-", "Scene ")}</span>
        <h3 className="font-serif text-base leading-snug">{scene.title}</h3>
      </div>

      {/* ── Structured preview (when prompt is still structured) ─ */}
      {sections ? (
        <div className="flex flex-col gap-0 border border-border rounded overflow-hidden font-mono text-xs leading-relaxed">

          {/* Scene section */}
          <div className="flex flex-col gap-1 px-4 py-3 bg-canvas border-b border-border">
            <span className="eyebrow text-[10px] tracking-widest">Scene Description</span>
            <p className="text-ink whitespace-pre-wrap">{sections.scene}</p>
          </div>

          {/* Style section */}
          <div className={`flex flex-col gap-1 px-4 py-3 bg-canvas ${sections.characters !== null ? "border-b border-border" : ""}`}>
            <span className="eyebrow text-[10px] tracking-widest">Visual Style</span>
            <p className="text-ink-muted whitespace-pre-wrap">{sections.style}</p>
          </div>

          {/* Character section — only shown when character sheet was provided */}
          {sections.characters !== null && (
            <div className="flex flex-col gap-1 px-4 py-3 bg-terra-light border-l-2 border-l-terra">
              <span className="eyebrow text-[10px] tracking-widest text-terra">
                Character Descriptions ✓
              </span>
              <p className="text-ink whitespace-pre-wrap">{sections.characters}</p>
            </div>
          )}

        </div>
      ) : (
        /* Freeform fallback — prompt has been manually edited beyond structure */
        <div className="flex flex-col gap-1">
          <span className="eyebrow text-[10px] tracking-widest text-ink-muted">
            Freeform prompt
          </span>
          <textarea
            id={`prompt-freeform-${scene.id}`}
            value={prompt}
            onChange={(e) => onChange(e.target.value)}
            rows={8}
            className="w-full border border-border rounded px-4 py-3
                       font-mono text-xs text-ink bg-canvas resize-y leading-relaxed
                       focus:border-terra focus:outline-none transition-colors"
          />
        </div>
      )}

      {/* ── Edit toggle: expand to raw textarea ────────────────── */}
      {sections && (
        <details className="group -mt-1">
          <summary className="eyebrow text-[10px] tracking-widest text-ink-muted
                              cursor-pointer select-none list-none
                              hover:text-terra transition-colors
                              [&::-webkit-details-marker]:hidden">
            {/* Hint: panels above are read-only; this is the edit entry-point */}
            <span className="group-open:hidden inline">↳ Edit prompt</span>
            <span className="group-open:inline hidden">↑ Collapse</span>
          </summary>
          <textarea
            id={`prompt-${scene.id}`}
            value={prompt}
            onChange={(e) => onChange(e.target.value)}
            rows={10}
            className="mt-3 w-full border border-border rounded px-4 py-3
                       font-mono text-xs text-ink bg-canvas resize-y leading-relaxed
                       focus:border-terra focus:outline-none transition-colors"
          />
        </details>
      )}

    </div>
  );
}
