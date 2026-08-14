const TIMEOUT_MS = 90_000; // 90 seconds

/**
 * Wraps the image generation fetch with an AbortController timeout.
 * Rejects with a clear message if OpenAI hasn't responded within TIMEOUT_MS.
 */
export async function generateImage(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`generate-image failed (${res.status}): ${text}`);
    }

    const { b64 } = (await res.json()) as { b64: string };
    return "data:image/png;base64," + b64;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Timed out after ${TIMEOUT_MS / 1000}s — click Retry to try again.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
