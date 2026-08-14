"use client";

import { useState } from "react";
import UploadStep from "@/components/steps/UploadStep";
import PromptReviewStep from "@/components/steps/PromptReviewStep";
import StoryboardStep from "@/components/steps/StoryboardStep";
import type { Scene, StoryboardCard } from "@/types";
import { buildPrompt } from "@/lib/build-prompt";

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: "Upload & Parse",
  2: "Review Prompts",
  3: "Generate",
};

export default function WizardShell() {
  const [step, setStep] = useState<Step>(1);

  // Raw document strings
  const [storyText, setStoryText] = useState("");
  const [styleGuide, setStyleGuide] = useState("");
  const [characterSheet, setCharacterSheet] = useState("");

  // Parse results
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [truncated, setTruncated] = useState(false);

  // Step 2 / 3 cards — "with character sheet" set
  const [cards, setCards] = useState<StoryboardCard[]>([]);

  // Step 3 comparison — "without character sheet" set (empty until first toggle)
  const [cardsWithout, setCardsWithout] = useState<StoryboardCard[]>([]);

  function handleUploadAdvance(parsedScenes: Scene[], wasTruncated: boolean) {
    setScenes(parsedScenes);
    setTruncated(wasTruncated);
    setStep(2);
  }

  // Build the "without" card set on demand (called by StoryboardStep on first toggle)
  function handleInitCardsWithout() {
    if (cardsWithout.length > 0) return; // already initialised
    const initial: StoryboardCard[] = scenes.map((scene) => ({
      scene,
      prompt: buildPrompt(scene, styleGuide), // no characterSheet
      status: "pending",
    }));
    setCardsWithout(initial);
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Page header */}
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-8 py-5 flex items-baseline justify-between">
          <h1 className="font-serif text-xl tracking-tight">Storyboard</h1>
          <span className="eyebrow">AI Story Visualiser</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Step indicator */}
        <nav className="flex items-center gap-0 mb-14" aria-label="Wizard steps">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center">
              <div className="flex items-center gap-3">
                {/* Step number bubble */}
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium border transition-colors ${
                    s === step
                      ? "bg-ink border-ink text-canvas"
                      : s < step
                      ? "bg-terra border-terra text-canvas"
                      : "bg-canvas border-border text-ink-muted"
                  }`}
                >
                  {s < step ? "✓" : s}
                </div>
                {/* Step label */}
                <span
                  className={`font-sans text-xs tracking-wide uppercase ${
                    s === step ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {STEP_LABELS[s]}
                </span>
              </div>
              {/* Connector */}
              {s < 3 && (
                <div className={`w-10 h-px mx-3 ${s < step ? "bg-terra" : "bg-border"}`} />
              )}
            </div>
          ))}
        </nav>

        {/* Step content */}
        {step === 1 && (
          <UploadStep
            storyText={storyText}
            styleGuide={styleGuide}
            characterSheet={characterSheet}
            setStoryText={setStoryText}
            setStyleGuide={setStyleGuide}
            setCharacterSheet={setCharacterSheet}
            onAdvance={handleUploadAdvance}
          />
        )}

        {step === 2 && (
          <PromptReviewStep
            scenes={scenes}
            styleGuide={styleGuide}
            characterSheet={characterSheet}
            cards={cards}
            onCardsChange={setCards}
            onAdvance={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <StoryboardStep
            cards={cards}
            onCardsChange={setCards}
            cardsWithout={cardsWithout}
            onCardsWithoutChange={setCardsWithout}
            onInitCardsWithout={handleInitCardsWithout}
          />
        )}
      </div>
    </div>
  );
}
