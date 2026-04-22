import { ReactNode, useState } from "react";
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
  Pencil,
  Wand2,
  Check,
  X,
  Infinity as InfinityIcon,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEstimate } from "@/hooks/use-estimate";

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
  onUpdateTarget?: (id: number, targetHours: number) => void;
  onGoInfinite?: (id: number) => void;
  onRemoveTarget?: (id: number) => void;
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
    const { game, onUpdateStatus, onLogTime, isLogging, isAILoading, onAIVibeCheck, onDelete, onUpdateTarget, onGoInfinite, onRemoveTarget } = props;
    const playtime = game.playtime ?? 0;
    const isInfinite = !!game.infiniteMode;
    const noTarget = isInfinite && (game.targetHours == null);
    const target = game.targetHours && game.targetHours > 0 ? game.targetHours : 40;
    // Overtime visuals are suppressed when Infinite Mode is active.
    const overtimeHours = Math.max(0, playtime - target);
    const isOvertime = !isInfinite && overtimeHours > 0;

    // Format decimal hours → "45m" (<1h) | "1h 30m" (with mins) | "2h" (whole)
    const fmtHM = (decH: number) => {
      const totalMins = Math.round(decH * 60);
      if (totalMins < 60) return `${totalMins}m`;
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return m === 0 ? `${h}h` : `${h}h ${m}m`;
    };
    // Progress: completed/overtime/infinite peg the bar; otherwise standard ratio.
    // In Infinite Mode the bar stays pinned at 100% — it's a "completed forever" indicator.
    const progress = isInfinite
      ? 100
      : isOvertime
      ? 100
      : game.status === "completed"
      ? 100
      : Math.min(100, Math.floor((playtime / target) * 100));
    // GO INFINITE eligibility: any non-infinite game that's hit its target — including
    // vaulted (completed) ones. Lets the user resurrect a classic from The Vault into
    // Infinite Mode without losing accumulated playtime.
    const canGoInfinite =
      !isInfinite &&
      (game.status === "active" || game.status === "completed") &&
      !!onGoInfinite &&
      target > 0 &&
      playtime >= target;
    const [editingTarget, setEditingTarget] = useState(false);
    const [targetDraft, setTargetDraft] = useState<string>(String(target));
    const { toast } = useToast();

    // Proactive AI estimate (Main + Full) — auto-fetched once per session per title
    const { data: estimate, isLoading: estimateLoading, isError: estimateError, refetch: refetchEstimate } = useEstimate(game.title, !!onUpdateTarget);

    const commitTarget = (val: string) => {
      const v = parseInt(val, 10);
      if (!isNaN(v) && v > 0 && v !== target && onUpdateTarget) onUpdateTarget(game.id, v);
      setEditingTarget(false);
    };

    const applySuggestion = (hrs: number, label: string) => {
      if (!onUpdateTarget) return;
      onUpdateTarget(game.id, hrs);
      toast({ title: "Pulse Target Synced", description: `${label}: ${hrs}h` });
    };

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

          {/* AI Vibe Check icon — top-right. Stays flat (with hover glow) on every card so
              the AI Suggested Hours badge in the body is the only "always on" AI signal. */}
          <button
            onClick={onAIVibeCheck}
            disabled={isAILoading}
            data-testid={`button-ai-vibe-${game.id}`}
            title="AI Vibe Check"
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/70 border border-primary/40 backdrop-blur flex items-center justify-center text-primary hover:bg-primary/20 hover:border-primary hover:shadow-[0_0_12px_rgba(0,255,159,0.6)] transition-all disabled:opacity-50"
          >
            {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>

          {/* Top-left badges: Legacy (Infinite) marker first, then vibe pill */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            {isInfinite && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-mono border border-primary bg-black/70 backdrop-blur text-primary animate-[neonPulse_2.4s_ease-in-out_infinite]"
                style={{ textShadow: "0 0 6px rgba(0,255,159,0.9)" }}
                data-testid={`badge-legacy-${game.id}`}
                title="Legacy / Infinite Mode — playtime keeps climbing"
              >
                <InfinityIcon
                  className="w-3 h-3"
                  style={{ filter: "drop-shadow(0 0 4px rgba(0,255,159,0.95))" }}
                />
                Legacy
              </span>
            )}
            {game.vibe && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-mono border bg-black/70 backdrop-blur ${VIBE_COLOR[game.vibe] ?? "text-white border-white/30"}`}
                data-testid={`badge-vibe-${game.id}`}
              >
                {game.vibe}
              </span>
            )}
          </div>

          {/* HUD-style playtime / target — bottom-left, with edit pencil */}
          <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5">
            <span
              className={`font-mono text-[11px] tracking-widest ${
                isInfinite
                  ? "text-primary animate-[neonTextPulse_2.4s_ease-in-out_infinite]"
                  : isOvertime
                  ? "text-yellow-300 animate-[overtimeText_1.6s_ease-in-out_infinite]"
                  : "text-emerald-400 drop-shadow-[0_0_6px_rgba(0,255,159,0.85)]"
              }`}
              data-testid={`text-total-time-${game.id}`}
              title={
                isInfinite
                  ? `Infinite Mode — original target ${target}h, played ${fmtHM(playtime)}`
                  : isOvertime
                  ? `Played ${fmtHM(playtime)} vs ${target}h target`
                  : undefined
              }
            >
              {isInfinite
                ? noTarget
                  ? `PLAYTIME: ${fmtHM(playtime)} (INFINITE)`
                  : `PLAYTIME: ${fmtHM(playtime)} / ${target}h (INFINITE)`
                : isOvertime
                ? `OVERTIME +${fmtHM(overtimeHours)}`
                : `${fmtHM(playtime)} / ${target}h`}
            </span>
            {onUpdateTarget && (
              <button
                type="button"
                onClick={() => { setTargetDraft(String(target)); setEditingTarget(true); }}
                title="Edit target hours"
                className="w-5 h-5 rounded-sm bg-black/60 border border-emerald-400/40 flex items-center justify-center text-emerald-300 hover:bg-emerald-400/20 hover:border-emerald-400 transition-all"
                data-testid={`button-edit-target-${game.id}`}
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
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
            <div className="flex items-center gap-1.5">
              {editingTarget && onUpdateTarget ? (
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    autoFocus
                    value={targetDraft}
                    onChange={(e) => setTargetDraft(e.target.value)}
                    onBlur={() => commitTarget(targetDraft)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") { setTargetDraft(String(target)); setEditingTarget(false); }
                    }}
                    className="w-14 bg-black/60 border border-primary/40 rounded px-1 py-0.5 text-right text-primary outline-none focus:border-primary"
                    data-testid={`input-target-${game.id}`}
                  />
                  <span>h</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdateTarget && (setTargetDraft(String(target)), setEditingTarget(true))}
                  className={`${onUpdateTarget ? "hover:text-primary" : ""}`}
                  data-testid={`text-target-${game.id}`}
                  title={onUpdateTarget ? "Click to edit target" : undefined}
                >
                  Target: {target}h
                </button>
              )}
            </div>
          </div>

          {/* Proactive AI Estimate Badge — Main / Full with one-click sync */}
          {onUpdateTarget && (() => {
            // "Still on default" = user has never customized target (null OR equal to schema default 40)
            const isDefault = game.targetHours == null || game.targetHours === 40;
            const needsAttention = isDefault && !!estimate;
            return (
            <div
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-[10px] font-mono border-primary/70 bg-primary/10 text-primary animate-[neonPulse_2.4s_ease-in-out_infinite] hover:brightness-150 hover:saturate-150 transition-[filter] ${
                needsAttention ? "animate-[neonPulse_1.4s_ease-in-out_infinite]" : ""
              }`}
              data-testid={`badge-ai-suggest-${game.id}`}
              title={needsAttention ? `Default target — sync the AI estimate. ${estimate?.note ?? ""}` : estimate?.note}
            >
              <Sparkles className="w-3 h-3 text-secondary shrink-0" />
              {estimateLoading && (
                <span className="text-secondary/70 animate-pulse uppercase tracking-widest">AI scanning…</span>
              )}
              {estimateError && !estimateLoading && (
                <button
                  type="button"
                  onClick={() => refetchEstimate()}
                  className="text-muted-foreground hover:text-secondary uppercase tracking-widest"
                  data-testid={`button-ai-retry-${game.id}`}
                >
                  AI estimate failed — retry
                </button>
              )}
              {estimate && !estimateLoading && (
                <>
                  <span className="text-muted-foreground uppercase tracking-widest shrink-0">AI:</span>
                  <button
                    type="button"
                    onClick={() => applySuggestion(estimate.main, "Main Story")}
                    className={`group/sync flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-secondary/15 transition-all ${target === estimate.main ? "text-secondary" : "text-foreground hover:text-secondary"}`}
                    title={`Sync target → ${estimate.main}h (Main Story)`}
                    data-testid={`button-sync-main-${game.id}`}
                  >
                    <span className="font-bold">{estimate.main}h</span>
                    <span className="text-muted-foreground text-[9px] uppercase">Main</span>
                    {target === estimate.main ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Check className="w-3 h-3 opacity-50 group-hover/sync:opacity-100 group-hover/sync:text-secondary" />
                    )}
                  </button>
                  <span className="text-muted-foreground/50">/</span>
                  <button
                    type="button"
                    onClick={() => applySuggestion(estimate.full, "Completionist")}
                    className={`group/sync flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent/15 transition-all ${target === estimate.full ? "text-accent" : "text-foreground hover:text-accent"}`}
                    title={`Sync target → ${estimate.full}h (Completionist / 100%)`}
                    data-testid={`button-sync-full-${game.id}`}
                  >
                    <span className="font-bold">{estimate.full}h</span>
                    <span className="text-muted-foreground text-[9px] uppercase">Full</span>
                    {target === estimate.full ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Check className="w-3 h-3 opacity-50 group-hover/sync:opacity-100 group-hover/sync:text-accent" />
                    )}
                  </button>
                </>
              )}
            </div>
            );
          })()}

          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isOvertime
                  ? "bg-gradient-to-r from-yellow-300 via-amber-400 to-purple-500 animate-[overtimePulse_1.6s_ease-in-out_infinite]"
                  : "bg-gradient-to-r from-primary via-secondary to-accent"
              }`}
              style={{ width: `${Math.min(100, progress)}%` }}
              data-testid={`bar-progress-${game.id}`}
            />
          </div>

          {(game.status === "active" || game.status === "backlog") && (
            <div
              className="flex items-center rounded-md border border-white/10 bg-black/30 p-0.5 font-mono text-[10px] uppercase tracking-widest"
              data-testid={`toggle-status-${game.id}`}
              role="tablist"
              aria-label="Toggle game status"
            >
              <button
                type="button"
                role="tab"
                aria-selected={game.status === "active"}
                onClick={() => game.status !== "active" && onUpdateStatus(game.id, "active")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded transition-all ${
                  game.status === "active"
                    ? "bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,255,159,0.4)] border border-primary/50"
                    : "text-muted-foreground hover:text-primary"
                }`}
                data-testid={`toggle-active-${game.id}`}
              >
                <Gamepad2 className="w-3 h-3" /> Active
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={game.status === "backlog"}
                onClick={() => game.status !== "backlog" && onUpdateStatus(game.id, "backlog")}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded transition-all ${
                  game.status === "backlog"
                    ? "bg-accent/20 text-accent shadow-[0_0_10px_rgba(214,0,255,0.4)] border border-accent/50"
                    : "text-muted-foreground hover:text-accent"
                }`}
                data-testid={`toggle-backlog-${game.id}`}
              >
                <Clock className="w-3 h-3" /> Backlog
              </button>
            </div>
          )}

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
            {game.status === "completed" && (
              <Button
                onClick={() => onUpdateStatus(game.id, "active")}
                variant="outline"
                size="sm"
                className="flex-1 font-mono text-xs uppercase tracking-widest border-yellow-300/60 text-yellow-300 hover:bg-yellow-300/10 hover:text-yellow-200 shadow-[0_0_10px_rgba(250,204,21,0.25)]"
                data-testid={`button-keep-pulse-${game.id}`}
                title="Push it back into your active rotation — overtime visuals enabled"
              >
                <Gamepad2 className="w-3.5 h-3.5 mr-1.5" />
                Keep in Pulse
              </Button>
            )}
            {canGoInfinite && (
              <Button
                onClick={() => onGoInfinite!(game.id)}
                size="sm"
                className="flex-1 font-mono text-xs uppercase tracking-widest text-black bg-primary border-0 hover:brightness-110 font-bold"
                data-testid={`button-go-infinite-${game.id}`}
                title="Lock this run into Infinite Mode — counts up forever"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Go Infinite
              </Button>
            )}
            {isInfinite && onRemoveTarget && !noTarget && (
              <Button
                onClick={() => onRemoveTarget(game.id)}
                variant="outline"
                size="sm"
                className="flex-1 font-mono text-xs uppercase tracking-widest border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10"
                data-testid={`button-remove-target-${game.id}`}
                title="Drop the target — let playtime count up forever"
              >
                ∞ Remove Target
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
