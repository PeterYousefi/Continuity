"use client";

import type { Scene } from "@/types";

interface PromptEditorProps {
  scene: Scene;
  prompt: string;
  onChange: (newPrompt: string) => void;
}

export default function PromptEditor({ scene, prompt, onChange }: PromptEditorProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6 first:border-t-0 first:pt-0">
      {/* Scene identity */}
      <div className="flex items-baseline gap-3">
        <span className="eyebrow shrink-0">{scene.id.replace("scene-", "Scene ")}</span>
        <h3 className="font-serif text-base leading-snug">{scene.title}</h3>
      </div>
      <textarea
        id={`prompt-${scene.id}`}
        value={prompt}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="w-full border border-border rounded px-4 py-3 font-sans text-sm text-ink
                   bg-canvas resize-y leading-relaxed
                   focus:border-terra focus:outline-none transition-colors"
      />
    </div>
  );
}
