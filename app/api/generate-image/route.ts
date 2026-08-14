import { NextRequest, NextResponse } from "next/server";

// Edge runtime: no execution time limit on Vercel Hobby (resolves the 10 s serverless cap).
// Raw fetch is used instead of the OpenAI SDK to avoid any node: built-in incompatibilities
// in the Edge runtime.
export const runtime = "edge";

export async function POST(req: NextRequest) {
  // --- Parse & validate request body ---
  let prompt: string;
  try {
    const body = await req.json();
    prompt = body?.prompt;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return NextResponse.json(
      { error: "prompt is required." },
      { status: 400 }
    );
  }

  // --- Read env vars ---
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
  const size = process.env.OPENAI_IMAGE_SIZE ?? "1536x1024";
  const quality = process.env.OPENAI_IMAGE_QUALITY ?? "medium";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Server configuration error: missing OPENAI_API_KEY." },
      { status: 500 }
    );
  }

  // --- Call OpenAI Images API via raw fetch (Edge-safe) ---
  // gpt-image-1 returns b64_json in data[0].b64_json by default.
  // response_format is a DALL·E parameter — gpt-image-1 rejects it.
  // Only send parameters documented for this model: model, prompt, size, quality, n.
  const requestStart = Date.now();
  console.log(`[generate-image] START  model=${model} size=${size} quality=${quality} t=${new Date(requestStart).toISOString()}`);

  let b64: string;
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, prompt, size, quality, n: 1 }),
    });

    const elapsed = Date.now() - requestStart;

    // Capture the raw body text once — used for both error surfacing and parsing.
    const rawBody = await response.text();

    if (!response.ok) {
      console.log(`[generate-image] ERROR  status=${response.status} elapsed=${elapsed}ms`);
      // Surface the exact OpenAI error text to the client so nothing is hidden.
      let errorMessage = `OpenAI ${response.status}`;
      try {
        const errorJson = JSON.parse(rawBody);
        errorMessage = errorJson?.error?.message ?? rawBody;
      } catch {
        errorMessage = rawBody || errorMessage;
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    let data: unknown;
    try {
      data = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: `OpenAI returned non-JSON: ${rawBody.slice(0, 300)}` },
        { status: 500 }
      );
    }

    b64 = (data as { data: { b64_json: string }[] })?.data?.[0]?.b64_json;

    if (!b64) {
      console.log(`[generate-image] ERROR  no b64_json in response elapsed=${Date.now() - requestStart}ms body=${JSON.stringify(data).slice(0, 200)}`);
      // Surface the full parsed response so the real shape is visible.
      return NextResponse.json(
        { error: `No b64_json in OpenAI response: ${JSON.stringify(data).slice(0, 300)}` },
        { status: 500 }
      );
    }

    console.log(`[generate-image] OK     status=${response.status} elapsed=${Date.now() - requestStart}ms b64_len=${b64.length}`);

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.log(`[generate-image] THROW  elapsed=${Date.now() - requestStart}ms err=${message}`);
    return NextResponse.json(
      { error: `Image generation failed: ${message}` },
      { status: 500 }
    );
  }

  // Return raw base64 string — the client prepends "data:image/png;base64,"
  return NextResponse.json({ b64 });
}
