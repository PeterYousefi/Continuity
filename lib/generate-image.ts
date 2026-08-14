export async function generateImage(prompt: string): Promise<string> {
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`generate-image failed (${res.status}): ${text}`);
  }

  const { b64 } = (await res.json()) as { b64: string };
  return "data:image/png;base64," + b64;
}
