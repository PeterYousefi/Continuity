# Storyboard Generator — Plan

## Top-Level Overview

A Next.js 14 App Router application deployed on Vercel Hobby. Users upload three plain-text
documents (story/scene list, visual style guide, character sheet) through a multi-step wizard.
The app parses scenes via a GPT text call, lets the user review and edit the generated image
prompts, then generates one image per scene sequentially via the OpenAI image API, streaming
progress into a live storyboard view. All document content and all generated images are held
in React state as base64 data URIs — nothing written to disk, no external storage, no CDN URLs.
The OpenAI key lives exclusively in server-side API routes.

**Scene cap: maximum 6 scenes per run.** Enforced server-side in `/api/parse-scenes` —
if GPT returns more than 6, the array is truncated to 6 before the response is sent.
The Step 1 confirmation UI shows a notice when truncation occurred. This prevents accidental
unbounded generation runs (6 scenes × ~25 s = ~2.5 minutes; uncapped could be hours).

---

## Vercel Hobby Timeout — Design Constraint & Resolution

Vercel Hobby serverless functions have a **10-second hard timeout**. `gpt-image-1` at
`medium` quality and `1536x1024` takes 15–40 seconds end-to-end inside OpenAI's infrastructure.
A standard serverless route proxying that request will time out before OpenAI responds.

**Resolution:** `/api/generate-image` is declared as a **Vercel Edge Function**
(`export const runtime = "edge"`). Edge Functions on Vercel Hobby have no execution time
limit — they hold the connection open and stream, so a 30-second OpenAI response is fine.
The OpenAI Node SDK works in the Edge runtime. The API key stays server-side. No `vercel.json`
`maxDuration` override is needed or used.

`/api/parse-scenes` is a standard serverless function; GPT text completions return in 1–3 s
so it comfortably fits the 10-second window.

---

## Data Flow Summary

```
Step 1 — Upload & Parse
  Client: uploads 3 files → reads as text via FileReader → POSTs raw text to /api/parse-scenes
  Server (serverless): calls GPT text model → returns Scene[] JSON
  Client: displays parsed scenes for user confirmation/editing

Step 2 — Prompt Review
  Client: for each scene, combine scene text + style guide + character sheet
          into an image prompt via buildPrompt() → display editable prompt cards
  (purely client-side, no API call)

Step 3 — Generate Storyboard
  Client: iterates scenes sequentially
          for each scene → POST /api/generate-image with the prompt
          updates that card from skeleton → active → done (or error)
  Server (edge): calls OpenAI image API (gpt-image-1, 1536x1024, medium quality)
                 requests response_format "b64_json"
                 returns { b64: string } — the raw base64 PNG
  Client: constructs data URI "data:image/png;base64,{b64}" and stores in React state
          image is permanently available for the session; no CDN expiry
```

---

## File Structure

```
/
├── app/
│   ├── layout.tsx                  # Root layout, global styles
│   ├── page.tsx                    # Entry point — renders <WizardShell>
│   └── api/
│       ├── parse-scenes/
│       │   └── route.ts            # POST: raw text → GPT → Scene[] JSON (serverless)
│       └── generate-image/
│           └── route.ts            # POST: prompt → OpenAI image API → { b64 } (edge)
│
├── components/
│   ├── WizardShell.tsx             # Owns wizard step state, shared document state
│   ├── steps/
│   │   ├── UploadStep.tsx          # Step 1: file inputs + parse trigger
│   │   ├── PromptReviewStep.tsx    # Step 2: editable prompt cards per scene
│   │   └── StoryboardStep.tsx      # Step 3: sequential generation + live board
│   └── ui/
│       ├── SceneCard.tsx           # Card with skeleton/active/done/error states
│       ├── FileUploadInput.tsx     # Single-file text upload, reads as string
│       └── PromptEditor.tsx        # Editable textarea for one scene prompt
│
├── lib/
│   ├── parse-scenes.ts             # Client fetch wrapper for /api/parse-scenes
│   ├── generate-image.ts           # Client fetch wrapper for /api/generate-image → data URI
│   └── build-prompt.ts             # Pure fn: (scene, styleGuide, characterSheet) → string
│
├── types/
│   └── index.ts                    # Shared TypeScript types (Scene, StoryboardCard, etc.)
│
├── .env.local                      # OPENAI_API_KEY, OPENAI_TEXT_MODEL, OPENAI_IMAGE_MODEL,
│                                   # OPENAI_IMAGE_SIZE, OPENAI_IMAGE_QUALITY
└── next.config.ts
```

---

## Environment Variables

| Variable | Example value | Used in |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | Both API routes |
| `OPENAI_TEXT_MODEL` | `gpt-4o-mini` | `/api/parse-scenes` |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1` | `/api/generate-image` |
| `OPENAI_IMAGE_SIZE` | `1536x1024` | `/api/generate-image` |
| `OPENAI_IMAGE_QUALITY` | `medium` | `/api/generate-image` |

All five are read from `process.env` at runtime — nothing hardcoded.

---

## Constants

```
MAX_SCENES = 6   // defined in lib/constants.ts, imported by the API route and the UI
```

---

## Shared Types (`types/index.ts`)

```
Scene {
  id: string          // stable key, e.g. "scene-0"
  title: string       // short scene name returned by GPT
  description: string // full scene description returned by GPT
}

StoryboardCard {
  scene: Scene
  prompt: string            // the combined image prompt (editable in Step 2)
  status: "pending" | "active" | "done" | "error"
  dataUri?: string          // "data:image/png;base64,..." populated on success
  errorMessage?: string     // populated on failure
}
```

Note: `imageUrl` from the previous version is replaced by `dataUri`. The base64 string is
stored in React state and never written to disk or sent to any external service.

---

## Sub-Tasks

---

### Sub-Task 1 — Project Scaffold & Types

**Intent**
Establish the Next.js 14 App Router project with TypeScript, install the `openai` npm package,
configure environment variable stubs, and define all shared types. This gives every subsequent
sub-task a stable foundation to build on.

**Expected Outcomes**
- `npx create-next-app` project initialised with App Router and TypeScript
- `openai` package installed
- `.env.local` created with all five variable keys (empty values)
- `lib/constants.ts` exports `MAX_SCENES = 6`
- `types/index.ts` exists and exports `Scene` and `StoryboardCard` (with `dataUri`, not `imageUrl`)
- `next.config.ts` has no filesystem or experimental flags that conflict with memory-only operation

**Todo List**
1. Bootstrap project with `create-next-app` (App Router, TypeScript, Tailwind)
2. `npm install openai`
3. Create `.env.local` with the five env var keys, values left blank for the developer to fill
4. Create `lib/constants.ts` exporting `MAX_SCENES = 6`
5. Write `types/index.ts` with `Scene` and `StoryboardCard` types as specified above
6. Verify `next.config.ts` — no `output: "export"`, no `distDir` overrides, no filesystem flags

**Relevant Context**
- No existing codebase — greenfield
- No `vercel.json` is needed; Edge runtime is declared per-route via `export const runtime = "edge"`
- `MAX_SCENES = 6` is the single source of truth — imported by both the API route (truncation)
  and the UI (truncation notice). Never duplicated as a magic number.
  6 scenes × ~25 s = ~2.5 minutes maximum; fast enough to iterate and demo tonight.

**Status:** [ ] pending

---

### Sub-Task 2 — API Route: `/api/parse-scenes`

**Intent**
Implement the server-side route that accepts the raw story text and returns a structured
`Scene[]` array. This is the only place a GPT text model is called; it must never expose
the API key to the client. Runs as a standard serverless function (completes in < 10 s).

**Expected Outcomes**
- `POST /api/parse-scenes` accepts `{ storyText: string }` JSON body
- Calls the OpenAI chat completions API using `process.env.OPENAI_TEXT_MODEL`
- System prompt instructs the model to return a JSON array of `{ id, title, description }`
  objects — one per scene
- Response is `{ scenes: Scene[] }`
- Returns a 400 if `storyText` is missing; 500 with a message on OpenAI failure
- `OPENAI_API_KEY` accessed only here and in the image route — never sent to the browser

**Todo List**
1. Create `app/api/parse-scenes/route.ts` — no `runtime` export (stays serverless)
2. Read `OPENAI_API_KEY` and `OPENAI_TEXT_MODEL` from `process.env`; throw on missing key
3. Construct a system prompt that enforces JSON-only output with the `Scene` schema
4. Call `openai.chat.completions.create(...)` with `response_format: { type: "json_object" }`
5. Parse the response and validate it is an array before returning
6. **Truncate to `MAX_SCENES` (imported from `lib/constants.ts`) before assigning IDs**
7. Map entries to ensure each `id` is stable: `scene-0`, `scene-1`, etc.
8. Return `NextResponse.json({ scenes, truncated: boolean })` — `truncated: true` when
   the raw GPT result exceeded `MAX_SCENES`; the client uses this flag to show the notice
9. Return 400 if `storyText` is missing; 500 with a message on OpenAI failure

**Relevant Context**
- `lib/constants.ts` — `MAX_SCENES`
- `types/index.ts` — `Scene` type
- The style guide and character sheet are NOT sent to this route; they are used only
  client-side in Step 2 when building image prompts

**Status:** [ ] pending

---

### Sub-Task 3 — API Route: `/api/generate-image`

**Intent**
Implement the image generation route that accepts a single prompt and returns a base64-encoded
PNG. Declared as a Vercel Edge Function so there is no execution time limit on Hobby tier.
Returns `b64_json` format so the image is self-contained in React state with no CDN dependency.

**Expected Outcomes**
- `export const runtime = "edge"` at the top of the file
- `POST /api/generate-image` accepts `{ prompt: string }` JSON body
- Calls OpenAI image generation using `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_SIZE`,
  `OPENAI_IMAGE_QUALITY` from `process.env`, with `response_format: "b64_json"` and `n: 1`
- Returns `{ b64: string }` on success — the raw base64 string (no data URI prefix)
- Returns `{ error: string }` with status 500 on failure
- No image data written to disk; base64 string returned directly in the JSON response

**Todo List**
1. Create `app/api/generate-image/route.ts`
2. Add `export const runtime = "edge"` as the first export
3. Read `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_SIZE`, `OPENAI_IMAGE_QUALITY`
   from `process.env`
4. Call `openai.images.generate({ model, prompt, size, quality, response_format: "b64_json", n: 1 })`
5. Extract `data[0].b64_json` from the response
6. Return `NextResponse.json({ b64 })` or `NextResponse.json({ error }, { status: 500 })`

**Relevant Context**
- Edge runtime: no `fs`, no Node.js-only APIs; the OpenAI SDK works in Edge
- `response_format: "b64_json"` returns the image inline — no expiring CDN URL
- The client assembles the full data URI: `"data:image/png;base64," + b64`
- Size `1536x1024` is the widest landscape option for `gpt-image-1`

**Status:** [ ] pending

---

### Sub-Task 3.5 — Initial Vercel Deploy (Smoke Test)

**Intent**
Push the project to Vercel immediately after the two API routes are in place but before
any UI work beyond the bare upload screen. The goal is to discover deployment-specific
failures — Edge runtime misconfigurations, environment variable gaps, build errors — while
there is still time to fix them, not after the full UI is built. A broken app on a live URL
is more useful at this stage than a working app that has never left localhost.

**Expected Outcomes**
- Project repository exists on GitHub (or GitLab/Bitbucket) and is connected to Vercel
- First production deploy completes without build errors
- All five env vars are set in the Vercel dashboard (Project Settings → Environment Variables)
- `GET /` renders without a crash (upload screen or a bare placeholder is fine)
- `POST /api/parse-scenes` returns a valid `{ scenes }` response when called with curl/Postman
  against the live URL — confirms the serverless function and API key are wired correctly
- `POST /api/generate-image` returns `{ b64 }` against the live URL — confirms the Edge
  Function runtime, the API key, and `response_format: "b64_json"` all work on Vercel's
  infrastructure (not just localhost)
- Any Edge runtime incompatibility with the OpenAI SDK surfaces here and is fixed before
  UI work begins

**Todo List**
1. `git init` + initial commit if not already done; push to a remote repository
2. Create a new Vercel project linked to the repository (`vercel link` or via the dashboard)
3. Add all five env vars in Vercel Project Settings → Environment Variables
   (use real values — this is the smoke test, not a dry run)
4. Trigger a deploy (`git push` or `vercel deploy`)
5. Confirm build succeeds in the Vercel dashboard — zero errors, zero Edge runtime warnings
6. Smoke-test `POST /api/parse-scenes` against the live URL with a short story snippet
7. Smoke-test `POST /api/generate-image` against the live URL with a sample prompt
8. If either smoke test fails, fix the root cause before proceeding to Sub-Task 4

**Relevant Context**
- This is an intentional mid-build deploy — the app is incomplete and that is fine
- The Edge Function risk: the OpenAI SDK uses `node:` built-ins in some code paths;
  if the Edge runtime rejects them, the fix is to use `fetch()` directly in the route
  instead of the SDK — surfacing this now costs minutes, surfacing it in Sub-Task 7 costs hours
- Env var names must match exactly: `OPENAI_API_KEY`, `OPENAI_TEXT_MODEL`,
  `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_SIZE`, `OPENAI_IMAGE_QUALITY`

**Status:** [ ] pending

---

### Sub-Task 4 — Client Library & Prompt Builder

**Intent**
Create the thin client-side fetch wrappers and the pure prompt-building function so that
components never construct raw fetch calls inline and the prompt logic is testable in isolation.

**Expected Outcomes**
- `lib/parse-scenes.ts` exports `parseScenes(storyText: string): Promise<Scene[]>`
- `lib/generate-image.ts` exports `generateImage(prompt: string): Promise<string>`
  — resolves to a fully-formed `data:image/png;base64,...` URI
  — throws on non-OK response so callers can catch and mark the card as errored
- `lib/build-prompt.ts` exports
  `buildPrompt(scene: Scene, styleGuide: string, characterSheet: string): string`
  — concatenates the three inputs into a single well-structured prompt string

**Todo List**
1. Write `lib/parse-scenes.ts` — fetch POST to `/api/parse-scenes`, return `scenes` array
2. Write `lib/generate-image.ts` — fetch POST to `/api/generate-image`, on success
   prepend `"data:image/png;base64,"` to the returned `b64` string and return the full URI;
   throw on error response
3. Write `lib/build-prompt.ts` — compose a prompt template: scene description first,
   then style directives, then character descriptions; keep under ~900 tokens to leave
   headroom for the model

**Relevant Context**
- `types/index.ts` — `Scene` type used in signatures
- `build-prompt.ts` is purely client-side; no secret access
- The data URI assembly (`"data:image/png;base64," + b64`) happens here, not in the component

**Status:** [ ] pending

---

### Sub-Task 5 — UI: `WizardShell` and Step 1 (Upload & Parse)

**Intent**
Build the top-level wizard container that owns all shared state and the first step where
users upload the three documents, trigger parsing, and confirm the scene list.

**Expected Outcomes**
- `WizardShell.tsx` holds: current step (1–3), raw document strings (storyText, styleGuide,
  characterSheet), and the `StoryboardCard[]` array
- Step indicator shows steps 1 / 2 / 3 with current step highlighted
- `UploadStep.tsx` renders three `FileUploadInput` components, one per document
- On "Parse Scenes" button click, calls `parseScenes()`, shows an inline loading state,
  then populates the scene list below for user confirmation
- If the API returns `truncated: true`, a visible inline notice explains that the story
  exceeded the 6-scene cap and the first 6 were kept; user sees exactly what will be generated
- Parsed scenes shown as read-only preview cards; user clicks "Looks good →" to advance
- File content read via `FileReader.readAsText` — no FormData, no server filesystem writes

**Todo List**
1. Create `components/ui/FileUploadInput.tsx` — `<input type="file" accept=".txt,.md">`,
   calls `FileReader.readAsText`, surfaces the string via `onChange`
2. Create `components/WizardShell.tsx` with step state and document string state
3. Create `components/steps/UploadStep.tsx` — three upload inputs + parse button + scene preview
4. Wire `parseScenes()` call with loading/error state inside `UploadStep`
5. If `truncated` flag is true in the response, render a notice: "Your story had more than
   6 scenes. Only the first 6 are shown — edit your story document to reorder if needed."
6. Advance wizard to step 2 when user confirms parsed scenes

**Relevant Context**
- `lib/parse-scenes.ts` — called from `UploadStep`; must also return the `truncated` flag
- `lib/constants.ts` — `MAX_SCENES` used in the notice text so the number stays in sync
- `types/index.ts` — `Scene` shape for the preview list

**Status:** [ ] pending

---

### Sub-Task 6 — UI: Step 2 (Prompt Review & Edit)

**Intent**
Build the prompt review step that generates the initial combined prompt for each scene
(client-side, no API call) and lets the user edit each one before spending image credits.

**Expected Outcomes**
- `PromptReviewStep.tsx` maps over scenes, calls `buildPrompt()` for each,
  and initialises the `StoryboardCard[]` array with `status: "pending"`
- Each scene shown as a `PromptEditor` card: scene title + editable textarea pre-filled
  with the generated prompt
- "Generate Storyboard →" button advances to step 3 with the (possibly edited) cards array
- No API calls in this step

**Todo List**
1. Create `components/ui/PromptEditor.tsx` — scene title header + `<textarea>` for the prompt
2. Create `components/steps/PromptReviewStep.tsx`
3. On mount (or on step entry), call `buildPrompt()` for each scene and hydrate `StoryboardCard[]`
4. Allow prompt edits to update the corresponding card's `prompt` field in `WizardShell` state
5. Pass the final `StoryboardCard[]` to `WizardShell` before advancing to step 3

**Relevant Context**
- `lib/build-prompt.ts` — called once per scene on step entry
- `types/index.ts` — `StoryboardCard` shape

**Status:** [ ] pending

---

### Sub-Task 7 — UI: Step 3 (Sequential Generation & Storyboard Display)

**Intent**
Build the storyboard step that runs image generation sequentially, one scene at a time,
with per-card visual states (skeleton → active → done / error) and per-card retry on failure.

**Expected Outcomes**
- `StoryboardStep.tsx` starts a sequential loop on mount: for each card in order,
  set its status to `"active"`, call `generateImage(card.prompt)`, then set to `"done"` with
  `dataUri` — or `"error"` with `errorMessage` — then move to the next card
- The loop never aborts; an errored card is skipped and generation continues
- `SceneCard.tsx` renders four distinct visual states:
  - `pending` — grey skeleton rectangle with scene title
  - `active` — animated pulse/shimmer with "Generating…" label
  - `done` — `<img src={dataUri}>` fills the card (1536×1024 aspect ratio preserved), title below
  - `error` — red-tinted card, error message, "Retry" button
- Retry button re-runs `generateImage` for that single card only, independent of the main loop
- Cards laid out in a responsive CSS grid (1 col mobile, 2 col tablet, 3 col desktop)
- Generated images persist for the full browser session — no expiry — because they are
  base64 data URIs in React state

**Todo List**
1. Create `components/ui/SceneCard.tsx` with all four status variants
2. Create `components/steps/StoryboardStep.tsx` with sequential generation logic
3. Implement the `async` loop using `for...of` (not `Promise.all`) to enforce sequential order
4. Use `dataUri` (not `imageUrl`) on the `done` card's `<img>` src
5. After the loop completes, show a "Download / Share" placeholder so the UI has a clear end state
6. Implement the retry handler on `SceneCard` — calls `generateImage`, updates only that card's
   state slice in the parent's `StoryboardCard[]` array

**Relevant Context**
- `lib/generate-image.ts` — returns a full data URI; callers need no special handling
- `types/index.ts` — `StoryboardCard.dataUri` replaces the old `imageUrl` field
- Sequential `for...of` is required; `Promise.all` would send all requests simultaneously

**Status:** [ ] pending

---

### Sub-Task 8 — Vercel Deployment Configuration

**Intent**
Ensure the project deploys correctly on Vercel Hobby with no filesystem assumptions and
all environment variables documented. No `vercel.json` timeout overrides are needed because
the image route uses the Edge runtime.

**Expected Outcomes**
- `next.config.ts` has no conflicting output or filesystem options
- No `vercel.json` — Edge runtime handles the timeout concern at the route level
- `README.md` documents all five required env vars, explains the Edge runtime choice,
  and provides local dev and Vercel deploy instructions
- No `fs`, `path`, or `os` imports anywhere in the codebase

**Todo List**
1. Audit `next.config.ts` — confirm no `output: "export"` or `distDir` overrides
2. Do NOT create a `vercel.json` with `maxDuration` — Edge runtime makes it unnecessary
3. Write `README.md` with env var table, note on Edge runtime for image generation,
   local dev instructions, and Vercel deploy notes
4. Do a final grep for `fs`, `writeFile`, `readFile` imports to confirm memory-only constraint

**Relevant Context**
- Vercel Edge Functions: no execution time limit on Hobby; connection stays open while
  OpenAI generates the image (15–40 s); response is returned when ready
- Standard serverless (`/api/parse-scenes`): 10 s limit, well within GPT text completion time
- Base64 images in React state: no CDN, no expiry, no external dependency after generation

**Status:** [ ] pending
