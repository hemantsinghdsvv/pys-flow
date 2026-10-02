import "server-only";

/**
 * Minimal Ollama client. Returns null when Ollama is not configured
 * (empty OLLAMA_URL) or the request fails, so callers can fall back to
 * heuristic output instead of erroring.
 */
export async function askOllama(prompt: string): Promise<string | null> {
  const url = process.env.OLLAMA_URL?.trim();
  const model = process.env.OLLAMA_MODEL?.trim() || "llama3.2";
  if (!url) return null;

  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
      // Local models can be slow; cap the wait.
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { response?: string };
    return data.response?.trim() || null;
  } catch {
    return null;
  }
}

export function isAiConfigured() {
  return Boolean(process.env.OLLAMA_URL?.trim());
}
