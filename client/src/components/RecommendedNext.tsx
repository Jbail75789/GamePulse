import { useMemo } from "react";
import { Target } from "lucide-react";
import { type Game } from "@shared/schema";

interface RecommendedNextProps {
  games: Game[];
  onPick: (game: Game) => void;
}

// Pulse-Sync Engine
// Vibe acts as the genre signal in this app's data model — when the user has
// promoted a game to Legacy/Infinite, we surface a Backlog game with the same
// vibe so the next mission echoes the rhythm of the current obsession.
function pickRecommendation(games: Game[]): { game: Game; reason: string } | null {
  const backlog = games.filter((g) => g.status === "backlog");
  if (backlog.length === 0) return null;

  const legacy = games.filter((g) => g.infiniteMode);
  for (const lg of legacy) {
    if (!lg.vibe) continue;
    const match = backlog.find((b) => b.vibe === lg.vibe);
    if (match) {
      return {
        game: match,
        reason: `Same vibe as your Legacy run on ${lg.title}.`,
      };
    }
  }

  // Fallback: match the vibe of the most-played active game.
  const activeByPlaytime = [...games.filter((g) => g.status === "active")].sort(
    (a, b) => (b.playtime ?? 0) - (a.playtime ?? 0),
  );
  for (const ag of activeByPlaytime) {
    if (!ag.vibe) continue;
    const match = backlog.find((b) => b.vibe === ag.vibe);
    if (match) {
      return {
        game: match,
        reason: `Matches the vibe of ${ag.title}.`,
      };
    }
  }

  // Last resort: shortest target backlog mission to ease back in.
  const shortest = [...backlog].sort(
    (a, b) => (a.targetHours ?? 999) - (b.targetHours ?? 999),
  )[0];
  return shortest
    ? { game: shortest, reason: "Shortest backlog mission — quick win." }
    : null;
}

export function RecommendedNext({ games, onPick }: RecommendedNextProps) {
  const rec = useMemo(() => pickRecommendation(games), [games]);
  if (!rec) return null;

  return (
    <div className="mt-4">
      <p className="px-1 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        Recommended Next
      </p>
      <button
        type="button"
        onClick={() => onPick(rec.game)}
        data-testid={`button-recommended-${rec.game.id}`}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-primary/40 bg-primary/5 hover:bg-primary/15 hover:border-primary/70 transition-all text-left group"
      >
        {rec.game.coverUrl ? (
          <img
            src={rec.game.coverUrl}
            alt=""
            className="w-10 h-10 rounded object-cover shrink-0 border border-primary/30"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-display uppercase tracking-wide text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {rec.game.title}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">
            {rec.reason}
          </div>
        </div>
        <Target className="w-4 h-4 text-primary/70 group-hover:text-primary shrink-0" />
      </button>
    </div>
  );
}
