"use client";

import { useRef } from "react";
import type { Scene, StoryboardCard } from "@/types";
import { buildPrompt } from "@/lib/build-prompt";
import PromptEditor from "@/components/ui/PromptEditor";

interface PromptReviewStepProps {
  scenes: Scene[];
  styleGuide: string;
  characterSheet: string;
  cards: StoryboardCard[];
  onCardsChange: (cards: StoryboardCard[]) => void;
  onAdvance: () => void;
}

export default function PromptReviewStep({
  scenes,
  styleGuide,
  characterSheet,
  cards,
  onCardsChange,
  onAdvance,
}: PromptReviewStepProps) {
  // Initialise cards exactly once — only when the array is empty on first entry.
  const initialised = useRef(false);

  if (!initialised.current && cards.length === 0) {
    initialised.current = true;
    const initial: StoryboardCard[] = scenes.map((scene) => ({
      scene,
      prompt: buildPrompt(scene, styleGuide, characterSheet),
      status: "pending",
    }));
    onCardsChange(initial);
  }

  function handlePromptChange(index: number, newPrompt: string) {
    const updated = cards.map((card, i) =>
      i === index ? { ...card, prompt: newPrompt } : card
    );
    onCardsChange(updated);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Review Prompts</h2>
        <p className="mt-1 text-sm text-gray-500">
          Each prompt is pre-filled from your scene, style guide, and character
          sheet. Edit any prompt before generating.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {cards.map((card, index) => (
          <PromptEditor
            key={card.scene.id}
            scene={card.scene}
            prompt={card.prompt}
            onChange={(newPrompt) => handlePromptChange(index, newPrompt)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onAdvance}
        disabled={cards.length === 0}
        className="self-end rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Generate Storyboard →
      </button>
    </div>
  );
}
