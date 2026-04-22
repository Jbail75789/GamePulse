import { useEffect, useMemo, useState } from "react";
import { Radio, Brain, Clock4 } from "lucide-react";
import { type Game } from "@shared/schema";

interface MissionStatusProps {
  games: Game[];
  isPro: boolean;
}

const ACTIVE_FULL_THRESHOLD_FREE = 5;
const ACTIVE_FULL_THRESHOLD_PRO = 8;

function pickGreeting(games: Game[], isPro: boolean): string {
  const active = games.filter((g) => g.status === "active").length;
  const backlog = games.filter((g) => g.status === "backlog").length;
  const fullThreshold = isPro ? ACTIVE_FULL_THRESHOLD_PRO : ACTIVE_FULL_THRESHOLD_FREE;

  if (active === 0 && backlog === 0) {
    return "Commander, the field is clear. Add a game to begin operations.";
  }
  if (active === 0) {
    return "Commander, the field is clear. Deploy a game from the Backlog.";
  }
  if (active >= fullThreshold) {
    return "Strategic bottleneck detected. Focus on clearing current objectives.";
  }
  if (backlog > active * 3) {
    return "Backlog accumulating. Promote a mission to the Pulse when ready.";
  }
  return "Pulse stable. Continue executing your active missions.";
}

function useTypewriter(text: string, speed = 28): string {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return out;
}

export function MissionStatus({ games, isPro }: MissionStatusProps) {
  const greeting = useMemo(() => pickGreeting(games, isPro), [games, isPro]);
  const typed = useTypewriter(greeting);

  const stats = useMemo(() => {
    const totalGames = games.length;
    const decisionFatigueAvoided = totalGames * 0.5;
    const playtimeOptimized = games
      .filter((g) => g.status === "completed")
      .reduce((sum, g) => sum + (g.playtime ?? 0), 0);
    return {
      decisionFatigueAvoided,
      playtimeOptimized: Math.round(playtimeOptimized * 10) / 10,
    };
  }, [games]);

  return (
    <div
      className="rounded-md border border-primary/30 bg-black/50 backdrop-blur-sm overflow-hidden"
      data-testid="mission-status"
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-primary/20 bg-primary/5">
        <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
          Mission Status
        </span>
      </div>
      <div className="px-4 py-3 min-h-[2.5rem] flex items-center">
        <p
          className="font-mono text-sm text-foreground leading-snug"
          data-testid="text-mission-greeting"
        >
          {typed}
          <span className="inline-block w-[8px] h-[14px] -mb-0.5 ml-0.5 bg-primary animate-[typewriterCursor_1s_steps(2)_infinite]" />
        </p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-primary/20 border-t border-primary/20 bg-black/40">
        <Readout
          icon={<Brain className="w-3.5 h-3.5" />}
          label="Decision Fatigue Avoided"
          value={`${stats.decisionFatigueAvoided.toFixed(1)}h`}
          testId="stat-decision-fatigue"
        />
        <Readout
          icon={<Clock4 className="w-3.5 h-3.5" />}
          label="Playtime Optimized"
          value={`${stats.playtimeOptimized}h`}
          testId="stat-playtime-optimized"
        />
      </div>
    </div>
  );
}

function Readout({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-3" data-testid={testId}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-primary/70 shrink-0">{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">
          {label}
        </span>
      </div>
      <span
        className="font-mono text-base font-bold text-primary tabular-nums"
        style={{ textShadow: "0 0 8px rgba(0,255,159,0.6)" }}
      >
        {value}
      </span>
    </div>
  );
}
