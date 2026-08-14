import type { Scene } from "@/types";

/**
 * Composes a single image-generation prompt from the three content sources.
 * Pure function — no API calls, no process.env access.
 *
 * Output is intentionally kept under ~900 tokens so the model has headroom
 * for its internal processing. The three sections are clearly labelled so the
 * model can distinguish scene-specific content from shared style/character context.
 */
export function buildPrompt(
  scene: Scene,
  styleGuide: string,
  characterSheet: string
): string {
  return [
    "=== SCENE DESCRIPTION ===",
    scene.description.trim(),
    "",
    "=== VISUAL STYLE DIRECTIVES ===",
    styleGuide.trim(),
    "",
    "=== CHARACTER DESCRIPTIONS ===",
    characterSheet.trim(),
  ].join("\n");
}
