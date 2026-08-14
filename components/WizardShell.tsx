"use client";

import { useState } from "react";
import UploadStep from "@/components/steps/UploadStep";
import PromptReviewStep from "@/components/steps/PromptReviewStep";
import StoryboardStep from "@/components/steps/StoryboardStep";
import type { Scene, StoryboardCard } from "@/types";

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

  // Step 2 / 3 cards
  const [cards, setCards] = useState<StoryboardCard[]>([]);

  function handleUploadAdvance(parsedScenes: Scene[], wasTruncated: boolean) {
    setScenes(parsedScenes);
    setTruncated(wasTruncated);
    setStep(2);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Step indicator */}
        <nav className="flex gap-2 mb-8" aria-label="Wizard steps">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold border-2 ${
                  s === step
                    ? "bg-blue-600 border-blue-600 text-white"
                    : s < step
                    ? "bg-blue-100 border-blue-300 text-blue-700"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {s}
              </div>
              <span
                className={`text-sm ${
                  s === step ? "font-semibold text-gray-900" : "text-gray-400"
                }`}
              >
                {STEP_LABELS[s]}
              </span>
              {s < 3 && (
                <span className="text-gray-300 mx-1 select-none">›</span>
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
          <StoryboardStep cards={cards} onCardsChange={setCards} />
        )}
      </div>
    </div>
  );
}
