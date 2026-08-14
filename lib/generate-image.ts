const TIMEOUT_MS = 90_000; // 90 seconds

let _requestCounter = 0;

/**
 * Wraps the image generation fetch with an AbortController timeout.
 * Rejects with a clear message if OpenAI hasn't responded within TIMEOUT_MS.
 * Logs start, completion, and round-trip time to the browser console.
 */
export async function generateImage(prompt: string): Promise<string> {
  const n = ++_requestCounter;
  const t0 = performance.now();
  const startLabel = `[generateImage #${n}]`;

  console.log(`${startLabel} START  ${new Date().toISOString()}  prompt_len=${prompt.length}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });

    const elapsed = Math.round(performance.now() - t0);

    if (!res.ok) {
      const text = await res.text();
      console.log(`${startLabel} ERROR  status=${res.status} elapsed=${elapsed}ms`);
      throw new Error(`generate-image failed (${res.status}): ${text}`);
    }

    const { b64 } = (await res.json()) as { b64: string };
    console.log(`${startLabel} OK     status=${res.status} elapsed=${elapsed}ms b64_len=${b64.length}`);
    return "data:image/png;base64," + b64;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      const elapsed = Math.round(performance.now() - t0);
      console.log(`${startLabel} TIMEOUT elapsed=${elapsed}ms (limit=${TIMEOUT_MS}ms)`);
      throw new Error(`Timed out after ${TIMEOUT_MS / 1000}s — click Retry to try again.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
