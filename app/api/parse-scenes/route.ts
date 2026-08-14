import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { MAX_SCENES } from "@/lib/constants";
import type { Scene } from "@/types/index";

const SYSTEM_PROMPT = `You are a story analyst. The user will provide raw story or script text.
Your task is to extract the individual scenes and return them as a JSON object with a single key "scenes".
The value of "scenes" must be an array of objects, each with exactly two string fields:
  - "title": a short scene name (max 10 words)
  - "description": a full description of what happens in the scene (1–4 sentences)

Rules:
- Output ONLY valid JSON — no markdown, no code fences, no commentary.
- Do not include an "id" field; the caller will assign IDs.
- If the text has no clear scenes, return an empty array: { "scenes": [] }`;

export async function POST(req: NextRequest) {
  // --- Parse & validate request body ---
  let storyText: string;
  try {
    const body = await req.json();
    storyText = body?.storyText;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!storyText || typeof storyText !== "string" || storyText.trim() === "") {
    return NextResponse.json(
      { error: "storyText is required." },
      { status: 400 }
    );
  }

  // --- Read env vars ---
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Server configuration error: missing OPENAI_API_KEY." },
      { status: 500 }
    );
  }

  // --- Call OpenAI ---
  let rawScenes: { title: string; description: string }[];
  try {
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: storyText },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed?.scenes)) {
      return NextResponse.json(
        { error: "Unexpected response format from model." },
        { status: 500 }
      );
    }

    rawScenes = parsed.scenes;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `OpenAI request failed: ${message}` },
      { status: 500 }
    );
  }

  // --- Truncate and assign stable IDs ---
  const truncated = rawScenes.length > MAX_SCENES;
  const scenes: Scene[] = rawScenes.slice(0, MAX_SCENES).map((s, i) => ({
    id: `scene-${i}`,
    title: s.title ?? "",
    description: s.description ?? "",
  }));

  return NextResponse.json({ scenes, truncated });
}
