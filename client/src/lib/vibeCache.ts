// Persistent cache for AI Vibe Check opening responses.
// Stored in localStorage so we never re-bill OpenAI for the same opening on
// the same game. Chat follow-ups remain live.

const KEY_PREFIX = "gp:vibe:";

interface CachedVibe {
  text: string;
  ts: number;
}

export function getCachedVibe(gameId: number): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_PREFIX + gameId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedVibe;
    return parsed.text || null;
  } catch {
    return null;
  }
}

export function setCachedVibe(gameId: number, text: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      KEY_PREFIX + gameId,
      JSON.stringify({ text, ts: Date.now() } satisfies CachedVibe),
    );
  } catch {
    // Quota exceeded or storage disabled — fail silently.
  }
}

export function clearCachedVibe(gameId: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY_PREFIX + gameId);
  } catch {
    /* ignore */
  }
}
