import { useEffect, useMemo, useState } from "react";
import { Radio, Brain, Clock4, Hourglass } from "lucide-react";
import { type Game } from "@shared/schema";

interface MissionStatusProps {
  games: Game[];
  isPro: boolean;
}

const ACTIVE_FULL_THRESHOLD_FREE = 5;
const ACTIVE_FULL_THRESHOLD_PRO = 8;

// Local Reputation System — pre-written tactical phrases keyed by Pulse status.
// Picked deterministically per session so the line is stable while the user
// looks at the dashboard but rotates between visits. Zero AI cost.
const GREETINGS = {
  empty: [
    "Commander, the field is clear. Deploy a game from the Backlog.",
    "All systems nominal. No active missions detected.",
    "Quiet on the wire, Commander. Pick your next target.",
    "Pulse flatlined — by design. Add a mission to spin up.",
    "Zero contacts on radar. Awaiting your orders.",
    "Standby mode engaged. Promote a Backlog title to begin.",
  ],
  emptyLibrary: [
    "Commander, the field is clear. Add a game to begin operations.",
    "Vault is empty. Time to build the arsenal.",
    "No assets logged. Run a search to deploy your first mission.",
  ],
  bottleneck: [
    "Strategic bottleneck detected. Focus on clearing current objectives.",
    "Active queue saturated. Recommend completing one mission before adding another.",
    "Cognitive load critical. Finish what you started, Commander.",
    "Multi-tasking penalty active. Lock in on a single front.",
    "Bandwidth exceeded. Triage the Pulse before deploying more.",
  ],
  heavyBacklog: [
    "Backlog accumulating. Promote a mission to the Pulse when ready.",
    "Backlog reservoir at capacity. Time to activate something.",
    "Significant pending objectives logged. Pick one and move.",
    "Backlog telemetry rising. Deploy or trim, Commander.",
  ],
  vaultHeavy: [
    "Impressive completion record, Commander. The Vault grows.",
    "Combat effectiveness: elite. Vault performance noted.",
    "Mission completion ratio nominal. Continue executing.",
    "Vault density rising — your record speaks for itself.",
  ],
  balanced: [
    "Pulse stable. Continue executing your active missions.",
    "All metrics green. Maintain current tempo.",
    "Operations nominal. Stay frosty.",
    "System equilibrium achieved. Hold the line.",
    "Steady cadence detected. Keep the pulse alive.",
    "Mission flow optimal. Trust the rhythm.",
  ],
} as const;

function pickGreeting(games: Game[], isPro: boolean): string {
  const active = games.filter((g) => g.status === "active").length;
  const backlog = games.filter((g) => g.status === "backlog").length;
  const completed = games.filter((g) => g.status === "completed").length;
  const fullThreshold = isPro ? ACTIVE_FULL_THRESHOLD_PRO : ACTIVE_FULL_THRESHOLD_FREE;

  let bucket: keyof typeof GREETINGS = "balanced";
  if (active === 0 && backlog === 0 && completed === 0) bucket = "emptyLibrary";
  else if (active === 0) bucket = "empty";
  else if (active >= fullThreshold) bucket = "bottleneck";
  else if (backlog > active * 3 && backlog >= 4) bucket = "heavyBacklog";
  else if (completed >= 5 && completed > active) bucket = "vaultHeavy";

  const pool = GREETINGS[bucket];
  return pool[Math.floor(Math.random() * pool.length)];
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
  // Greeting is picked once per Pulse-shape change so it doesn't jitter on re-render.
  const pulseSignature = useMemo(() => {
    const a = games.filter((g) => g.status === "active").length;
    const b = games.filter((g) => g.status === "backlog").length;
    const c = games.filter((g) => g.status === "completed").length;
    return `${a}-${b}-${c}-${isPro ? 1 : 0}`;
  }, [games, isPro]);
  const greeting = useMemo(() => pickGreeting(games, isPro), [pulseSignature]);
  const typed = useTypewriter(greeting);

  // ROI math is 100% client-side — zero API cost.
  // Formula: HoursSaved = (GamesCount * 0.5) + TotalVaultHours
  const stats = useMemo(() => {
    const totalGames = games.length;
    const decisionFatigueAvoided = totalGames * 0.5;
    const playtimeOptimized = games
      .filter((g) => g.status === "completed")
      .reduce((sum, g) => sum + (g.playtime ?? 0), 0);
    const hoursSaved = decisionFatigueAvoided + playtimeOptimized;
    return {
      decisionFatigueAvoided: Math.round(decisionFatigueAvoided * 10) / 10,
      playtimeOptimized: Math.round(playtimeOptimized * 10) / 10,
      hoursSaved: Math.round(hoursSaved * 10) / 10,
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

      {/* Total Hours Saved — combined ROI signal */}
      <div
        className="px-4 py-2.5 border-t border-primary/20 bg-black/40 flex items-center justify-between gap-3"
        data-testid="stat-hours-saved"
      >
        <div className="flex items-center gap-2">
          <Hourglass className="w-3.5 h-3.5 text-primary/80" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Total Hours Saved
          </span>
        </div>
        <span
          className="font-mono text-xl font-bold text-primary tabular-nums"
          style={{ textShadow: "0 0 10px rgba(0,255,159,0.7)" }}
        >
          {stats.hoursSaved}h
        </span>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 divide-x divide-primary/20 border-t border-primary/20 bg-black/40">
        <Readout
          icon={<Brain className="w-3.5 h-3.5" />}
          label="Decision Fatigue Avoided"
          value={`${stats.decisionFatigueAvoided}h`}
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
