import { useState, useRef, useEffect } from "react";
import { useGames } from "@/hooks/use-games";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { CyberCard } from "@/components/CyberCard";
import { AddGameModal } from "@/components/AddGameModal";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Gamepad2, Trophy, Search, Dices, Settings, Zap, Loader2, Sword, Sofa, Bolt, AlertTriangle } from "lucide-react";
import { type Game } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import confetti from "canvas-confetti";

interface SearchResult {
  id: number;
  name: string;
  background_image: string | null;
  released: string | null;
  rating: number | null;
  genres: { name: string }[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const { games, updateGame, deleteGame, isUpdating } = useGames();
  const [logTimeGame, setLogTimeGame] = useState<Game | null>(null);
  const [logHrs, setLogHrs] = useState("1");
  const [logMins, setLogMins] = useState("0");
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "backlog" | "wishlist">("active");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchAddOpen, setSearchAddOpen] = useState(false);
  const [searchAddPrefill, setSearchAddPrefill] = useState<{ title: string; coverUrl?: string | null } | undefined>();
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [showRoulette, setShowRoulette] = useState(false);
  const [winnerGame, setWinnerGame] = useState<Game | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinGame, setSpinGame] = useState<Game | null>(null);
  const [isPro, setIsPro] = useState(user?.isPro ?? false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  useEffect(() => {
    if (user) setIsPro(user.isPro);
  }, [user]);

  // RAWG Search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchQuery.trim()) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const apiKey = import.meta.env.VITE_RAWG_API_KEY;
        try {
          const response = await fetch(
            `https://api.rawg.io/api/games?search=${encodeURIComponent(searchQuery)}&key=${apiKey}&page_size=6`
          );
          const data = await response.json();
          setSearchResults(data.results || []);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 400);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  const handleGameSelect = (game: SearchResult) => {
    setSearchAddPrefill({ title: game.name, coverUrl: game.background_image });
    setSearchAddOpen(true);
    setSearchQuery("");
    setSearchResults([]);
  };
  // Original Pick A Game Logic
  const handlePickGame = (mode: string) => {
    const moods: Record<string, { filter: (g: Game) => boolean }> = {
      chill: { filter: (g: Game) => g.vibe?.toLowerCase() === 'chill' },
      epic: { filter: (g: Game) => g.vibe?.toLowerCase() === 'epic' },
      quickfix: { filter: (g: Game) => g.vibe?.toLowerCase() === 'quick fix' },
      competitive: { filter: (g: Game) => g.vibe?.toLowerCase() === 'competitive' },
      chaos: { filter: () => true },
    };

    const eligibleGames = (games || [])
      .filter(g => g.status === "backlog" || g.status === "active")
      .filter(g => moods[mode].filter(g));
    
    if (eligibleGames.length < 2) {
      toast({ title: "Insufficient Variety", description: `Add more ${mode} games!`, variant: "destructive" });
      return;
    }

    setShowRoulette(false);
    setIsSpinning(true);
    
    let iterations = 0;
    const interval = setInterval(() => {
      setSpinGame(eligibleGames[Math.floor(Math.random() * eligibleGames.length)]);
      iterations++;
      if (iterations >= 20) {
        clearInterval(interval);
        const winner = eligibleGames[Math.floor(Math.random() * eligibleGames.length)];
        setWinnerGame(winner);
        setIsSpinning(false);
        setSpinGame(null);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }
    }, 100);
  };

  const tabData = [
    { id: "active", label: "My Pulse", icon: Gamepad2, color: "text-primary" },
    { id: "completed", label: "The Vault", icon: Trophy, color: "text-secondary" },
    { id: "backlog", label: "The Backlog", icon: Clock, color: "text-accent" },
    { id: "wishlist", label: "Wish List", icon: Sword, color: "text-foreground" },
  ] as const;

  const filteredGames = games?.filter(game => game.status === activeTab) || [];

  // === GAME CARD HANDLERS ===
  const handleUpdateStatus = (id: number, status: string) => {
    const before = games?.find(g => g.id === id);
    // Vault → anywhere else = permanent Legacy upgrade.
    const earnsLegacy =
      !!before &&
      before.status === "completed" &&
      status !== "completed" &&
      !before.infiniteMode;
    updateGame({
      id,
      status: status as Game["status"],
      ...(earnsLegacy ? { infiniteMode: true } : {}),
    });
    if (earnsLegacy) {
      toast({
        title: "Legacy Status Earned",
        description: `${before?.title ?? "Mission"} carries the Legacy badge from now on.`,
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteGame(id);
  };

  const handleUpdateTarget = (id: number, hours: number) => {
    updateGame({ id, targetHours: hours });
  };

  const handleGoInfinite = (id: number) => {
    updateGame({ id, infiniteMode: true, status: "active" });
    toast({ title: "Infinite Mode Engaged", description: "Playtime now counts up forever." });
  };

  const handleRemoveTarget = (id: number) => {
    updateGame({ id, targetHours: null as any });
  };

  const openLogTime = (game: Game) => {
    setLogTimeGame(game);
    setLogHrs("1");
    setLogMins("0");
  };

  const submitLogTime = () => {
    if (!logTimeGame) return;
    const h = Math.max(0, parseInt(logHrs || "0", 10) || 0);
    const m = Math.max(0, Math.min(59, parseInt(logMins || "0", 10) || 0));
    const decH = h + m / 60;
    if (decH <= 0) {
      toast({ title: "Nothing to log", description: "Enter at least 1 minute.", variant: "destructive" });
      return;
    }
    const newPlaytime = Math.round(((logTimeGame.playtime ?? 0) + decH) * 100) / 100;
    // Auto-promote backlog entries to active when time is logged.
    const nextStatus = logTimeGame.status === "backlog" ? "active" : logTimeGame.status;
    updateGame({ id: logTimeGame.id, playtime: newPlaytime, status: nextStatus as Game["status"] });
    toast({
      title: "Playtime Logged",
      description: `+${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m` : ""} on ${logTimeGame.title}`.trim(),
    });
    setLogTimeGame(null);
  };

  return (
    <Layout>
      <AddGameModal open={searchAddOpen} onOpenChange={setSearchAddOpen} prefill={searchAddPrefill} />

      {/* LOG TIME MODAL */}
      <Dialog open={!!logTimeGame} onOpenChange={(o) => !o && setLogTimeGame(null)}>
        <DialogContent className="bg-black/95 border-primary/30 text-white font-mono max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary uppercase tracking-widest text-center text-lg">
              Log Playtime
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground font-mono text-xs uppercase tracking-widest">
              {logTimeGame?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Hours</span>
              <Input
                type="number"
                min={0}
                step={1}
                value={logHrs}
                onChange={(e) => setLogHrs(e.target.value)}
                className="font-mono text-2xl text-center bg-black/40 border-primary/30 focus-visible:ring-primary"
                data-testid="input-log-hrs"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Minutes</span>
              <Input
                type="number"
                min={0}
                max={59}
                step={5}
                value={logMins}
                onChange={(e) => setLogMins(e.target.value)}
                className="font-mono text-2xl text-center bg-black/40 border-primary/30 focus-visible:ring-primary"
                data-testid="input-log-mins"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2 pb-2">
            {[
              { label: "+15m", h: 0, m: 15 },
              { label: "+30m", h: 0, m: 30 },
              { label: "+1h", h: 1, m: 0 },
              { label: "+2h", h: 2, m: 0 },
            ].map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => { setLogHrs(String(p.h)); setLogMins(String(p.m)); }}
                className="flex-1 px-3 py-2 text-xs font-mono uppercase tracking-widest border border-primary/30 text-primary hover:bg-primary/10 rounded-sm"
                data-testid={`preset-${p.label}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setLogTimeGame(null)}
              className="flex-1 font-mono uppercase tracking-widest"
              data-testid="button-cancel-log"
            >
              Cancel
            </Button>
            <Button
              onClick={submitLogTime}
              disabled={isUpdating}
              className="flex-1 bg-primary text-background font-mono font-bold uppercase tracking-widest hover:brightness-110"
              data-testid="button-confirm-log"
            >
              {isUpdating ? "Logging…" : "Log Time"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="p-4 md:p-8 space-y-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex-1 w-full max-w-2xl">
            {/* BIGGER HEADER */}
            <h1 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tighter mb-4 text-primary italic leading-none">
              Mission Control
            </h1>
            
            <div className="relative group z-50">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary">
                {isSearching ? <Loader2 className="h-6 w-6 animate-spin" /> : <Search className="h-6 w-6" />}
              </div>
              <input
                type="text"
                placeholder="ADD A NEW GAME TO PULSE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-16 pl-14 pr-4 bg-black/40 border border-primary/20 rounded-sm font-mono text-sm uppercase tracking-widest focus:border-primary outline-none transition-all"
              />

              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute w-full mt-2 p-2 bg-[#0a0a0a] border border-primary/30 rounded-sm shadow-2xl z-50 backdrop-blur-xl">
                    {searchResults.map((game) => (
                      <button key={game.id} onClick={() => handleGameSelect(game)} className="flex items-center gap-4 w-full p-3 hover:bg-primary/10 transition-all text-left group/item">
                        <img src={game.background_image || ""} className="w-14 h-16 object-cover rounded-sm border border-white/10" />
                        <span className="font-mono text-xs uppercase text-white group-hover/item:text-primary">{game.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button onClick={() => setShowRoulette(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-3 h-16 px-10 bg-gradient-to-r from-secondary via-accent to-secondary text-background font-black uppercase tracking-widest text-sm shadow-[0_0_25px_rgba(0,184,255,0.3)] hover:scale-105 transition-all">
              <Dices className="w-6 h-6" /> PICK A GAME
            </button>
            <button onClick={() => setShowSettingsModal(true)} className="h-16 w-16 flex items-center justify-center bg-black/40 border border-white/10 text-muted-foreground hover:text-primary">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* TABS - MORE READABLE FONT */}
        <div className="flex justify-center flex-wrap gap-4 md:gap-8 border-b border-white/5 pb-6">
          {tabData.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} 
              className={`px-4 py-2 text-xs md:text-sm font-mono font-bold uppercase tracking-[0.25em] transition-all relative ${activeTab === tab.id ? tab.color : "text-muted-foreground hover:text-white"}`}>
              {tab.label}
              {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute bottom-[-25px] left-0 right-0 h-1 bg-current shadow-[0_0_10px_rgba(var(--primary),0.5)]" />}
            </button>
          ))}
        </div>

        {/* GAMES GRID - UPDATED SPACING */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 py-4">
          {filteredGames.map(game => (
            <CyberCard
              key={game.id}
              game={game}
              onUpdateStatus={handleUpdateStatus}
              onLogTime={() => openLogTime(game)}
              isLogging={isUpdating && logTimeGame?.id === game.id}
              onDelete={handleDelete}
              onUpdateTarget={handleUpdateTarget}
              onGoInfinite={handleGoInfinite}
              onRemoveTarget={handleRemoveTarget}
            />
          ))}
        </div>
      </div>

      {/* ROULETTE MODAL */}
      <Dialog open={showRoulette} onOpenChange={setShowRoulette}>
        <DialogContent className="bg-black/95 border-primary/20 text-white font-mono max-w-sm">
          <DialogHeader><DialogTitle className="uppercase tracking-widest text-center text-primary text-xl font-black italic">Select Vibe</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-6">
            {['Chill', 'Epic', 'Quick Fix', 'Competitive'].map(v => (
              <button key={v} onClick={() => handlePickGame(v.toLowerCase().replace(' ', ''))} className="p-4 border border-white/10 hover:bg-primary/10 transition-all uppercase text-sm font-bold tracking-widest">{v}</button>
            ))}
            <button onClick={() => handlePickGame('chaos')} className="p-5 border border-secondary/40 bg-secondary/5 hover:bg-secondary/20 transition-all uppercase text-sm text-secondary font-black tracking-[0.3em]">Chaos Mode</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SPINNING SCREEN */}
      <AnimatePresence>
        {isSpinning && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-xl">
            <div className="text-center">
              <div className="w-56 h-72 border-4 border-primary/50 mx-auto mb-6 overflow-hidden rounded shadow-[0_0_50px_rgba(0,255,159,0.2)]">
                <img src={spinGame?.coverUrl || ""} className="w-full h-full object-cover" />
              </div>
              <h2 className="text-3xl font-black uppercase text-primary animate-pulse italic tracking-tighter">{spinGame?.title}</h2>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* WINNER MODAL */}
      <Dialog open={!!winnerGame} onOpenChange={() => setWinnerGame(null)}>
        <DialogContent className="bg-black border-secondary/50 text-white text-center max-w-md">
          <DialogHeader><DialogTitle className="text-secondary font-mono uppercase tracking-[0.4em] text-sm">Target Locked</DialogTitle></DialogHeader>
          <img src={winnerGame?.coverUrl || ""} className="w-48 h-64 mx-auto my-6 object-cover border-2 border-secondary shadow-[0_0_40px_rgba(0,184,255,0.3)] rounded-sm" />
          <div className="text-4xl font-black uppercase mb-8 italic tracking-tighter leading-tight">{winnerGame?.title}</div>
          <button onClick={() => { updateGame({ id: winnerGame!.id, status: 'active' }); setWinnerGame(null); setActiveTab('active'); }} 
            className="w-full py-5 bg-secondary text-black font-black uppercase tracking-widest hover:scale-105 transition-all text-sm">
            Initialize Mission
          </button>
          </DialogContent>
      </Dialog>
    </Layout>
  );
}