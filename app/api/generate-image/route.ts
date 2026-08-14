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
  let b64: string;
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        size,
        quality,
        response_format: "b64_json",
        n: 1,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: `OpenAI API error ${response.status}: ${errorBody}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    b64 = data?.data?.[0]?.b64_json;

    if (!b64) {
      return NextResponse.json(
        { error: "No image data returned from OpenAI." },
        { status: 500 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Image generation failed: ${message}` },
      { status: 500 }
    );
  }

  // Return raw base64 string — the client prepends "data:image/png;base64,"
  return NextResponse.json({ b64 });
}
