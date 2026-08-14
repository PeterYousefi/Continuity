"use client";

import { useEffect, useRef } from "react";
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
  // Initialise cards once in an effect, not during render, to avoid
  // calling a state setter synchronously during the render pass.
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current || cards.length > 0) return;
    initialised.current = true;
    const initial: StoryboardCard[] = scenes.map((scene) => ({
      scene,
      prompt: buildPrompt(scene, styleGuide, characterSheet),
      status: "pending",
    }));
    onCardsChange(initial);
    // Only run on mount — scenes/styleGuide/characterSheet are stable by this point
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* Prompt editors */}
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
