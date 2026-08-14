# Storyboard Generator

A Next.js 14 App Router application that turns plain-text story documents into an AI-generated visual storyboard. Upload your story, style guide, and character sheet — the app parses scenes with GPT, lets you review and edit the prompts, then generates one image per scene sequentially using the OpenAI image API.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values. All five variables are required.

| Variable | Example value | Description |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | Your OpenAI secret key — used by both API routes; never sent to the browser |
| `OPENAI_TEXT_MODEL` | `gpt-4o-mini` | GPT chat model used by `/api/parse-scenes` to extract scenes from story text |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1` | Image generation model used by `/api/generate-image` |
| `OPENAI_IMAGE_SIZE` | `1536x1024` | Output image dimensions — widest landscape size supported by `gpt-image-1` |
| `OPENAI_IMAGE_QUALITY` | `medium` | Generation quality passed to the image API (`low` \| `medium` \| `high`) |

---

## Edge Runtime — `/api/generate-image`

Vercel Hobby serverless functions have a **10-second hard timeout**. Generating an image with `gpt-image-1` at `medium` quality takes 15–40 seconds inside OpenAI's infrastructure — a standard serverless route would time out before OpenAI responds.

`/api/generate-image` is therefore declared as a **Vercel Edge Function** (`export const runtime = "edge"`). Edge Functions on Vercel Hobby have no execution time limit: the connection stays open and the response is returned when OpenAI finishes. No `vercel.json` `maxDuration` override is needed.

`/api/parse-scenes` is a standard serverless function — GPT text completions return in 1–3 seconds, well within the 10-second window.

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

---

## Vercel Deploy

1. Push the repository to GitHub (or GitLab / Bitbucket).
2. Open the [Vercel dashboard](https://vercel.com/new) and import the repository.
3. In **Project Settings → Environment Variables**, add all five variables from the table above using your real values.
4. Click **Deploy** (or push a new commit to trigger an automatic deploy).

The project requires no additional Vercel configuration — the Edge runtime is declared at the route level and no `vercel.json` is needed.
