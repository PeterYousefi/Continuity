import type { Scene } from "@/types";

export interface ParseScenesResult {
  scenes: Scene[];
  truncated: boolean;
}

export async function parseScenes(
  storyText: string
): Promise<ParseScenesResult> {
  const res = await fetch("/api/parse-scenes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storyText }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`parse-scenes failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as ParseScenesResult;
  return data;
}
