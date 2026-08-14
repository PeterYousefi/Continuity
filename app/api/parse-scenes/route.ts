import { NextRequest, NextResponse } from "next/server";
import { MAX_SCENES } from "@/lib/constants";
import type { Scene } from "@/types/index";

// ---------------------------------------------------------------------------
// Prompt — Granite 3 Instruct chat format
// The model uses <|system|> / <|user|> / <|assistant|> turn markers.
// We close with <|assistant|> and no content to prime the model to respond.
// ---------------------------------------------------------------------------
function buildWatsonxInput(storyText: string): string {
  return [
    "<|system|>",
    "You are a story analyst. Extract the individual scenes from the story text the user provides.",
    "Return a JSON object with a single key \"scenes\".",
    "The value must be an array of objects, each with exactly two string fields:",
    "  - \"title\": a short scene name (max 10 words)",
    "  - \"description\": a full description of what happens in the scene (1-4 sentences)",
    "Rules:",
    "- Output ONLY valid JSON. No markdown, no code fences, no commentary, no explanation.",
    "- Do not include an \"id\" field.",
    "- If the text has no clear scenes, return: {\"scenes\":[]}",
    "<|user|>",
    storyText.trim(),
    "<|assistant|>",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Strip accidental markdown code fences Granite may wrap around JSON
// ---------------------------------------------------------------------------
function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

// ---------------------------------------------------------------------------
// IBM Cloud IAM token exchange
// POST https://iam.cloud.ibm.com/identity/token
// Body: grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey={key}
// Returns: { access_token, expires_in, ... }
// ---------------------------------------------------------------------------
async function fetchIamToken(apiKey: string): Promise<string> {
  const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aibm%3Aparams%3Aoauth%3Agrant-type%3Aapikey&apikey=${encodeURIComponent(apiKey)}`,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`IAM token exchange failed (${res.status}): ${msg}`);
  }

  const data = await res.json();
  if (!data?.access_token) {
    throw new Error("IAM response did not contain an access_token.");
  }
  return data.access_token as string;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
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
    return NextResponse.json({ error: "storyText is required." }, { status: 400 });
  }

  // --- Read env vars ---
  const watsonxApiKey  = process.env.WATSONX_API_KEY;
  const watsonxUrl     = process.env.WATSONX_URL ?? "https://us-south.ml.cloud.ibm.com";
  const modelId        = process.env.WATSONX_MODEL_ID ?? "ibm/granite-3-8b-instruct";
  const projectId      = process.env.WATSONX_PROJECT_ID;
  const apiVersion     = process.env.WATSONX_API_VERSION ?? "2023-05-29";

  if (!watsonxApiKey) {
    return NextResponse.json(
      { error: "Server configuration error: missing WATSONX_API_KEY." },
      { status: 500 }
    );
  }
  if (!projectId) {
    return NextResponse.json(
      { error: "Server configuration error: missing WATSONX_PROJECT_ID." },
      { status: 500 }
    );
  }

  // --- Exchange API key for IAM access token ---
  let accessToken: string;
  try {
    accessToken = await fetchIamToken(watsonxApiKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `IBM IAM authentication failed: ${message}` },
      { status: 500 }
    );
  }

  // --- Call watsonx.ai text generation ---
  // Endpoint: POST {WATSONX_URL}/ml/v1/text/generation?version={WATSONX_API_VERSION}
  // Ref: https://cloud.ibm.com/apidocs/watsonx-generative-ai#text-generation
  let rawScenes: { title: string; description: string }[];
  try {
    const endpoint = `${watsonxUrl}/ml/v1/text/generation?version=${apiVersion}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model_id: modelId,
        input: buildWatsonxInput(storyText),
        project_id: projectId,
        parameters: {
          decoding_method: "greedy",
          max_new_tokens: 1200,
          repetition_penalty: 1.05,
        },
      }),
    });

    if (!response.ok) {
      let errorMessage = `watsonx API error ${response.status}`;
      try {
        const errorJson = await response.json();
        // watsonx error shape: { errors: [{ message }] } or { error: string }
        errorMessage =
          errorJson?.errors?.[0]?.message ??
          errorJson?.error ??
          errorMessage;
      } catch {
        // non-JSON error body — keep status message
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const data = await response.json();
    // Response shape: { results: [{ generated_text, generated_token_count, ... }] }
    const generatedText: string = data?.results?.[0]?.generated_text ?? "";

    if (!generatedText) {
      return NextResponse.json(
        { error: "watsonx returned an empty response." },
        { status: 500 }
      );
    }

    // Parse the JSON — strip any accidental markdown fences first
    const cleaned = stripCodeFences(generatedText);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: `Model returned non-JSON output: ${cleaned.slice(0, 200)}` },
        { status: 500 }
      );
    }

    if (!Array.isArray((parsed as { scenes?: unknown })?.scenes)) {
      return NextResponse.json(
        { error: "Unexpected response format from model." },
        { status: 500 }
      );
    }

    rawScenes = (parsed as { scenes: { title: string; description: string }[] }).scenes;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `watsonx request failed: ${message}` },
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
