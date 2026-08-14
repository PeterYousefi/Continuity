"use client";

import type { Scene } from "@/types";

interface PromptEditorProps {
  scene: Scene;
  prompt: string;
  onChange: (newPrompt: string) => void;
}

export default function PromptEditor({
  scene,
  prompt,
  onChange,
}: PromptEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={`prompt-${scene.id}`}
        className="text-sm font-semibold text-gray-800"
      >
        {scene.title}
      </label>
      <textarea
        id={`prompt-${scene.id}`}
        value={prompt}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 resize-vertical focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
