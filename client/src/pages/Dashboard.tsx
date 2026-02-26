import { useState, useRef, useEffect } from "react";
import { useGames } from "@/hooks/use-games";
import { Layout } from "@/components/Layout";
import { CyberCard } from "@/components/CyberCard";
import { AddGameModal } from "@/components/AddGameModal";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Gamepad2, Trophy, AlertCircle, Trash2, CheckCircle2, Search, Dices, Share2, Settings, AlertTriangle, Info, Sword, Sofa, Bolt, Hourglass, Zap, Check } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import confetti from "canvas-confetti";

interface SearchResult {
  id: number;
  name: string;
  background_image: string | null;
}

export default function Dashboard() {
  const { games, isLoading, deleteGame, updateGame, createGame } = useGames();
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "backlog" | "wishlist">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<SearchResult | null>(null);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"active" | "completed" | "backlog" | "wishlist">("backlog");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [spotlightGame, setSpotlightGame] = useState<Game | null>(null);
  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteSource, setRouletteSource] = useState<"backlog" | "active">("backlog");
  const [winnerGame, setWinnerGame] = useState<Game | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinGame, setSpinGame] = useState<Game | null>(null);
  const [isStartingAdventure, setIsStartingAdventure] = useState(false);
  const [loggingTimeId, setLoggingTimeId] = useState<number | null>(null);
  const [logHours, setLogHours] = useState<string>("1");
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [pulseCharges, setPulseCharges] = useState(3);
  const [justUpdatedId, setJustUpdatedId] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<"Chill" | "Epic" | "Gritty" | "Quick Fix" | "Competitive" | null>(null);
  const [lastWinnerId, setLastWinnerId] = useState<number | null>(null);
  const [showProModal, setShowProModal] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const handleUpdateStatus = async (gameId: number, newStatus: string) => {
    const activeGamesCount = games?.filter(g => g.status !== 'completed' && g.status !== 'wishlist').length || 0;
    const currentGame = games?.find(g => g.id === gameId);
    
    // If moving TO an active-like status (active/backlog) FROM a non-active status (wishlist)
    if (!isPro && (newStatus === 'active' || newStatus === 'backlog') && 
        currentGame?.status === 'wishlist' && activeGamesCount >= 5) {
      setShowProModal(true);
      return;
    }
    
    updateGame({ id: gameId, status: newStatus as any });
  };

  const handleLogTime = async (game: Game) => {
    const hours = parseInt(logHours);
    if (isNaN(hours) || hours <= 0) return;

    setIsLoggingTime(true);
    try {
      await updateGame({
        id: game.id,
        playtime: (game.playtime || 0) + hours,
      });
      toast({
        title: "Playtime Logged",
        description: `Added ${hours}h to ${game.title}. Total: ${(game.playtime || 0) + hours}h`,
        className: "border-primary text-primary font-mono",
      });
      setLoggingTimeId(null);
      setLogHours("1");
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not log playtime to the database.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingTime(false);
    }
  };

  const playSound = (type: 'tick' | 'win') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'tick') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          const startTime = audioCtx.currentTime + (i * 0.05);
          osc.frequency.setValueAtTime(freq, startTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.05, startTime + 0.3);
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.05, startTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
          osc.start(startTime);
          osc.stop(startTime + 0.4);
        });
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  const handlePickGame = (mode: "epic" | "quick" | "chill" | "chaos") => {
    const moods = {
      epic: { filter: (g: Game) => g.vibe === 'Epic', label: 'Epic Quest' },
      quick: { filter: (g: Game) => g.vibe === 'Quick Fix' || g.vibe === 'Competitive', label: 'Quick Hit' },
      chill: { filter: (g: Game) => g.vibe === 'Chill', label: 'Chill Vibe' },
      chaos: { filter: () => true, label: 'Chaos Mode' }
    };

    const eligibleGames = (games || [])
      .filter(g => g.status === rouletteSource)
      .filter(g => moods[mode].filter(g));

    if (eligibleGames.length <= 1) {
      toast({
        title: "Insufficient Variety",
        description: `Add more ${moods[mode].label} games to shuffle! (Need at least 2 games)`,
        variant: "destructive",
      });
      return;
    }

    let winner = eligibleGames[Math.floor(Math.random() * eligibleGames.length)];
    if (lastWinnerId !== null && eligibleGames.length > 1) {
      let filtered = eligibleGames.filter(g => g.id !== lastWinnerId);
      winner = filtered[Math.floor(Math.random() * filtered.length)];
    }
    
    setIsSpinning(true);
    let iterations = 0;
    const maxIterations = 20;
    const interval = setInterval(() => {
      setSpinGame(eligibleGames[Math.floor(Math.random() * eligibleGames.length)]);
      playSound('tick');
      iterations++;
      if (iterations >= maxIterations) {
        clearInterval(interval);
        setWinnerGame(winner);
        setLastWinnerId(winner.id);
        setIsSpinning(false);
        setSpinGame(null);
        if (!isPro) {
          setPulseCharges(prev => Math.max(0, prev - 1));
        }
        playSound('win');
        if ('vibrate' in navigator) navigator.vibrate(200);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00ff9f', '#00b8ff', '#d600ff'],
          disableForReducedMotion: true
        });
      }
    }, 150);
    setShowRoulette(false);
  };

  const handleStartAdventure = async (game: Game) => {
    setIsStartingAdventure(true);
    try {
      await updateGame({
        id: game.id,
        status: "active",
        progress: 1,
      });
      setJustUpdatedId(game.id);
      setTimeout(() => setJustUpdatedId(null), 1000);
      toast({
        title: "Adventure Initiated",
        description: `${game.title} is now your active pulse.`,
        className: "border-primary text-primary font-mono",
      });
      setWinnerGame(null);
      setActiveTab("active");
    } catch (error) {
      toast({
        title: "Link Failed",
        description: "Could not initialize adventure sequence.",
        variant: "destructive",
      });
    } finally {
      setIsStartingAdventure(false);
    }
  };

  const handleShareVault = () => {
    const completedCount = games?.filter(g => g.status === "completed").length || 0;
    const currentPulse = games?.find(g => g.status === "active")?.title || "None";
    const appUrl = window.location.origin;
    const text = `🏆 I've conquered ${completedCount} games in my GamePulse Vault! Current Pulse: ${currentPulse}. Check your backlog at ${appUrl}`;
    
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Share Code Copied",
        description: "Vault summary ready for broadcast!",
        className: "border-secondary text-secondary font-mono",
      });
    });
  };

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      if (games) {
        for (const game of games) {
          await apiRequest("DELETE", `/api/games/${game.id}`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({
        title: "System Reset Complete",
        description: "All game data has been purged from Mission Control.",
        variant: "destructive",
      });
      setShowSettingsModal(false);
      setShowResetConfirm(false);
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: "Could not wipe the data logs.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) return;
    setIsRedeeming(true);
    try {
      const res = await apiRequest("POST", "/api/user/redeem", { code: redeemCode });
      if (res.ok) {
        setIsPro(true);
        toast({
          title: "Pro Unlocked",
          description: "Welcome to the elite tier, operative.",
          className: "border-purple-500 text-purple-500 font-mono shadow-[0_0_15px_rgba(168,85,247,0.4)]",
        });
        setRedeemCode("");
        setShowSettingsModal(false);
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#d600ff', '#ffffff']
        });
      } else {
        toast({
          title: "Access Denied",
          description: "Redemption code invalid or expired.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Link Error",
        description: "Could not connect to redemption server.",
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(async () => {
        const apiKey = import.meta.env.VITE_RAWG_API_KEY;
        if (!apiKey) return;
        try {
          const response = await fetch(`https://api.rawg.io/api/games?search=${encodeURIComponent(searchQuery)}&key=${apiKey}`);
          const data = await response.json();
          setSearchResults(data.results || []);
        } catch (error) {
          setSearchResults([]);
        }
      }, 500);
    } else {
      setSearchResults([]);
    }
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  const handleGameSelect = (game: SearchResult) => {
    setSelectedGame(game);
    setSelectedStatus("backlog");
    setSelectedVibe(null);
    setSelectedPlatform(null);
    setShowPlatformModal(true);
  };

  const handleSaveGame = async () => {
    if (!selectedGame || !selectedPlatform) {
      toast({ title: "Error", description: "Please select a platform", variant: "destructive" });
      return;
    }

    try {
      const activeGamesCount = games?.filter(g => g.status === "active").length || 0;
      if (!isPro && selectedStatus === "active" && activeGamesCount >= 5) {
        toast({ title: "Pulse Limit Reached", description: "Free tier is limited to 5 active games.", variant: "destructive" });
        return;
      }

      await createGame({
        title: selectedGame.name,
        coverUrl: selectedGame.background_image || "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&q=80",
        platform: selectedPlatform,
        status: selectedStatus,
        playtime: 0,
        progress: 0,
        vibe: selectedVibe,
      });

      toast({ title: "Link Established", description: `${selectedGame.name} added to your library.`, className: "border-primary text-primary font-mono" });
      setShowPlatformModal(false);
      setSelectedGame(null);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      toast({ title: "Link Error", description: "Failed to synchronize game data.", variant: "destructive" });
    }
  };

  const tabData = [
    { id: "active", label: "My Pulse", icon: Gamepad2, color: "text-primary" },
    { id: "completed", label: "The Vault", icon: Trophy, color: "text-secondary" },
    { id: "backlog", label: "The Backlog", icon: Clock, color: "text-accent" },
    { id: "wishlist", label: "Wish List", icon: Sword, color: "text-foreground" },
  ] as const;

  const filteredGames = games?.filter(game => game.status === activeTab) || [];
  const currentTab = tabData.find(t => t.id === activeTab)?.label || "Library";

  return (
    <Layout>
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-widest text-primary">System Settings</DialogTitle>
            <DialogDescription className="font-mono text-xs">Configure GamePulse core parameters.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <section className="space-y-3">
              <h4 className="flex items-center gap-2 font-display text-sm text-primary">
                <Zap className="w-4 h-4" /> Redeem Access
              </h4>
              <div className="flex gap-2">
                <input 
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE (e.g. PRO99)"
                  className="flex-1 bg-black/40 border border-white/10 rounded-sm px-3 py-2 text-xs font-mono focus:border-primary outline-none transition-all"
                />
                <button 
                  onClick={handleRedeemCode}
                  disabled={isRedeeming || !redeemCode}
                  className="px-4 py-2 bg-primary text-background text-[10px] font-bold font-mono rounded-sm hover:bg-primary/90 transition-all tactile-press disabled:opacity-50"
                >
                  {isRedeeming ? "LINKING..." : "REDEEM"}
                </button>
              </div>
            </section>

            <section className="pt-4 border-t border-white/5">
              <h4 className="flex items-center gap-2 font-display text-sm text-destructive mb-2">
                <AlertTriangle className="w-4 h-4" /> Danger Zone
              </h4>
              {!showResetConfirm ? (
                <button onClick={() => setShowResetConfirm(true)} className="w-full py-2 bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono rounded-sm hover:bg-destructive/20 transition-all tactile-press">
                  Reset All Data logs
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] text-destructive font-mono uppercase text-center animate-pulse">Confirm total data wipe?</p>
                  <div className="flex gap-2">
                    <button onClick={handleResetData} disabled={isResetting} className="flex-1 py-2 bg-destructive text-background text-xs font-bold font-mono rounded-sm tactile-press disabled:opacity-50">
                      {isResetting ? "PURGING..." : "YES, PURGE"}
                    </button>
                    <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2 bg-black/50 border border-border text-xs font-mono rounded-sm tactile-press">
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProModal} onOpenChange={setShowProModal}>
        <DialogContent className="bg-[#161616]/80 backdrop-blur-xl border-purple-500/50 sm:max-w-md shadow-[0_0_50px_rgba(168,85,247,0.3)] animate-in fade-in zoom-in duration-300">
          <DialogHeader>
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
                <div className="relative p-4 bg-black/40 border border-purple-500/30 rounded-full">
                  <Zap className="w-12 h-12 text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                </div>
              </div>
            </div>
            <DialogTitle className="text-4xl font-display font-black text-white text-center uppercase tracking-tighter italic leading-none mb-2">
              Unlock the <span className="text-purple-500">Full Pulse</span>
            </DialogTitle>
            <div className="h-1 w-24 bg-purple-500 mx-auto mb-4" />
          </DialogHeader>
          <div className="py-2 space-y-6 text-center">
            <p className="font-mono text-sm text-muted-foreground leading-relaxed px-4">
              You've reached the <span className="text-white font-bold">5-game limit</span>. Move games to the Vault to stay free, or upgrade to Pro for life.
            </p>
            
            <div className="grid grid-cols-1 gap-3 px-4">
              {[
                "∞ Unlimited Backlog & Vault",
                "🎨 Exclusive 'Neon' & 'Obsidian' Themes",
                "⚡ Infinite Power Spins (No Recharging)",
                "☁️ Priority Cloud Sync"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-[10px] font-mono text-white/70 uppercase tracking-widest bg-black/20 p-2 border border-white/5 rounded-sm">
                  <Check className="w-3 h-3 text-purple-500" />
                  {feature}
                </div>
              ))}
            </div>

            <div className="px-4 pt-4">
              <button 
                className="w-full py-8 text-xl font-black italic tracking-tighter bg-purple-600 hover:bg-purple-500 border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300 animate-pulse text-white rounded-md"
                onClick={() => setShowProModal(false)}
              >
                UPGRADE FOR $0.99
              </button>
            </div>
            
            <p className="text-[10px] font-mono text-muted-foreground/30 uppercase tracking-[0.2em]">
              Authorization Status: Level 1 Technician
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4 md:space-y-8 pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
          <div className="flex justify-between items-start w-full">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold uppercase tracking-wider text-foreground">Mission Control</h1>
              <p className="text-xs md:text-sm text-muted-foreground font-mono">Manage your gaming operations.</p>
              <div className="mt-2 md:mt-3 flex items-center gap-1 md:gap-2 flex-wrap">
                <span className="text-[1.25rem] md:text-[1.5rem] font-display font-bold text-primary">{filteredGames.length}</span>
                <span className="text-[0.75rem] md:text-[0.875rem] font-mono text-muted-foreground">in <span className="text-primary">{currentTab}</span></span>
                <span className="text-[0.7rem] md:text-[0.75rem] font-mono text-muted-foreground/60">({games?.length || 0} total)</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="flex flex-col gap-1 flex-1 md:flex-none">
              <button onClick={() => setShowRoulette(true)} disabled={!isPro && pulseCharges === 0} className="w-full px-3 md:px-6 py-2 md:py-3 bg-gradient-to-r from-secondary to-secondary/80 text-background font-display font-bold uppercase tracking-wider text-xs md:text-base rounded-md hover:from-secondary/90 hover:to-secondary/70 transition-all flex items-center justify-center gap-1 md:gap-2 tactile-press disabled:opacity-50 disabled:grayscale">
                <Dices className="w-[18px] md:w-[24px] h-[18px] md:h-[24px]" />
                <span className="hidden sm:inline">Pick a Game</span>
                <span className="sm:hidden">Game</span>
              </button>
              <div className="flex justify-center gap-1">
                {isPro ? (
                  <span className="text-secondary text-lg font-bold leading-none">∞</span>
                ) : (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className={`h-1 w-4 rounded-full transition-colors ${i < pulseCharges ? "bg-secondary shadow-[0_0_5px_rgba(var(--secondary),0.5)]" : "bg-white/10"}`} />
                  ))
                )}
              </div>
            </div>
            <AddGameModal />
          </div>
        </div>

        {activeTab === "completed" && filteredGames.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center md:justify-end">
            <button onClick={handleShareVault} className="flex items-center gap-2 px-4 py-2 bg-secondary/10 border border-secondary text-secondary text-xs font-display font-bold uppercase tracking-widest rounded-sm hover:bg-secondary/20 transition-all tactile-press">
              <Share2 className="w-4 h-4" /> Share My Vault
            </button>
          </motion.div>
        )}
        
        <Dialog open={showRoulette} onOpenChange={setShowRoulette}>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <div className="flex flex-col items-center gap-1 mb-6">
                <div className="flex justify-center gap-2">
                  {isPro ? (
                    <span className="text-yellow-400 text-4xl font-bold drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] leading-none">∞</span>
                  ) : (
                    [...Array(3)].map((_, i) => (
                      <Bolt key={i} className={`w-[20px] h-[20px] transition-all duration-500 ${i < pulseCharges ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" : "text-white/10 fill-transparent"}`} />
                    ))
                  )}
                </div>
                {!isPro && pulseCharges < 3 && <div className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-tighter animate-pulse">Next charge in 3h 59m</div>}
              </div>
              <DialogTitle className="font-display uppercase tracking-widest text-secondary text-center mb-4">Mood-Based Roulette</DialogTitle>
              <div className="flex bg-black/40 p-1 rounded-md border border-white/5 mb-6">
                <button onClick={() => setRouletteSource("backlog")} className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest transition-all rounded-sm ${rouletteSource === "backlog" ? "bg-primary text-background font-bold shadow-[0_0_10px_rgba(var(--primary),0.3)]" : "text-muted-foreground hover:text-foreground"}`}>Backlog (0%)</button>
                <button onClick={() => setRouletteSource("active")} className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest transition-all rounded-sm ${rouletteSource === "active" ? "bg-secondary text-background font-bold shadow-[0_0_10px_rgba(var(--secondary),0.3)]" : "text-muted-foreground hover:text-foreground"}`}>Active (1-99%)</button>
              </div>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 py-4">
              {[
                { id: "epic", label: "Epic Quest", desc: "RPG / Strategy", icon: Trophy, color: "text-secondary", bg: "bg-secondary/10" },
                { id: "quick", label: "Quick Hit", desc: "Action / Sports", icon: Gamepad2, color: "text-primary", bg: "bg-primary/10" },
                { id: "chill", label: "Chill Vibe", desc: "Indie / Platformer", icon: Sofa, color: "text-accent", bg: "bg-accent/10" },
                { id: "chaos", label: "Chaos Mode", desc: "Total Randomization", icon: Dices, color: "text-foreground", bg: "bg-white/5" },
              ].map((opt) => (
                <button key={opt.id} onClick={() => handlePickGame(opt.id as any)} className={`flex items-center gap-4 p-4 ${opt.bg} border border-white/5 rounded-md hover:border-white/20 transition-all tactile-press text-left group`}>
                  <div className={`p-2 rounded-sm bg-black/40 ${opt.color}`}><opt.icon className="w-[20px] h-[20px]" /></div>
                  <div className="flex-1">
                    <div className="text-sm font-display font-bold uppercase tracking-wider">{opt.label}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <AnimatePresence>
          {isSpinning && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center">
              <div className="relative w-full max-w-lg px-6 text-center">
                <div className="text-[10px] font-mono text-primary uppercase tracking-[0.3em] mb-2 animate-pulse">Scanning Neural Pathways...</div>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent mb-8" />
                <AnimatePresence mode="wait">
                  <motion.div key={spinGame?.id || 'empty'} initial={{ y: 50, opacity: 0, scale: 0.8, filter: "blur(10px)" }} animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ y: -50, opacity: 0, scale: 1.2, filter: "blur(10px)" }} transition={{ duration: 0.1 }} className="min-h-[120px] flex items-center justify-center">
                    <h2 className="text-3xl md:text-5xl lg:text-7xl font-display font-black uppercase tracking-tighter text-white drop-shadow-[0_0_20px_rgba(var(--primary),0.8)] leading-none break-words">{spinGame?.title || "???"}</h2>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Dialog open={!!winnerGame} onOpenChange={(open) => !open && setWinnerGame(null)}>
          <DialogContent className="bg-card border-secondary sm:max-w-sm overflow-hidden p-0 animate-haptic-pop">
            {winnerGame && (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
                <div className="h-48 w-full relative">
                  <img src={winnerGame.coverUrl} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="text-[10px] font-mono text-secondary uppercase tracking-[0.2em] mb-1">Target Identified</div>
                    <h2 className="text-xl font-display font-bold uppercase text-white mb-2">{winnerGame.title}</h2>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-secondary/10 border border-secondary/20 rounded-sm text-[10px] font-mono text-secondary uppercase">{winnerGame.platform}</div>
                      {winnerGame.vibe && <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-sm text-[10px] font-mono text-primary uppercase">{winnerGame.vibe}</div>}
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-xs text-muted-foreground font-mono">Neural link established. Initialize sequence?</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleStartAdventure(winnerGame)} disabled={isStartingAdventure} className="flex-1 py-3 bg-secondary text-background font-display font-bold uppercase tracking-wider text-xs rounded-sm tactile-press disabled:opacity-50">{isStartingAdventure ? "INITIALIZING..." : "Start Adventure"}</button>
                    <button onClick={() => setWinnerGame(null)} className="px-4 py-3 bg-white/5 border border-white/10 text-xs font-mono rounded-sm hover:bg-white/10 transition-colors">SKIP</button>
                  </div>
                </div>
              </motion.div>
            )}
          </DialogContent>
        </Dialog>

        <div className="relative">
          <div className="flex items-center gap-2 bg-black/50 border border-border/50 rounded-md px-3 py-2">
            <Search className="w-[18px] h-[18px] text-muted-foreground" />
            <input type="text" placeholder="Search games..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none font-mono text-xs md:text-sm" />
          </div>
          {searchResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute top-full left-0 right-0 mt-2 bg-black/80 border border-border/50 rounded-md overflow-hidden backdrop-blur-sm z-20 max-h-96 overflow-y-auto">
              {searchResults.slice(0, 8).map((result) => (
                <div key={result.id} onClick={() => handleGameSelect(result)} className="flex items-center gap-3 px-4 py-3 hover:bg-primary/20 cursor-pointer border-b border-border/30 last:border-b-0">
                  <img src={result.background_image || ""} alt="" className="w-12 h-12 object-cover rounded-sm" />
                  <span className="flex-1 text-sm font-mono text-foreground">{result.name}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        <Dialog open={showPlatformModal} onOpenChange={setShowPlatformModal}>
          <DialogContent className="bg-card border-border sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display uppercase tracking-widest text-primary">{selectedGame?.name}</DialogTitle>
              <DialogDescription className="font-mono text-xs">Configure before adding to library</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Status</label>
                <div className="grid grid-cols-1 gap-2">
                  {["active", "backlog", "completed"].map((status) => (
                    <button key={status} onClick={() => setSelectedStatus(status as any)} className={`px-4 py-2 rounded-md font-mono text-sm capitalize transition-all ${selectedStatus === status ? "bg-primary/30 border border-primary text-primary" : "bg-black/50 border border-border text-foreground hover:bg-primary/20"}`}>
                      {status === "active" ? "Playing Now" : status}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Vibe</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Chill", "Epic", "Gritty", "Quick Fix", "Competitive"].map((v) => (
                    <button key={v} onClick={() => setSelectedVibe(selectedVibe === v ? null : (v as any))} className={`px-3 py-2 rounded-md font-mono text-[10px] transition-all ${selectedVibe === v ? "bg-accent/30 border border-accent text-accent" : "bg-black/50 border border-border text-foreground hover:bg-accent/20"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Steam", "Xbox", "PS5"].map((p) => (
                    <button key={p} onClick={() => setSelectedPlatform(p)} className={`py-2 rounded-md font-mono text-xs transition-all ${selectedPlatform === p ? "bg-secondary/30 border border-secondary text-secondary" : "bg-black/50 border border-border text-foreground hover:bg-secondary/20"}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveGame} disabled={!selectedPlatform} className={`flex-1 py-3 rounded-md font-mono font-bold transition-all ${selectedPlatform ? "bg-primary text-background" : "bg-black/30 text-muted-foreground"}`}>Add to Library</button>
                <button onClick={() => setShowPlatformModal(false)} className="px-4 py-3 bg-white/5 border border-border text-xs font-mono rounded-md">Cancel</button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="hidden md:flex flex-wrap gap-2 border-b border-border/50 pb-1">
          {tabData.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            const count = games?.filter(g => g.status === tab.id).length || 0;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative px-6 py-3 font-display font-bold uppercase tracking-wider text-sm transition-all ${isActive ? 'text-white' : 'text-muted-foreground hover:text-foreground'}`}>
                {isActive && <motion.div layoutId="activeTab" className={`absolute inset-0 bg-gradient-to-r ${tab.id === 'active' ? 'from-primary/20' : tab.id === 'completed' ? 'from-secondary/20' : 'from-accent/20'} to-transparent border-b-2 ${tab.id === 'active' ? 'border-primary' : tab.id === 'completed' ? 'border-secondary' : 'border-accent'}`} />}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className={`w-[18px] h-[18px] ${isActive ? tab.color : ''}`} />
                  {tab.label}
                  <span className="ml-2 text-[10px] font-mono opacity-50">[{count}]</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" /></div>
          ) : filteredGames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <Gamepad2 className="w-16 h-16 mb-4" />
              <h3 className="text-xl font-display font-bold mb-2">Sector Empty</h3>
              <p className="font-mono text-sm max-w-xs text-muted-foreground">No game signals detected in this quadrant.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
              <AnimatePresence mode="popLayout">
                {filteredGames.map((game) => (
                  <div key={game.id} className="relative">
                    <GameCardItem 
                      game={game} 
                      onDelete={() => deleteGame(game.id)} 
                      onStatusUpdate={(status) => handleUpdateStatus(game.id, status)}
                      onProgressUpdate={(progress) => {
                        let status = game.status;
                        if (progress === 100) status = "completed";
                        else if (progress > 0) status = "active";
                        updateGame({ id: game.id, progress, status });
                      }}
                      onLogTimeClick={() => { setLoggingTimeId(game.id); setLogHours("1"); }}
                      isLoggingActive={loggingTimeId === game.id}
                    />
                    <AnimatePresence>
                      {loggingTimeId === game.id && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 rounded-lg border border-primary/30">
                          <div className="text-[10px] font-mono text-primary uppercase mb-4">Neural Link: Add Hours</div>
                          <div className="flex items-center gap-3 mb-6">
                            <button onClick={() => setLogHours(prev => Math.max(1, parseInt(prev) - 1).toString())} className="w-8 h-8 flex items-center justify-center bg-black border border-white/10 rounded-sm">-</button>
                            <input type="number" value={logHours} onChange={(e) => setLogHours(e.target.value)} className="w-16 bg-black border border-primary/40 text-center font-mono text-primary" />
                            <button onClick={() => setLogHours(prev => (parseInt(prev) + 1).toString())} className="w-8 h-8 flex items-center justify-center bg-black border border-white/10 rounded-sm">+</button>
                          </div>
                          <div className="flex flex-col gap-2 w-full max-w-[120px]">
                            <button onClick={() => handleLogTime(game)} disabled={isLoggingTime} className="py-2 bg-primary text-background text-[10px] font-black uppercase rounded-sm">{isLoggingTime ? "UPLOADING..." : "LOG TIME"}</button>
                            <button onClick={() => setLoggingTimeId(null)} className="py-2 bg-white/5 border border-white/10 text-[10px] font-mono uppercase rounded-sm">ABORT</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background/95 border-t border-border/50 backdrop-blur-md z-40 pb-safe">
          <div className="flex justify-around items-stretch py-2">
            {tabData.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center py-2 ${isActive ? tab.color : 'text-muted-foreground'}`}>
                  <Icon className="w-[20px] h-[20px] mb-1" />
                  <span className="text-[10px] font-mono">{tab.label.split(' ')[1] || tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <footer className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md border-t border-white/5 py-1 px-4 z-30 hidden md:flex justify-between items-center">
          <div className="flex gap-4">
            <button onClick={() => setShowSettingsModal(true)} className="text-[9px] font-mono uppercase text-muted-foreground hover:text-white flex items-center gap-1"><Settings className="w-3 h-3" /> System</button>
          </div>
          <div className="text-[9px] font-mono text-muted-foreground/40 uppercase">Neural Link: Active</div>
        </footer>
      </div>
    </Layout>
  );
}

function GameCardItem({ game, onDelete, onStatusUpdate, onProgressUpdate, isInVault, isPop, onLogTimeClick, isLoggingActive }: { game: Game, onDelete: () => void, onStatusUpdate: (status: any) => void, onProgressUpdate: (progress: number) => void, isInVault?: boolean, isPop?: boolean, onLogTimeClick: () => void, isLoggingActive: boolean }) {
  const statusColors: Record<string, "primary" | "secondary" | "accent" | "none"> = { active: "primary", completed: "secondary", backlog: "accent", wishlist: "none" };
  
  const getVibeGlowClass = (vibe: string | null) => {
    if (!vibe) return "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]";
    switch (vibe) {
      case "Chill": return "bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.7)]";
      case "Epic": return "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.7)]";
      case "Gritty": return "bg-orange-700 shadow-[0_0_15px_rgba(194,65,12,0.7)]";
      case "Quick Fix": return "bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.7)]";
      case "Competitive": return "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.7)]";
      default: return "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]";
    }
  };

  const { toast } = useToast();
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: isPop ? 1.05 : 1 }} exit={{ opacity: 0, scale: 0.9 }}>
      <CyberCard glowColor={statusColors[game.status]} className="h-full flex flex-col p-0 group overflow-hidden">
        <div className="relative aspect-[16/9] overflow-hidden">
          <img src={game.coverUrl || ""} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute top-2 right-2 flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); onLogTimeClick(); }} className="bg-black/80 p-1 border border-white/10 text-white rounded-sm"><Clock className="w-[18px] h-[18px]" /></button>
            <span className="bg-black/80 text-[10px] font-mono px-2 py-0.5 border border-white/10 text-white rounded-sm">{game.platform}</span>
          </div>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-display font-black text-lg leading-tight mb-2 truncate text-white">{game.title}</h3>
          <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground mb-4">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {game.playtime || 0}h</span>
            <span className="text-primary">{game.progress || 0}%</span>
          </div>
          <Slider 
            value={[game.progress || 0]} 
            onValueChange={(v) => onProgressUpdate(v[0])} 
            max={100} 
            className="mb-4"
            rangeClassName={getVibeGlowClass(game.vibe)}
          />
          {game.vibe && <div className="text-[8px] font-mono text-muted-foreground/60 uppercase mb-4 tracking-widest">// {game.vibe}</div>}
          <div className="mt-auto flex justify-between items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="text-[10px] font-mono uppercase text-muted-foreground focus:outline-none">[{game.status}]</DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border">
                {["active", "backlog", "completed", "wishlist"].map(s => (
                  <DropdownMenuItem key={s} onClick={() => onStatusUpdate(s)} className="font-mono text-[10px] capitalize">{s}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      </CyberCard>
    </motion.div>
  );
}
