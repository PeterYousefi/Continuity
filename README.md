# Continuity

AI storyboard continuity. Upload your story, style guide, and character sheet — the app parses scenes with GPT, lets you review and edit one image prompt per scene, then generates a storyboard sequentially using the OpenAI image API.

---

## How it works

1. **Upload & Parse** — upload three plain-text files: a story/scene list, a visual style guide, and a character sheet. The app sends the story text to GPT, which returns a structured list of up to 6 scenes (title + description).
2. **Review Prompts** — each scene gets a pre-built image prompt that combines the scene description, style guide, and character sheet. You can expand and edit any prompt before spending image credits.
3. **Generate** — images are generated sequentially, one per API request. A comparison toggle lets you generate the same scenes again *without* the character sheet, side by side, to see exactly what the character sheet contributes to visual consistency.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values. All five variables are required.

| Variable | Example | Description |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | Your OpenAI secret key — server-side only, never sent to the browser |
| `OPENAI_TEXT_MODEL` | `gpt-4o-mini` | Chat model used by `/api/parse-scenes` to extract scenes |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1` | Image model used by `/api/generate-image` |
| `OPENAI_IMAGE_SIZE` | `1024x1024` | Output image dimensions |
| `OPENAI_IMAGE_QUALITY` | `medium` | Generation quality: `low` \| `medium` \| `high` |

---

## Edge Runtime — `/api/generate-image`

Vercel Hobby serverless functions have a **10-second hard timeout**. Generating an image with `gpt-image-1` at `medium` quality takes 15–40 seconds — a standard serverless route times out before OpenAI responds.

`/api/generate-image` is declared as a **Vercel Edge Function** (`export const runtime = "edge"`). Edge Functions on Vercel Hobby have no execution time limit. No `vercel.json` `maxDuration` override is needed.

`/api/parse-scenes` is a standard serverless function — GPT text completions return in 1–3 seconds.

The route also carries a **60-second server-side `AbortController` timeout** on the OpenAI fetch. If OpenAI hasn't responded within 60 seconds the request fails with a visible error card rather than hanging indefinitely.

---

## Local Development

```bash
# 1. Copy the env template and fill in your OpenAI key
cp .env.example .env.local

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

The app runs at `http://localhost:3000`.

### React StrictMode note

Next.js 14 App Router enables React StrictMode by default. In development, StrictMode intentionally mounts every component twice to surface non-idempotent effects. The image generation loop is written to handle this correctly — it guards against re-starting by checking whether any card has already been moved past `pending` status, rather than using a ref flag that would survive the remount.

---

## Vercel Deploy

1. Push the repository to GitHub.
2. Import the repository at [vercel.com/new](https://vercel.com/new).
3. In **Project Settings → Environment Variables**, add all five variables from the table above.
4. Click **Deploy**.

No additional Vercel configuration is needed — the Edge runtime is declared at the route level.

---

## File structure

```
app/
├── layout.tsx                  # Fraunces + Inter fonts, "Continuity" metadata
├── page.tsx                    # Renders <WizardShell />
├── globals.css                 # Design tokens, component classes, shimmer keyframe
└── api/
    ├── parse-scenes/route.ts   # POST: GPT → Scene[] (serverless)
    └── generate-image/route.ts # POST: gpt-image-1 → { b64 } (Edge runtime)

components/
├── WizardShell.tsx             # Shared state: step, scenes, cards, document strings
└── steps/
│   ├── UploadStep.tsx          # File upload, sample docs, parse trigger
│   ├── PromptReviewStep.tsx    # Per-scene prompt editing before generation
│   └── StoryboardStep.tsx      # Generation loop, comparison toggle, download
└── ui/
    ├── SceneCard.tsx           # Four states: pending / active / done / error
    ├── FileUploadInput.tsx     # Styled file picker, reads text into parent state
    └── PromptEditor.tsx        # Structured 3-panel view; raw textarea edit toggle

lib/
├── build-prompt.ts             # Assembles scene + style + character sheet into prompt
├── generate-image.ts           # Client fetch wrapper with 90s AbortController timeout
├── parse-scenes.ts             # Client fetch wrapper for /api/parse-scenes
├── constants.ts                # MAX_SCENES = 6
└── sample-documents.ts         # One-click demo: "The Cartographer's Last Map"

types/
└── index.ts                    # Scene, StoryboardCard
```
