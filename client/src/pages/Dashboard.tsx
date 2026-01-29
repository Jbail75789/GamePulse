import { useState, useRef, useEffect } from "react";
import { useGames } from "@/hooks/use-games";
import { Layout } from "@/components/Layout";
import { CyberCard } from "@/components/CyberCard";
import { AddGameModal } from "@/components/AddGameModal";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Gamepad2, Trophy, AlertCircle, Trash2, CheckCircle2, Search, Dices, Share2, Settings, AlertTriangle, Info, Sword, Sofa, Bolt, Hourglass } from "lucide-react";
import { type Game } from "@shared/schema";
import { CyberButton } from "@/components/CyberButton";
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
  DialogTrigger,
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
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "backlog">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<SearchResult | null>(null);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"active" | "completed" | "backlog">("backlog");
  const [selectedVibe, setSelectedVibe] = useState<"chill" | "intense" | "story" | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [spotlightGame, setSpotlightGame] = useState<Game | null>(null);
  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteSource, setRouletteSource] = useState<"backlog" | "active">("backlog");
  const [winnerGame, setWinnerGame] = useState<Game | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinGame, setSpinGame] = useState<Game | null>(null);
  const [isStartingAdventure, setIsStartingAdventure] = useState(false);
  const [justUpdatedId, setJustUpdatedId] = useState<number | null>(null);
  const [pulseCharges, setPulseCharges] = useState(3);
  const [lastWinnerId, setLastWinnerId] = useState<number | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // Low-profile UI sound effects
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
        // "Power-up" chime: bright, ascending synth chord
        const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
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
      epic: { filter: (g: Game) => g.vibe === 'story' || g.vibe === 'intense', label: 'Epic Quest' },
      quick: { filter: (g: Game) => g.vibe === 'intense', label: 'Quick Hit' },
      chill: { filter: (g: Game) => g.vibe === 'chill', label: 'Chill Vibe' },
      chaos: { filter: () => true, label: 'Chaos Mode' }
    };

    let eligibleGames = games?.filter(g => g.status === rouletteSource) || [];
    
    // Additional filtering for "Keep the Pulse" mode: only games with 1-99% progress
    if (rouletteSource === "active") {
      eligibleGames = eligibleGames.filter(g => (g.progress || 0) > 0 && (g.progress || 0) < 100);
    } else {
      // Find a Pulse: only games with 0% progress (or precisely at 0 if specified)
      eligibleGames = eligibleGames.filter(g => (g.progress || 0) === 0);
    }

    eligibleGames = eligibleGames.filter(moods[mode].filter);

    if (eligibleGames.length <= 1) {
      toast({
        title: "Insufficient Variety",
        description: `Add more ${moods[mode].label} games to shuffle! (Need at least 2 games)`,
        variant: "destructive",
      });
      return;
    }

    // Anti-repeat logic: try to pick a different game than the last one
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
        setPulseCharges(prev => Math.max(0, prev - 1));
        playSound('win');
        
        // Haptic vibration for mobile
        if ('vibrate' in navigator) {
          navigator.vibrate(200);
        }
        
        // Confetti burst exactly when sound plays
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00ff9f', '#00b8ff', '#d600ff'],
          disableForReducedMotion: true
        });
        
        // Haptic feedback / visual celebration
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
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

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(async () => {
        const apiKey = import.meta.env.VITE_RAWG_API_KEY;
        if (!apiKey) {
          console.error("RAWG API key not found");
          return;
        }

        try {
          const response = await fetch(
            `https://api.rawg.io/api/games?search=${encodeURIComponent(searchQuery)}&key=${apiKey}`
          );
          const data = await response.json();
          setSearchResults(data.results || []);
        } catch (error) {
          console.error("Failed to search RAWG API:", error);
          setSearchResults([]);
        }
      }, 500);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
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
      toast({
        title: "Error",
        description: "Please select a platform",
        variant: "destructive",
      });
      return;
    }

    try {
      await createGame({
        title: selectedGame.name,
        coverUrl: selectedGame.background_image || "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&q=80",
        platform: selectedPlatform,
        status: selectedStatus,
        playtime: 0,
        vibe: selectedVibe,
      });

      toast({
        title: "Game Added",
        description: `${selectedGame.name} added to your library!`,
        className: "border-primary text-primary font-mono",
      });

      setShowPlatformModal(false);
      setSelectedGame(null);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add game to library",
        variant: "destructive",
      });
    }
  };

  const tabData = [
    { id: "active", label: "My Pulse", icon: Gamepad2, color: "text-primary" },
    { id: "completed", label: "The Vault", icon: Trophy, color: "text-secondary" },
    { id: "backlog", label: "The Backlog", icon: Clock, color: "text-accent" },
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
            <section className="pt-4 border-t border-white/5">
              <h4 className="flex items-center gap-2 font-display text-sm text-destructive mb-2">
                <AlertTriangle className="w-4 h-4" /> Danger Zone
              </h4>
              {!showResetConfirm ? (
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full py-2 bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono rounded-sm hover:bg-destructive/20 transition-all tactile-press"
                >
                  Reset All Data logs
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] text-destructive font-mono uppercase text-center animate-pulse">Confirm total data wipe?</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleResetData}
                      disabled={isResetting}
                      className="flex-1 py-2 bg-destructive text-background text-xs font-bold font-mono rounded-sm tactile-press disabled:opacity-50"
                    >
                      {isResetting ? "PURGING..." : "YES, PURGE"}
                    </button>
                    <button 
                      onClick={() => setShowResetConfirm(false)}
                      className="flex-1 py-2 bg-black/50 border border-border text-xs font-mono rounded-sm tactile-press"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4 md:space-y-8 pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
          <div className="flex justify-between items-start w-full">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold uppercase tracking-wider text-foreground">
                Mission Control
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground font-mono">Manage your gaming operations.</p>
              <div className="mt-2 md:mt-3 flex items-center gap-1 md:gap-2 flex-wrap">
                <span className="text-[1.25rem] md:text-[1.5rem] font-display font-bold text-primary">
                  {filteredGames.length}
                </span>
                <span className="text-[0.75rem] md:text-[0.875rem] font-mono text-muted-foreground">
                  in <span className="text-primary">{currentTab}</span>
                </span>
                <span className="text-[0.7rem] md:text-[0.75rem] font-mono text-muted-foreground/60">
                  ({games?.length || 0} total)
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="flex flex-col gap-1 flex-1 md:flex-none">
              <button
                onClick={() => setShowRoulette(true)}
                disabled={pulseCharges === 0}
                className="w-full px-3 md:px-6 py-2 md:py-3 bg-gradient-to-r from-secondary to-secondary/80 text-background font-display font-bold uppercase tracking-wider text-xs md:text-base rounded-md hover:from-secondary/90 hover:to-secondary/70 transition-all flex items-center justify-center gap-1 md:gap-2 tactile-press disabled:opacity-50 disabled:grayscale"
                data-testid="button-pick-game"
              >
                <Dices className="w-4 md:w-5 h-4 md:h-5" />
                <span className="hidden sm:inline">Pick a Game</span>
                <span className="sm:hidden">Game</span>
              </button>
              <div className="flex justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 w-4 rounded-full transition-colors ${i < pulseCharges ? "bg-secondary shadow-[0_0_5px_rgba(var(--secondary),0.5)]" : "bg-white/10"}`}
                  />
                ))}
              </div>
            </div>
            <AddGameModal />
          </div>
        </div>

        {/* Share Button (Vault Only) */}
        {activeTab === "completed" && filteredGames.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center md:justify-end">
            <button 
              onClick={handleShareVault}
              className="flex items-center gap-2 px-4 py-2 bg-secondary/10 border border-secondary text-secondary text-xs font-display font-bold uppercase tracking-widest rounded-sm hover:bg-secondary/20 transition-all tactile-press"
            >
              <Share2 className="w-4 h-4" /> Share My Vault
            </button>
          </motion.div>
        )}
        
        {/* Roulette Modal */}
        <Dialog open={showRoulette} onOpenChange={setShowRoulette}>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display uppercase tracking-widest text-secondary text-center mb-4">Mood-Based Roulette</DialogTitle>
              <div className="flex bg-black/40 p-1 rounded-md border border-white/5 mb-6">
                <button 
                  onClick={() => setRouletteSource("backlog")}
                  className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest transition-all rounded-sm ${rouletteSource === "backlog" ? "bg-primary text-background font-bold shadow-[0_0_10px_rgba(var(--primary),0.3)]" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Backlog (0%)
                </button>
                <button 
                  onClick={() => setRouletteSource("active")}
                  className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest transition-all rounded-sm ${rouletteSource === "active" ? "bg-secondary text-background font-bold shadow-[0_0_10px_rgba(var(--secondary),0.3)]" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Active (1-99%)
                </button>
              </div>
              <DialogDescription className="font-mono text-xs text-muted-foreground text-center">
                Select your operational profile for the next session.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-3 py-4">
              {[
                { id: "epic", label: "Epic Quest", desc: "RPG / Story Focused", icon: Trophy, color: "text-secondary", bg: "bg-secondary/10" },
                { id: "quick", label: "Quick Hit", desc: "Action / Intensity", icon: Gamepad2, color: "text-primary", bg: "bg-primary/10" },
                { id: "chill", label: "Chill Vibe", desc: "Indie / Chill", icon: Info, color: "text-accent", bg: "bg-accent/10" },
                { id: "chaos", label: "Chaos Mode", desc: "Total Randomization", icon: Dices, color: "text-foreground", bg: "bg-white/5" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handlePickGame(opt.id as any)}
                  className={`flex items-center gap-4 p-4 ${opt.bg} border border-white/5 rounded-md hover:border-white/20 transition-all tactile-press text-left group`}
                >
                  <div className={`p-2 rounded-sm bg-black/40 ${opt.color}`}>
                    <opt.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-display font-bold uppercase tracking-wider">{opt.label}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Spinning Overlay */}
        <AnimatePresence>
          {isSpinning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center"
            >
              <div className="relative w-full max-w-lg px-6 text-center">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mb-8"
                >
                  <div className="text-[10px] font-mono text-primary uppercase tracking-[0.3em] mb-2 animate-pulse">
                    Scanning Neural Pathways...
                  </div>
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                </motion.div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={spinGame?.id || 'empty'}
                    initial={{ y: 50, opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                    animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ y: -50, opacity: 0, scale: 1.2, filter: "blur(10px)" }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className="min-h-[120px] flex flex-col items-center justify-center relative"
                  >
                    <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full animate-pulse" />
                    <h2 className="text-4xl md:text-7xl font-display font-black uppercase tracking-tighter text-white drop-shadow-[0_0_20px_rgba(var(--primary),0.8)] z-10">
                      {spinGame?.title || "???"}
                    </h2>
                    <div className="mt-4 text-secondary font-mono text-sm uppercase tracking-[0.5em] z-10">
                      {spinGame?.platform}
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-12 flex justify-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        opacity: [0.2, 1, 0.2],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                      className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.8)]"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Winner Modal */}
        <Dialog open={!!winnerGame} onOpenChange={(open) => !open && setWinnerGame(null)}>
          <DialogContent className="bg-card border-secondary sm:max-w-sm overflow-hidden p-0 animate-haptic-pop">
            {winnerGame && (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 10,
                  delay: 0.1
                }}
                className="relative"
              >
                <div className="h-48 w-full relative">
                  <img src={winnerGame.coverUrl} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="text-[10px] font-mono text-secondary uppercase tracking-[0.2em] mb-1">Target Identified</div>
                    <h2 className="text-xl font-display font-bold uppercase leading-tight text-white">{winnerGame.title}</h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                    Neural link established. The system recommends initializing this sequence immediately.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartAdventure(winnerGame)}
                      disabled={isStartingAdventure}
                      className="flex-1 py-3 bg-secondary text-background font-display font-bold uppercase tracking-wider text-xs rounded-sm tactile-press disabled:opacity-50"
                    >
                      {isStartingAdventure ? "INITIALIZING..." : "Start Adventure"}
                    </button>
                    <button
                      onClick={() => setWinnerGame(null)}
                      className="px-4 py-3 bg-white/5 border border-white/10 text-xs font-mono rounded-sm hover:bg-white/10 transition-colors"
                    >
                      SKIP
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </DialogContent>
        </Dialog>

        {/* Search Bar */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-black/50 border border-border/50 rounded-md px-3 md:px-4 py-2 md:py-3">
            <Search className="w-4 md:w-5 h-4 md:h-5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none font-mono text-xs md:text-sm"
              data-testid="input-search-games"
            />
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-black/80 border border-border/50 rounded-md overflow-hidden backdrop-blur-sm z-20 max-h-96 overflow-y-auto"
            >
              {searchResults.slice(0, 8).map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleGameSelect(result)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-primary/20 transition-colors cursor-pointer group border-b border-border/30 last:border-b-0"
                  data-testid={`result-game-${result.id}`}
                >
                  {result.background_image ? (
                    <img
                      src={result.background_image}
                      alt={result.name}
                      className="w-12 h-12 object-cover rounded-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded-sm flex items-center justify-center">
                      <Gamepad2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <span className="flex-1 text-sm font-mono text-foreground group-hover:text-primary transition-colors">
                    {result.name}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Game Details Modal */}
        {showPlatformModal && selectedGame && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowPlatformModal(false);
              setSelectedGame(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border rounded-lg p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-display font-bold text-foreground mb-1">
                {selectedGame.name}
              </h2>
              <p className="text-muted-foreground font-mono text-xs mb-6">
                Configure before adding to library
              </p>

              {/* Status Selection */}
              <div className="mb-6">
                <label className="text-sm font-display font-bold text-foreground mb-2 block">
                  Status
                </label>
                <div className="space-y-2">
                  {["active", "backlog", "completed"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status as "active" | "backlog" | "completed")}
                      className={`w-full px-4 py-2 rounded-md font-mono text-sm transition-all duration-200 capitalize ${
                        selectedStatus === status
                          ? "bg-primary/30 border border-primary text-primary"
                          : "bg-black/50 border border-border text-foreground hover:bg-primary/20"
                      }`}
                      data-testid={`button-status-${status}`}
                    >
                      {status === "active" ? "Playing Now" : status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vibe Selection */}
              <div className="mb-6">
                <label className="text-sm font-display font-bold text-foreground mb-2 block">
                  Vibe (Optional)
                </label>
                <div className="space-y-2">
                  {["chill", "intense", "story"].map((vibe) => (
                    <button
                      key={vibe}
                      onClick={() => setSelectedVibe(selectedVibe === vibe ? null : (vibe as "chill" | "intense" | "story"))}
                      className={`w-full px-4 py-2 rounded-md font-mono text-sm transition-all duration-200 capitalize ${
                        selectedVibe === vibe
                          ? "bg-accent/30 border border-accent text-accent"
                          : "bg-black/50 border border-border text-foreground hover:bg-accent/20"
                      }`}
                      data-testid={`button-vibe-${vibe}`}
                    >
                      {vibe}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform Selection */}
              <div className="mb-6">
                <label className="text-sm font-display font-bold text-foreground mb-2 block">
                  Platform
                </label>
                <div className="space-y-2">
                  {["Steam", "Xbox", "PS5"].map((platform) => (
                    <button
                      key={platform}
                      onClick={() => setSelectedPlatform(platform)}
                      className={`w-full px-4 py-3 rounded-md font-mono font-bold text-sm transition-all duration-200 tactile-press ${
                        selectedPlatform === platform
                          ? "bg-secondary/30 border border-secondary text-secondary"
                          : "bg-black/50 border border-border text-foreground hover:bg-secondary/20"
                      }`}
                      data-testid={`button-platform-${platform}`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleSaveGame}
                  disabled={!selectedPlatform}
                  className={`w-full px-4 py-3 rounded-md font-mono font-bold transition-all duration-200 tactile-press ${
                    selectedPlatform
                      ? "bg-primary text-background hover:bg-primary/90"
                      : "bg-black/30 text-muted-foreground cursor-not-allowed"
                  }`}
                  data-testid="button-save-game"
                >
                  Save to Library
                </button>
                <button
                  onClick={() => {
                    setShowPlatformModal(false);
                    setSelectedGame(null);
                  }}
                  className="w-full px-4 py-2 text-muted-foreground font-mono text-sm hover:text-foreground transition-colors tactile-press"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Desktop Cyberpunk Tabs */}
        <div className="hidden md:flex flex-wrap gap-2 border-b border-border/50 pb-1">
          {tabData.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative px-6 py-3 font-display font-bold uppercase tracking-wider text-sm transition-all duration-300 tactile-press
                  ${isActive ? 'text-background' : 'text-muted-foreground hover:text-foreground'}
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute inset-0 bg-gradient-to-r ${tab.id === 'active' ? 'from-primary to-primary/80' : tab.id === 'completed' ? 'from-secondary to-secondary/80' : 'from-accent to-accent/80'} skew-x-12 rounded-sm`}
                  />
                )}
                
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-background' : tab.color}`} />
                  {tab.label}
                  <span className={`ml-2 text-xs opacity-60 font-mono bg-black/20 px-1.5 rounded-full ${isActive ? 'text-background' : ''}`}>
                    {games?.filter(g => g.status === tab.id).length || 0}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Grid */}
        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="empty-state-container">
              {activeTab === "completed" ? (
                <>
                  <Trophy className="w-16 h-16 mb-4 text-secondary/40" />
                  <h3 className="text-xl font-display font-bold text-foreground mb-2">The Vault is Silent</h3>
                  <p className="font-mono text-sm text-muted-foreground max-w-xs">Your legacy hasn't begun yet. Time to finish a legend!</p>
                </>
              ) : activeTab === "active" ? (
                <>
                  <Gamepad2 className="w-16 h-16 mb-4 text-primary/40" />
                  <h3 className="text-xl font-display font-bold text-foreground mb-2">No Active Signals</h3>
                  <p className="font-mono text-sm text-muted-foreground max-w-xs">Initiate a gaming session to see your pulse.</p>
                </>
              ) : (
                <>
                  <Clock className="w-16 h-16 mb-4 text-accent/40" />
                  <h3 className="text-xl font-display font-bold text-foreground mb-2">Backlog Offline</h3>
                  <p className="font-mono text-sm text-muted-foreground max-w-xs">Add potential missions from the database above.</p>
                </>
              )}
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-[100px] md:pb-0"
            >
              <AnimatePresence mode="popLayout">
                {filteredGames.map((game) => (
                  <GameCard 
                    key={game.id} 
                    game={game}
                    isPop={justUpdatedId === game.id}
                    onDelete={() => deleteGame(game.id)}
                    onStatusUpdate={(status) => {
                      setJustUpdatedId(game.id);
                      setTimeout(() => setJustUpdatedId(null), 1000);
                      updateGame({ id: game.id, status });
                    }}
                    onProgressUpdate={(progress) => {
                      let newStatus = game.status;
                      const progressDiff = progress - (game.progress || 0);
                      
                      if (progress === 100) {
                        newStatus = "completed";
                        setPulseCharges(3);
                      } else if (progress > 0 && progress < 100) {
                        newStatus = "active";
                        if (progressDiff >= 5) {
                          setPulseCharges(3);
                        }
                      } else if (progress === 0) {
                        newStatus = "backlog";
                      }
                      
                      if (progress === 100) {
                        setJustUpdatedId(game.id);
                        setTimeout(() => setJustUpdatedId(null), 1000);
                        toast({
                          title: "Game Completed!",
                          description: `${game.title} has been moved to The Vault!`,
                          className: "border-secondary text-secondary font-mono",
                        });
                      }
                      
                      updateGame({ id: game.id, progress, status: newStatus });
                    }}
                    isInVault={game.status === "completed"}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Spotlight Modal */}
        {spotlightGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSpotlightGame(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative overflow-hidden rounded-lg border-2 border-secondary shadow-2xl">
                <div className="relative aspect-[16/9] overflow-hidden bg-black/50">
                  <img
                    src={spotlightGame.coverUrl}
                    alt={spotlightGame.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-secondary font-display font-bold text-sm uppercase tracking-widest mb-3">
                      Your Next Mission
                    </p>
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-bold text-white mb-4 md:mb-6 leading-tight drop-shadow-lg">
                      {spotlightGame.title}
                    </h2>
                    <div className="flex gap-2 md:gap-3 justify-center mb-4 md:mb-6 flex-wrap">
                      <span className="bg-secondary/30 backdrop-blur-md text-secondary font-mono text-xs md:text-sm px-3 md:px-4 py-1 md:py-2 rounded-md border border-secondary/50">
                        {spotlightGame.platform}
                      </span>
                      {spotlightGame.vibe && (
                        <span className="bg-primary/30 backdrop-blur-md text-primary font-mono text-xs md:text-sm px-3 md:px-4 py-1 md:py-2 rounded-md border border-primary/50 capitalize">
                          {spotlightGame.vibe}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSpotlightGame(null)}
                      className="mt-6 md:mt-8 px-6 md:px-8 py-2 md:py-3 bg-secondary text-background font-display font-bold uppercase tracking-wider text-sm md:text-base rounded-md hover:bg-secondary/90 transition-all tactile-press"
                      data-testid="button-spotlight-close"
                    >
                      Let's Go!
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-background/95 border-t border-border/50 backdrop-blur-md z-40">
          <div className="flex justify-around items-stretch">
            {tabData.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              const count = games?.filter(g => g.status === tab.id).length || 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-all duration-300 tactile-press ${
                    isActive 
                      ? `border-t-4 ${tab.id === 'active' ? 'border-primary text-primary' : tab.id === 'completed' ? 'border-secondary text-secondary' : 'border-accent text-accent'} bg-black/30`
                      : 'border-t-4 border-transparent text-muted-foreground'
                  }`}
                  data-testid={`button-mobile-tab-${tab.id}`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-mono font-bold">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Low-profile footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md border-t border-white/5 py-1 px-4 z-40 flex justify-between items-center">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab("completed")}
            className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${activeTab === 'completed' ? 'text-secondary' : 'text-muted-foreground hover:text-white'}`}
          >
            [ The Vault ]
          </button>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
          >
            <Settings className="w-3 h-3" /> System
          </button>
        </div>
        <div className="text-[9px] font-mono text-muted-foreground/40 uppercase">
          Neural Link: Active
        </div>
      </footer>
    </Layout>
  );
}

function GameCard({ game, onDelete, onStatusUpdate, onProgressUpdate, isInVault, isPop }: { 
  game: Game, 
  onDelete: () => void,
  onStatusUpdate: (status: "active" | "completed" | "backlog") => void,
  onProgressUpdate: (progress: number) => void,
  isInVault?: boolean,
  isPop?: boolean
}) {
  const { toast } = useToast();
  const statusColors: Record<string, "primary" | "secondary" | "accent"> = {
    active: "primary",
    completed: "secondary",
    backlog: "accent",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: isPop ? 1.05 : 1,
        transition: {
          scale: {
            type: "spring",
            stiffness: 300,
            damping: 15
          }
        }
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={isPop ? "z-10" : "z-0"}
    >
      <CyberCard 
        glowColor={statusColors[game.status]}
        className={`h-full flex flex-col p-0 group ${
          isInVault ? "border-yellow-500/50 shadow-lg shadow-yellow-500/20" : ""
        }`}
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-black/50">
          <img 
            src={game.coverUrl || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80"} 
            alt={game.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&q=80";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          
          <div className="absolute top-2 right-2">
            <span className="bg-black/80 backdrop-blur-md text-xs font-mono px-2 py-1 border border-white/10 text-white rounded-sm">
              {game.platform}
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-5 flex flex-col flex-1">
          <h3 className="font-display font-black text-[1rem] sm:text-[1.125rem] md:text-[1.25rem] leading-tight mb-1 line-clamp-1 text-white group-hover:text-primary transition-colors">
            {game.title}
          </h3>
          
          <div className="flex items-center gap-1 sm:gap-2 text-[0.75rem] font-mono text-muted-foreground mb-2 sm:mb-4">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{game.playtime}h</span>
          </div>

          <div className="mb-3 sm:mb-4 space-y-1 sm:space-y-2">
            <div className="flex justify-between items-center gap-1">
              <span className="text-[0.75rem] font-mono text-muted-foreground">Progress</span>
              <span className={`text-[0.75rem] sm:text-[0.875rem] font-display font-bold ${isInVault ? "text-secondary" : "text-primary"}`}>
                {game.progress || 0}%
              </span>
            </div>
            <Slider
              value={[game.progress || 0]}
              onValueChange={(value) => onProgressUpdate(value[0])}
              max={100}
              step={1}
              className="w-full"
              disabled={isInVault}
              data-testid={`slider-progress-${game.id}`}
            />
            {game.vibe && (
              <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-tighter">
                <span>//</span>
                {game.vibe === 'story' && <Sword className="w-3 h-3" />}
                {game.vibe === 'chill' && <Sofa className="w-3 h-3" />}
                {game.vibe === 'intense' && <Bolt className="w-3 h-3" />}
                {game.vibe === 'long' && <Hourglass className="w-3 h-3" />}
                <span>{game.vibe}</span>
              </div>
            )}
            {isInVault && (
              <p className="text-xs font-mono text-secondary text-center mt-1">
                Locked
              </p>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between gap-1 sm:gap-2 pt-2 sm:pt-4 border-t border-white/5">
            {isInVault ? (
              <button
                onClick={() => {
                  onStatusUpdate("active");
                  onProgressUpdate(99);
                  toast({
                    title: "System Restored",
                    description: `${game.title} has been moved back to active status at 99%.`,
                    className: "border-primary text-primary font-mono",
                  });
                }}
                className="flex-1 py-1.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono rounded-sm hover:bg-primary/20 transition-all tactile-press uppercase tracking-wider"
              >
                Restore
              </button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-white transition-colors flex items-center gap-1 focus:outline-none truncate">
                    <span className="hidden sm:inline">Status:</span> <span className={`text-${statusColors[game.status]}`}>{game.status}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-card border-border">
                  <DropdownMenuItem onClick={() => onStatusUpdate("active")} className="font-mono cursor-pointer hover:bg-primary/20 hover:text-primary">
                    <Gamepad2 className="w-3 h-3 mr-2" /> Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusUpdate("completed")} className="font-mono cursor-pointer hover:bg-secondary/20 hover:text-secondary">
                    <CheckCircle2 className="w-3 h-3 mr-2" /> Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusUpdate("backlog")} className="font-mono cursor-pointer hover:bg-accent/20 hover:text-accent">
                    <Clock className="w-3 h-3 mr-2" /> Backlog
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <button 
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive transition-colors p-1.5 hover:bg-destructive/10 rounded-sm tactile-press"
              title="Delete Game"
              data-testid={`button-delete-${game.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CyberCard>
    </motion.div>
  );
}
