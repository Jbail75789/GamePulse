import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { type Game } from "@shared/schema";
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
  Trash2,
} from "lucide-react";

type GlowColor = "primary" | "secondary" | "accent" | "none";

interface CyberCardBaseProps {
  className?: string;
  glowColor?: GlowColor;
  title?: string;
  subtitle?: string;
}

interface CyberCardWrapperProps extends CyberCardBaseProps {
  children: ReactNode;
  game?: undefined;
}

interface CyberCardGameProps extends CyberCardBaseProps {
  children?: undefined;
  game: Game;
  onUpdateStatus: (id: number, status: string) => void;
  onLogTime: () => void;
  isLogging?: boolean;
  isAILoading?: boolean;
  onAIVibeCheck: () => void;
  onDelete?: (id: number) => void;
}

type CyberCardProps = CyberCardWrapperProps | CyberCardGameProps;

const GLOWS: Record<GlowColor, string> = {
  primary: "hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,255,159,0.15)]",
  secondary: "hover:border-secondary/50 hover:shadow-[0_0_30px_rgba(0,184,255,0.15)]",
  accent: "hover:border-accent/50 hover:shadow-[0_0_30px_rgba(214,0,255,0.15)]",
  none: "",
};

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

function ShellChrome() {
  return (
    <>
      {/* Header sweep */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {/* Cyberpunk corner brackets */}
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/10 group-hover:border-primary/30 transition-colors pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/10 group-hover:border-primary/30 transition-colors pointer-events-none" />
      {/* Scanline overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,20,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
    </>
  );
}

export function CyberCard(props: CyberCardProps) {
  const { className, glowColor = "none", title, subtitle } = props;

  // === GAME CARD MODE ===
  if ("game" in props && props.game) {
    const { game, onUpdateStatus, onLogTime, isLogging, isAILoading, onAIVibeCheck, onDelete } = props;
    const progress = game.progress ?? 0;
    const playtime = game.playtime ?? 0;
    const target = game.targetHours ?? 20;

    return (
      <div
        className={cn(
          "relative bg-card border border-border/50 overflow-hidden transition-all duration-300 group rounded-md",
          GLOWS[glowColor === "none" ? "primary" : glowColor],
          className
        )}
        data-testid={`card-game-${game.id}`}
      >
        <ShellChrome />

        {/* Cover */}
        <div className="relative z-10 h-40 w-full overflow-hidden bg-black/40">
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

          {/* AI Vibe Check icon — top-right */}
          <button
            onClick={onAIVibeCheck}
            disabled={isAILoading}
            data-testid={`button-ai-vibe-${game.id}`}
            title="AI Vibe Check"
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/70 border border-primary/40 backdrop-blur flex items-center justify-center text-primary hover:bg-primary/20 hover:border-primary hover:shadow-[0_0_12px_rgba(0,255,159,0.6)] transition-all disabled:opacity-50"
          >
            {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>

          {/* Vibe pill — top-left */}
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
        <div className="relative z-10 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display uppercase text-lg leading-tight tracking-wide line-clamp-2" data-testid={`text-title-${game.id}`}>
              {game.title}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded hover:bg-white/5 text-muted-foreground" data-testid={`button-menu-${game.id}`}>
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

          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-500"
              style={{ width: `${Math.min(100, progress)}%` }}
              data-testid={`bar-progress-${game.id}`}
            />
          </div>

          <div className="flex gap-2">
            {(game.status === "active" || game.status === "backlog") && (
              <Button
                onClick={onLogTime}
                disabled={isLogging}
                variant="outline"
                size="sm"
                className="flex-1 font-mono text-xs uppercase tracking-widest"
                data-testid={`button-log-time-${game.id}`}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {isLogging ? "Logging…" : "Log Time"}
              </Button>
            )}
            {onDelete && (
              <Button
                onClick={() => onDelete(game.id)}
                variant="outline"
                size="sm"
                className="font-mono text-xs uppercase tracking-widest text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                data-testid={`button-delete-${game.id}`}
                title="Delete game"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === GENERIC WRAPPER MODE ===
  return (
    <div
      className={cn(
        "relative bg-card border border-border/50 p-3 sm:p-4 md:p-6 overflow-hidden transition-all duration-300 group",
        GLOWS[glowColor],
        className
      )}
    >
      <ShellChrome />
      {(title || subtitle) && (
        <div className="mb-6 relative z-10">
          {title && <h3 className="text-xl font-display font-bold uppercase tracking-wide text-foreground">{title}</h3>}
          {subtitle && <p className="text-sm font-mono text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      )}
      <div className="relative z-10">{props.children}</div>
    </div>
  );
}
