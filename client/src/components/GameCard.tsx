import { type Game } from "@shared/schema";
import { CyberCard } from "./CyberCard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  Gamepad2,
  Trophy,
  Sword,
  MoreVertical,
  Sparkles,
  Loader2,
  Plus,
} from "lucide-react";

interface GameCardProps {
  game: Game;
  onUpdateStatus: (id: number, status: string) => void;
  onLogTime: () => void;
  isLogging?: boolean;
  isAILoading?: boolean;
  onAIVibeCheck: () => void;
  onDelete?: (id: number) => void;
}

const STATUS_OPTIONS: { id: Game["status"]; label: string; icon: any }[] = [
  { id: "active",    label: "My Pulse",    icon: Gamepad2 },
  { id: "completed", label: "The Vault",   icon: Trophy },
  { id: "backlog",   label: "The Backlog", icon: Clock },
  { id: "wishlist",  label: "Wish List",   icon: Sword },
];

const VIBE_COLOR: Record<string, string> = {
  Chill: "text-emerald-400 border-emerald-400/40",
  Epic: "text-amber-300 border-amber-300/40",
  "Quick Fix": "text-lime-400 border-lime-400/40",
  Competitive: "text-red-500 border-red-500/40",
  Gritty: "text-zinc-300 border-zinc-300/40",
};

export function GameCard({
  game,
  onUpdateStatus,
  onLogTime,
  isLogging,
  isAILoading,
  onAIVibeCheck,
  onDelete,
}: GameCardProps) {
  const progress = game.progress ?? 0;
  const playtime = game.playtime ?? 0;
  const target = game.targetHours ?? 20;

  return (
    <CyberCard glowColor="primary" className="p-0 overflow-hidden">
      <div className="relative" data-testid={`card-game-${game.id}`}>
        {/* Cover */}
        <div className="relative h-40 w-full overflow-hidden bg-black/40">
          {game.coverUrl ? (
            <img
              src={game.coverUrl}
              alt={game.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              data-testid={`img-cover-${game.id}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Gamepad2 className="w-10 h-10 opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

          {/* AI Codex Icon — top-right */}
          <button
            onClick={onAIVibeCheck}
            disabled={isAILoading}
            data-testid={`button-ai-vibe-${game.id}`}
            title="AI Vibe Check"
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/70 border border-primary/40 backdrop-blur flex items-center justify-center text-primary hover:bg-primary/20 hover:border-primary hover:shadow-[0_0_12px_rgba(0,255,159,0.6)] transition-all disabled:opacity-50"
          >
            {isAILoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </button>

          {/* Vibe Pill — top-left */}
          {game.vibe && (
            <span
              className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-mono border bg-black/70 backdrop-blur ${VIBE_COLOR[game.vibe] ?? "text-white border-white/30"}`}
              data-testid={`badge-vibe-${game.id}`}
            >
              {game.vibe}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-display uppercase text-lg leading-tight tracking-wide line-clamp-2"
              data-testid={`text-title-${game.id}`}
            >
              {game.title}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded hover:bg-white/5 text-muted-foreground"
                  data-testid={`button-menu-${game.id}`}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                {STATUS_OPTIONS.filter(s => s.id !== game.status).map(s => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => onUpdateStatus(game.id, s.id)}
                    className="cursor-pointer font-mono text-xs"
                    data-testid={`menu-move-${game.id}-${s.id}`}
                  >
                    <s.icon className="w-3.5 h-3.5 mr-2" /> Move to {s.label}
                  </DropdownMenuItem>
                ))}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(game.id)}
                    className="cursor-pointer font-mono text-xs text-destructive"
                    data-testid={`menu-delete-${game.id}`}
                  >
                    Purge Entry
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
            <span data-testid={`text-platform-${game.id}`}>{game.platform || "PC"}</span>
            <span data-testid={`text-playtime-${game.id}`}>{playtime}h / {target}h</span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-500"
              style={{ width: `${Math.min(100, progress)}%` }}
              data-testid={`bar-progress-${game.id}`}
            />
          </div>

          {/* Log Time button */}
          {(game.status === "active" || game.status === "backlog") && (
            <Button
              onClick={onLogTime}
              disabled={isLogging}
              variant="outline"
              size="sm"
              className="w-full font-mono text-xs uppercase tracking-widest"
              data-testid={`button-log-time-${game.id}`}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {isLogging ? "Logging…" : "Log Time"}
            </Button>
          )}
        </div>
      </div>
    </CyberCard>
  );
}
