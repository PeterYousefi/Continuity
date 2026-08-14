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
    <div className="flex flex-col gap-10">
      {/* Section heading */}
      <div>
        <h2>Review Prompts</h2>
        <p className="mt-2 font-sans text-sm text-ink-muted">
          Each prompt is pre-filled from your scene, style guide, and character sheet.
          Edit any prompt before spending image credits.
        </p>
      </div>

      {/* Prompt editors — separated by hairline rules via first: variant in PromptEditor */}
      <div className="flex flex-col">
        {cards.map((card, index) => (
          <PromptEditor
            key={card.scene.id}
            scene={card.scene}
            prompt={card.prompt}
            onChange={(newPrompt) => handlePromptChange(index, newPrompt)}
          />
        ))}
      </div>

      {/* Advance */}
      <div className="flex justify-end pt-2 border-t border-border">
        <button
          type="button"
          onClick={onAdvance}
          disabled={cards.length === 0}
          className="btn-primary"
        >
          Generate Storyboard →
        </button>
      </div>
    </div>
  );
}
