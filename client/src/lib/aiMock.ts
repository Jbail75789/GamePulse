// Toggle real OpenAI vs pre-written mock responses.
// Default is MOCK ON to protect API credits during development & demos.
// Flip with: VITE_AI_MOCK_MODE="false" in env to hit the real backend.
export const AI_MOCK_MODE: boolean =
  ((import.meta as any).env?.VITE_AI_MOCK_MODE ?? "true").toString() !== "false";

const MOCK_VIBE_CHECKS = [
  "System scan complete. This title runs hot — narrative density flagged. Pace yourself, Commander.",
  "Vibe locked. The grind is real but the payoff is engineered for your dopamine profile.",
  "Pulse reading: stable. Recommended dosage 90 minutes per session before reality bleeds in.",
  "Cyber-Cynic verdict — solid bones, mid third act. You'll see the twist coming. Play it anyway.",
  "Telemetry says: high replay loop, low cognitive load. Perfect for a Tuesday brain.",
  "Forecast: you will say 'just one more mission' approximately 7 times tonight.",
  "Detected: classic. The kind of game that ruins other games for you. Enter at your own risk.",
  "Tactical assessment — sharp combat, soft writing. Mute the cutscenes, keep the rhythm.",
  "Reading vintage AAA energy. Comfortable, predictable, oddly satisfying. Like a warm soda.",
];

const MOCK_LEGACY_VERDICTS = [
  "LEGENDARY STATUS. The system observes a Commander who has chosen the long path. Respect.",
  "TOUCH GRASS. Or don't. The pulse is steady, the grind is real, and the world keeps spinning.",
  "INFINITE THREAD DETECTED. You are no longer playing the game. The game is playing you. Continue.",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getMockVibeCheck(gameTitle: string, isLegacy = false): string {
  const pool = isLegacy ? MOCK_LEGACY_VERDICTS : MOCK_VIBE_CHECKS;
  return pool[hashString(gameTitle) % pool.length];
}

export function getMockEstimate(title: string): { main: number; full: number; note: string } {
  const h = hashString(title);
  const main = 12 + (h % 50); // 12-61
  const full = main + 8 + (h % 30);
  return { main, full, note: "Mock HLTB estimate (no API call)." };
}

// Simulate streamed assistant typing. Calls onChunk repeatedly and resolves when done.
export async function mockStream(
  fullText: string,
  onChunk: (acc: string) => void,
): Promise<void> {
  const words = fullText.split(" ");
  let acc = "";
  for (let i = 0; i < words.length; i++) {
    acc += (i === 0 ? "" : " ") + words[i];
    onChunk(acc);
    await new Promise((r) => setTimeout(r, 35 + Math.random() * 35));
  }
}
