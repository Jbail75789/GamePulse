import { useState, useRef, useEffect } from "react";
import { useGames } from "@/hooks/use-games";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { GameCard } from "@/components/GameCard";
import { AddGameModal } from "@/components/AddGameModal";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, Gamepad2, Trophy, AlertCircle, Trash2, CheckCircle2, 
  Search, Plus, Dices, Share2, Settings, AlertTriangle, Info, 
  Sword, Sofa, Bolt, Hourglass, Zap, Check, Sparkles, LogOut, Loader2 
} from "lucide-react";
import { type Game } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

type MoodMode = "chill" | "epic" | "quickfix" | "competitive" | "chaos";

const MOODS: { id: MoodMode; label: string; icon: any; color: string; ring: string }[] = [
  { id: "chill",       label: "Chill",       icon: Sofa,      color: "text-emerald-400", ring: "ring-emerald-400/60" },
  { id: "epic",        label: "Epic",        icon: Sword,     color: "text-amber-300",   ring: "ring-amber-300/60" },
  { id: "quickfix",    label: "Quick Fix",   icon: Bolt,      color: "text-lime-400",    ring: "ring-lime-400/60" },
  { id: "competitive", label: "Competitive", icon: Hourglass, color: "text-red-500",     ring: "ring-red-500/60" },
  { id: "chaos",       label: "Chaos",       icon: Zap,       color: "text-orange-500",  ring: "ring-orange-500/60" },
];

function playWinSound(_mode: MoodMode) {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.start(); o.stop(ctx.currentTime + 0.45);
  } catch {}
}

interface SearchResult {
  id: number;
  name: string;
  background_image?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { games, updateGame } = useGames();
  const { toast } = useToast();
  // --- States ---
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "backlog" | "wishlist">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchAddOpen, setSearchAddOpen] = useState(false);
  const [searchAddPrefill, setSearchAddPrefill] = useState<{ title: string; coverUrl?: string | null } | undefined>();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodMode | null>(null);
  const [winnerGame, setWinnerGame] = useState<Game | null>(null);
  const [winnerMode, setWinnerMode] = useState<MoodMode | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinGame, setSpinGame] = useState<Game | null>(null);
  const [loggingTimeId, setLoggingTimeId] = useState<number | null>(null);
  const [logHours, setLogHours] = useState<string>("1");
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [pulseCharges, setPulseCharges] = useState(3);
  const [nextRefill, setNextRefill] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(user?.isPro ?? false);
  const [showProModal, setShowProModal] = useState(false);
  const [isAILoading, setIsAILoading] = useState<number | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (user) setIsPro(user.isPro);
  }, [user]);

  // --- Logic Handlers ---
  const handleUpdateStatus = async (gameId: number, newStatus: string) => {
    const activeGamesCount = games?.filter(g => g.status === 'active').length || 0;
    const backlogGamesCount = games?.filter(g => g.status === 'backlog').length || 0;
    const currentGame = games?.find(g => g.id === gameId);
    
    if (!isPro) {
      if (newStatus === 'active' && currentGame?.status !== 'active' && activeGamesCount >= 5) {
        setShowProModal(true);
        return;
      }
      if (newStatus === 'backlog' && currentGame?.status !== 'backlog' && backlogGamesCount >= 10) {
        setShowProModal(true);
        return;
      }
    }
    
    updateGame({ id: gameId, status: newStatus });
  };

  const handleLogTime = async (game: Game) => {
    const hours = parseFloat(logHours);
    if (isNaN(hours) || hours <= 0) return;

    setIsLoggingTime(true);
    try {
      const newTotal = (game.playtime || 0) + hours;
      const target = game.targetHours || 20;
      const newProgress = Math.min(100, Math.floor((newTotal / target) * 100));
     
      await updateGame({
        id: game.id,
        playtime: newTotal,
        progress: newProgress,
        status: newProgress >= 100 ? "completed" : game.status,
      });

      toast({ title: "Time Logged", description: `+${hours}h added to ${game.title}` });
      setLoggingTimeId(null);
      setLogHours("1");
    } catch (error) {
      toast({ title: "Update Failed", variant: "destructive" });
    } finally {
      setIsLoggingTime(false);
    }
  };

  const handleAIVibeCheck = async (gameTitle: string, gameId: number) => {
    setIsAILoading(gameId);
    try {
      const res = await fetch("/api/ai/vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: gameTitle }),
      });
      const data = await res.json();
      toast({ title: `${gameTitle} Vibe Check`, description: data.vibe });
    } catch (error) {
      toast({ title: "Codex Offline", variant: "destructive" });
    } finally {
      setIsAILoading(null);
    }
   };

  const handleSpinRoulette = (mood: MoodMode) => {
    const pool = (games || []).filter(g => g.status === "backlog" && (mood === "chaos" || g.vibe === mood || !g.vibe));
    const candidates = pool.length > 0 ? pool : (games || []).filter(g => g.status === "backlog");
    if (candidates.length === 0) {
      toast({ title: "Empty Backlog", description: "Add games to your backlog first.", variant: "destructive" });
      return;
    }
    if (!isPro) setPulseCharges(c => Math.max(0, c - 1));
    setSelectedMood(mood);
    setIsSpinning(true);
    let ticks = 0;
    const total = 18 + Math.floor(Math.random() * 8);
    const interval = setInterval(() => {
      setSpinGame(candidates[Math.floor(Math.random() * candidates.length)]);
      ticks++;
      if (ticks >= total) {
        clearInterval(interval);
        const winner = candidates[Math.floor(Math.random() * candidates.length)];
        setSpinGame(null);
        setIsSpinning(false);
        setShowRoulette(false);
        setWinnerMode(mood);
        setWinnerGame(winner);
        playWinSound(mood);
        if (mood !== "chaos") confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }
    }, 80);
  };

  // --- UI Helpers ---
  const tabData = [
    { id: "active",    label: "My Pulse",    icon: Gamepad2, color: "text-primary",    hover: "hover:text-primary" },
    { id: "completed", label: "The Vault",   icon: Trophy,   color: "text-secondary",  hover: "hover:text-secondary" },
    { id: "backlog",   label: "The Backlog", icon: Clock,    color: "text-accent",     hover: "hover:text-accent" },
    { id: "wishlist",  label: "Wish List",   icon: Sword,    color: "text-foreground", hover: "hover:text-foreground" },
  ] as const;

  const filteredGames = games?.filter(game => game.status === activeTab) || [];

  return (
    <Layout>
      {/* 1. Modals/Dialogs Section */}
      <Dialog open={showProModal} onOpenChange={setShowProModal}>
        <DialogContent className="bg-[#161616] border-purple-500/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-white uppercase">Unlock Full Pulse</DialogTitle>
            <DialogDescription>System limits reached. Upgrade to Pro for unlimited storage.</DialogDescription>
          </DialogHeader>
          <Button className="bg-purple-600 hover:bg-purple-500 w-full py-6 text-lg font-bold">UPGRADE FOR $0.99</Button>
        </DialogContent>
      </Dialog>

      {/* 2. Header Section */}
      <div className="space-y-8 pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase tracking-wider">Mission Control</h1>
            <p className="text-sm text-muted-foreground font-mono">Manage your gaming operations.</p>
            </div>

          <div className="flex gap-3 w-full md:w-auto">
            <Button 
              onClick={() => setShowRoulette(true)} 
              className="flex-1 md:flex-none bg-secondary text-background font-bold uppercase"
              disabled={!isPro && pulseCharges === 0}
            >
              <Dices className="mr-2 h-5 w-5" /> Pick a Game
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowSettingsModal(true)}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* 3. Search Bar Section */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a new target..."
            className="w-full bg-card/50 border border-border rounded-lg pl-10 pr-4 py-3 font-mono focus:border-primary outline-none"
          />
        </div>

        {/* 4. Tab Navigation — Staggered Hover (only hovered category glows) */}
        <div className="group/tabs flex gap-2 border-b border-white/5 pb-2 overflow-x-auto" data-testid="nav-categories">
          {tabData.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
                className={[
                  "relative flex items-center gap-2 px-4 py-2 font-display uppercase tracking-widest text-xs",
                  "transition-all duration-300 ease-out",
                  // Base color
                  isActive ? `${tab.color} border-b-2 border-current` : "text-muted-foreground",
                  // Staggered: dim & desaturate every tab when ANY sibling is hovered
                  "group-hover/tabs:opacity-40 group-hover/tabs:saturate-50 group-hover/tabs:blur-[0.3px]",
                  // Reverse it on the actual hovered tab — full glow + scale
                  "hover:!opacity-100 hover:!saturate-100 hover:!blur-0 hover:scale-105 hover:drop-shadow-[0_0_10px_currentColor]",
                  tab.hover,
                ].join(" ")}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 5. Game Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredGames.map((game) => (
              <motion.div key={game.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <GameCard
                  game={game}
                  onUpdateStatus={handleUpdateStatus}
                  onLogTime={() => setLoggingTimeId(game.id)}
                  isLogging={loggingTimeId === game.id}
                  isAILoading={isAILoading === game.id}
                  onAIVibeCheck={() => handleAIVibeCheck(game.title, game.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty State */}
          {filteredGames.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-xl">
              <Plus className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-mono">No data found in {activeTab}.</p>
            </div>
          )}
        </div>
      </div>

      <AddGameModal
        open={searchAddOpen} 
        onOpenChange={setSearchAddOpen} 
        prefill={searchAddPrefill}
      />

      {/* Roulette: Mood Selection + Spin */}
      <Dialog open={showRoulette} onOpenChange={(o) => { if (!isSpinning) setShowRoulette(o); }}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-widest text-center">
              {isSpinning ? "Spinning…" : "Pick Your Mood"}
            </DialogTitle>
            <DialogDescription className="text-center font-mono text-xs">
              {isSpinning ? (spinGame?.title ?? "...") : "We'll roll a backlog game that matches the vibe."}
            </DialogDescription>
          </DialogHeader>

          {!isSpinning ? (
            <div className="grid grid-cols-2 gap-3 pt-2" data-testid="grid-mood-roulette">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSpinRoulette(m.id)}
                  data-testid={`button-mood-${m.id}`}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-white/5 border border-white/10 hover-elevate active-elevate-2 transition-all ${m.color} ring-1 ${m.ring} ring-inset`}
                >
                  <m.icon className="w-7 h-7" />
                  <span className="font-display uppercase text-xs tracking-widest">{m.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 flex items-center justify-center">
              <Dices className="w-16 h-16 text-secondary animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Winner Dialog with mode-specific overlays */}
      <Dialog open={!!winnerGame} onOpenChange={(o) => { if (!o) { setWinnerGame(null); setWinnerMode(null); } }}>
        <DialogContent
          className="bg-[#0a0a0a] border-white/10 max-w-lg overflow-hidden p-0"
          data-testid={`dialog-winner-${winnerMode ?? "none"}`}
        >
          <div className={`relative ${winnerMode === "chaos" ? "chaos-shake" : ""}`}>
            {/* === Mode-specific overlay layers === */}
            {winnerMode === "chill" && (
              <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
                {[0, 0.6, 1.2, 1.8].map((delay, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full border border-emerald-300/70"
                    style={{
                      width: 220, height: 220,
                      animation: `water-ripple 2.4s ease-out ${delay}s infinite`,
                      boxShadow: "0 0 24px rgba(110, 231, 183, 0.35) inset",
                    }}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-radial from-emerald-500/10 via-transparent to-transparent" />
              </div>
            )}

            {winnerMode === "epic" && (
              <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
                <div
                  className="absolute"
                  style={{
                    width: 600, height: 600,
                    background:
                      "conic-gradient(from 0deg, rgba(252,211,77,0.55) 0deg, transparent 18deg, rgba(252,211,77,0.55) 36deg, transparent 54deg, rgba(252,211,77,0.55) 72deg, transparent 90deg, rgba(252,211,77,0.55) 108deg, transparent 126deg, rgba(252,211,77,0.55) 144deg, transparent 162deg, rgba(252,211,77,0.55) 180deg, transparent 198deg, rgba(252,211,77,0.55) 216deg, transparent 234deg, rgba(252,211,77,0.55) 252deg, transparent 270deg, rgba(252,211,77,0.55) 288deg, transparent 306deg, rgba(252,211,77,0.55) 324deg, transparent 342deg)",
                    maskImage: "radial-gradient(circle, transparent 70px, black 90px, black 280px, transparent 320px)",
                    WebkitMaskImage: "radial-gradient(circle, transparent 70px, black 90px, black 280px, transparent 320px)",
                    animation: "sunburst-rotate 14s linear infinite",
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 180, height: 180,
                    background: "radial-gradient(circle, rgba(253,224,71,0.55) 0%, rgba(253,224,71,0) 70%)",
                    animation: "sunburst-pulse 2.4s ease-in-out infinite",
                  }}
                />
              </div>
            )}

            {winnerMode === "quickfix" && (
              <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div
                  className="absolute inset-0 bg-white"
                  style={{ animation: "camera-pop-flash 0.7s ease-out forwards" }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    boxShadow: "inset 0 0 120px 40px rgba(132, 204, 22, 0.55)",
                    animation: "camera-pop-vignette 1.4s ease-out forwards",
                  }}
                />
              </div>
            )}

            {winnerMode === "competitive" && (
              <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-x-0 h-1 bg-red-500/70" style={{ animation: "reticle-scan 1.6s linear infinite", boxShadow: "0 0 12px rgba(239,68,68,0.9)" }} />
                <div
                  className="relative"
                  style={{ width: 280, height: 280, animation: "reticle-lock 0.7s cubic-bezier(.2,1.4,.4,1) forwards" }}
                >
                  <div className="absolute inset-0 rounded-full border-2 border-red-500/80" />
                  <div className="absolute inset-6 rounded-full border border-red-500/50" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-500/70 -translate-x-1/2" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-red-500/70 -translate-y-1/2" />
                  {[0, 90, 180, 270].map(a => (
                    <div key={a} className="absolute left-1/2 top-1/2 w-6 h-6 border-l-2 border-t-2 border-red-500" style={{ transform: `translate(-50%,-50%) rotate(${a}deg) translateY(-130px)` }} />
                  ))}
                </div>
              </div>
            )}

            {winnerMode === "chaos" && (
              <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-orange-900/40 via-transparent to-transparent" />
                {Array.from({ length: 14 }).map((_, i) => {
                  const left = 5 + Math.random() * 90;
                  const drift = (Math.random() - 0.5) * 80;
                  const size = 4 + Math.random() * 6;
                  const delay = Math.random() * 1.2;
                  return (
                    <div
                      key={i}
                      className="absolute rounded-full bg-orange-400"
                      style={{
                        left: `${left}%`,
                        bottom: 0,
                        width: size, height: size,
                        boxShadow: "0 0 8px rgba(251,146,60,0.95)",
                        ['--em-drift' as any]: `${drift}px`,
                        animation: `ember-rise 2.2s ease-out ${delay}s infinite`,
                      }}
                    />
                  );
                })}
                <div className="absolute inset-x-0 top-12 h-8 bg-cyan-400/40 mix-blend-screen" style={{ animation: "glitch-band 1.4s steps(2,end) infinite" }} />
                <div className="absolute inset-x-0 top-24 h-6 bg-pink-500/40 mix-blend-screen" style={{ animation: "glitch-band 1.7s steps(2,end) 0.2s infinite" }} />
              </div>
            )}

            {/* === Winner content === */}
            <div className="relative z-10 p-8">
              <DialogHeader>
                <DialogTitle className="font-display uppercase tracking-widest text-center text-2xl" data-testid="text-winner-title">
                  {winnerMode === "chaos" ? "CHAOS DEMANDS" : "Your Mission"}
                </DialogTitle>
                <DialogDescription className="text-center font-mono text-xs">
                  {winnerMode ? `Mood: ${winnerMode.toUpperCase()}` : ""}
                </DialogDescription>
              </DialogHeader>
              {winnerGame && (
                <div className="mt-6 flex flex-col items-center gap-4">
                  {winnerGame.coverUrl && (
                    <img
                      src={winnerGame.coverUrl}
                      alt={winnerGame.title}
                      className="w-40 h-56 object-cover rounded-lg border border-white/10 shadow-2xl"
                      data-testid={`img-winner-${winnerGame.id}`}
                    />
                  )}
                  <h2 className="text-3xl font-display uppercase text-center" data-testid={`text-winner-name-${winnerGame.id}`}>
                    {winnerGame.title}
                  </h2>
                  <div className="flex gap-3 mt-2">
                    <Button
                      onClick={() => {
                        if (winnerGame) handleUpdateStatus(winnerGame.id, "active");
                        setWinnerGame(null); setWinnerMode(null);
                      }}
                      className="bg-primary text-background font-bold uppercase"
                      data-testid="button-winner-accept"
                    >
                      <Check className="mr-2 h-4 w-4" /> Accept
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => { setWinnerGame(null); setWinnerMode(null); }}
                      data-testid="button-winner-skip"
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}