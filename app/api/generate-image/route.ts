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
  // gpt-image-1 does not support response_format:"b64_json" — it only returns URLs.
  // We fetch the URL server-side and convert to base64 so the client receives a
  // self-contained data URI with no expiry dependency on OpenAI's CDN.
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

    if (!response.ok) {
      let errorMessage = `OpenAI API error ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson?.error?.message ?? errorMessage;
      } catch {
        // non-JSON error body — keep the status message
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const data = await response.json();
    const imageUrl: string | undefined = data?.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL returned from OpenAI." },
        { status: 500 }
      );
    }

    // Fetch the image and convert to base64 server-side
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch generated image from OpenAI CDN." },
        { status: 500 }
      );
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    // Edge-safe base64 encoding (no Buffer available in Edge runtime).
    // Process in 8 kB chunks to avoid call-stack overflows on large images.
    const CHUNK = 8192;
    let binary = "";
    for (let i = 0; i < uint8.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, Array.from(uint8.subarray(i, i + CHUNK)));
    }
    b64 = btoa(binary);

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
