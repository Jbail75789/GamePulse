import { useState, useRef, useEffect } from "react";
import { useGames } from "@/hooks/use-games";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { CyberCard } from "@/components/CyberCard";
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

let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return null;
    if (!_audioCtx) _audioCtx = new Ctx();
    return _audioCtx;
  } catch { return null; }
}

function playClick() {
  const ctx = getAudioCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(1500, t);
  o.frequency.exponentialRampToValueAtTime(900, t + 0.04);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g); g.connect(ctx.destination);
  o.start(t); o.stop(t + 0.06);
}

function playWinSound(_mode: MoodMode) {
  const ctx = getAudioCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.frequency.setValueAtTime(440, t);
  o.frequency.exponentialRampToValueAtTime(880, t + 0.18);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.start(t); o.stop(t + 0.55);
}

const WHEEL_PALETTE = ["#00ff9f", "#00b8ff", "#d600ff", "#facc15", "#ef4444", "#a78bfa", "#f97316", "#22d3ee"];

interface SearchResult {
  id: number;
  name: string;
  background_image?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { games, updateGame, deleteGame } = useGames();
  const { toast } = useToast();
  // --- States ---
  const [activeTab, setActiveTab] = useState<"missions" | "completed" | "wishlist">("missions");
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
  const [wheelCandidates, setWheelCandidates] = useState<Game[]>([]);
  const [reelGame, setReelGame] = useState<Game | null>(null);
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

  // RAWG search — debounced
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const key = import.meta.env.VITE_RAWG_API_KEY;
        const res = await fetch(
          `https://api.rawg.io/api/games?key=${key}&search=${encodeURIComponent(q)}&page_size=8`
        );
        const data = await res.json();
        setSearchResults(
          (data.results || []).map((g: any) => ({
            id: g.id,
            name: g.name,
            background_image: g.background_image,
          }))
        );
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const handlePickSearchResult = (r: SearchResult) => {
    setSearchAddPrefill({ title: r.name, coverUrl: r.background_image ?? null });
    setSearchAddOpen(true);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleOpenAddManual = () => {
    setSearchAddPrefill(undefined);
    setSearchAddOpen(true);
  };

  const handleSpinRoulette = () => {
    const candidates = (games || []).filter(g => g.status === "backlog");
    if (candidates.length === 0) {
      toast({ title: "Empty Backlog", description: "Add games to your backlog first.", variant: "destructive" });
      return;
    }
    if (!isPro) setPulseCharges(c => Math.max(0, c - 1));
    setShowRoulette(true);
    setWheelCandidates(candidates);
    setIsSpinning(true);
    setReelGame(candidates[0]);

    const actx = getAudioCtx();
    if (actx && actx.state === "suspended") actx.resume().catch(() => {});

    const maxIterations = 20;
    let iter = 0;
    const winner = candidates[Math.floor(Math.random() * candidates.length)];

    const interval = setInterval(() => {
      iter++;
      if (iter >= maxIterations) {
        clearInterval(interval);
        setReelGame(winner);
        playClick();
        setTimeout(() => {
          setIsSpinning(false);
          setShowRoulette(false);
          setWinnerMode(null);
          setWinnerGame(winner);
          playWinSound("epic");
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }, 350);
      } else {
        setReelGame(candidates[Math.floor(Math.random() * candidates.length)]);
        playClick();
      }
    }, 110);
  };

  // --- UI Helpers ---
  const tabData = [
    { id: "missions",  label: "Mission Control", icon: Gamepad2, color: "text-primary",    hover: "hover:text-primary" },
    { id: "completed", label: "The Vault",       icon: Trophy,   color: "text-secondary",  hover: "hover:text-secondary" },
    { id: "wishlist",  label: "Wish List",       icon: Sword,    color: "text-foreground", hover: "hover:text-foreground" },
  ] as const;

  const activeMissions = games?.filter(g => g.status === "active") || [];
  const backlogGames   = games?.filter(g => g.status === "backlog") || [];
  const filteredGames  = games?.filter(g => g.status === activeTab) || [];

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
              onClick={handleOpenAddManual}
              className="flex-1 md:flex-none bg-primary text-background font-bold uppercase"
              data-testid="button-add-game"
            >
              <Plus className="mr-2 h-5 w-5" /> Add Game
            </Button>
            <Button 
              onClick={handleSpinRoulette} 
              className="flex-1 md:flex-none bg-secondary text-background font-bold uppercase"
              disabled={!isPro && pulseCharges === 0}
              data-testid="button-pick-game"
            >
              <Dices className="mr-2 h-5 w-5" /> Pick a Game
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowSettingsModal(true)} data-testid="button-settings">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* 3. Search Bar Section — RAWG search-to-add */}
        <div className="relative max-w-2xl mx-auto" data-testid="container-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search RAWG to add a new game..."
            className="w-full bg-card/50 border border-border rounded-lg pl-10 pr-10 py-3 font-mono focus:border-primary outline-none"
            data-testid="input-search-rawg"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
          )}

          {/* RAWG Results Dropdown */}
          {searchQuery.trim().length >= 2 && (searchResults.length > 0 || !isSearching) && (
            <div
              className="absolute left-0 right-0 top-full mt-2 bg-card border border-border/50 rounded-lg shadow-2xl shadow-primary/10 overflow-hidden z-30 max-h-96 overflow-y-auto"
              data-testid="dropdown-rawg-results"
            >
              {searchResults.length === 0 && !isSearching ? (
                <div className="px-4 py-6 text-center text-sm font-mono text-muted-foreground">
                  No matches. Try a different title or click <button onClick={handleOpenAddManual} className="text-primary underline">Add manually</button>.
                </div>
              ) : (
                searchResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handlePickSearchResult(r)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/10 hover:text-primary transition-colors text-left border-b border-border/30 last:border-b-0"
                    data-testid={`result-rawg-${r.id}`}
                  >
                    {r.background_image ? (
                      <img src={r.background_image} alt="" className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-black/40 rounded flex items-center justify-center">
                        <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <span className="font-mono text-sm flex-1 truncate">{r.name}</span>
                    <Plus className="w-4 h-4 opacity-50" />
                  </button>
                ))
              )}
            </div>
          )}
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

        {/* 5. Game Sections */}
        {activeTab === "missions" ? (
          <div className="space-y-12">
            {/* === ACTIVE MISSIONS === */}
            <section data-testid="section-active-missions">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-primary rounded-sm shadow-[0_0_10px_rgba(0,255,159,0.7)]" />
                  <div>
                    <h2 className="text-xl font-display font-bold uppercase tracking-widest text-primary">
                      Active Missions
                    </h2>
                    <p className="text-xs font-mono text-muted-foreground">Currently in your pulse.</p>
                  </div>
                </div>
                <span className="font-mono text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/30" data-testid="badge-active-count">
                  {activeMissions.length} ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {activeMissions.map((game) => (
                    <motion.div key={game.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <CyberCard
                        game={game}
                        onUpdateStatus={handleUpdateStatus}
                        onLogTime={() => setLoggingTimeId(game.id)}
                        isLogging={loggingTimeId === game.id}
                        isAILoading={isAILoading === game.id}
                        onAIVibeCheck={() => handleAIVibeCheck(game.title, game.id)}
                        onDelete={(id) => deleteGame(id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {activeMissions.length === 0 && (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-primary/15 rounded-xl">
                    <Gamepad2 className="w-10 h-10 text-primary/20 mx-auto mb-3" />
                    <p className="text-muted-foreground font-mono text-sm">No active missions. Toggle a backlog game to start.</p>
                  </div>
                )}
              </div>
            </section>

            {/* === BACKLOG === */}
            <section data-testid="section-backlog">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-accent/20">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-accent rounded-sm shadow-[0_0_10px_rgba(214,0,255,0.7)]" />
                  <div>
                    <h2 className="text-xl font-display font-bold uppercase tracking-widest text-accent">
                      The Backlog
                    </h2>
                    <p className="text-xs font-mono text-muted-foreground">Queued for future play.</p>
                  </div>
                </div>
                <span className="font-mono text-xs px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/30" data-testid="badge-backlog-count">
                  {backlogGames.length} QUEUED
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {backlogGames.map((game) => (
                    <motion.div key={game.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <CyberCard
                        game={game}
                        onUpdateStatus={handleUpdateStatus}
                        onLogTime={() => setLoggingTimeId(game.id)}
                        isLogging={loggingTimeId === game.id}
                        isAILoading={isAILoading === game.id}
                        onAIVibeCheck={() => handleAIVibeCheck(game.title, game.id)}
                        onDelete={(id) => deleteGame(id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {backlogGames.length === 0 && (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-accent/15 rounded-xl">
                    <Clock className="w-10 h-10 text-accent/20 mx-auto mb-3" />
                    <p className="text-muted-foreground font-mono text-sm">Backlog empty. Add games to queue them up.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredGames.map((game) => (
                <motion.div key={game.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <CyberCard
                    game={game}
                    onUpdateStatus={handleUpdateStatus}
                    onLogTime={() => setLoggingTimeId(game.id)}
                    isLogging={loggingTimeId === game.id}
                    isAILoading={isAILoading === game.id}
                    onAIVibeCheck={() => handleAIVibeCheck(game.title, game.id)}
                    onDelete={(id) => deleteGame(id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredGames.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-xl">
                <Plus className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-mono">No data found in {activeTab}.</p>
              </div>
            )}
          </div>
        )}
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
              Spinning the Wheel…
            </DialogTitle>
            <DialogDescription className="text-center font-mono text-xs">
              Locking onto your next mission.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 flex flex-col items-center justify-center gap-4" data-testid="container-reel">
            {/* Mechanical reel window */}
            <div className="relative w-full max-w-sm h-28 bg-black border-2 border-secondary/60 rounded-md overflow-hidden shadow-[inset_0_0_30px_rgba(0,184,255,0.4),0_0_25px_rgba(0,184,255,0.3)]">
              {/* Top + bottom blur masks */}
              <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />
              {/* Side bracket markers */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary shadow-[0_0_8px_rgba(0,255,159,0.9)] z-10" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary shadow-[0_0_8px_rgba(0,255,159,0.9)] z-10" />

              {/* Reel slot */}
              <div className="h-full w-full flex items-center justify-center px-8">
                <div
                  key={reelGame?.id ?? "init"}
                  className="font-display uppercase tracking-widest text-2xl text-primary text-center truncate w-full animate-[reel_110ms_ease-out]"
                  style={{ textShadow: "0 0 12px rgba(0,255,159,0.8), 0 0 24px rgba(0,255,159,0.4)" }}
                  data-testid="text-reel-current"
                >
                  {reelGame?.title ?? "—"}
                </div>
              </div>

              {/* Scanline overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                  backgroundImage: "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(0,184,255,0.15) 2px, rgba(0,184,255,0.15) 3px)",
                }}
              />
            </div>

            <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
              {wheelCandidates.length} candidates locked in
            </p>
          </div>
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