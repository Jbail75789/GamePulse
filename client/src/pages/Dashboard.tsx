import { useState, useRef, useEffect } from "react";
import { useGames } from "@/hooks/use-games";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { CyberCard } from "@/components/CyberCard";
import { AddGameModal } from "@/components/AddGameModal";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Gamepad2, Trophy, AlertCircle, Trash2, CheckCircle2, Search, Plus, Dices, Share2, Settings, AlertTriangle, Info, Sword, Sofa, Bolt, Hourglass, Zap, Check, Sparkles, Loader2 } from "lucide-react";
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
import confetti from "canvas-confetti";

interface SearchResult {
  id: number;
  name: string;
  background_image: string | null;
  released: string | null;
  rating: number | null;
  playtime: number | null;
  genres: { name: string }[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const { games, isLoading, deleteGame, updateGame, createGame } = useGames();
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "backlog" | "wishlist">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchAddOpen, setSearchAddOpen] = useState(false);
  const [searchAddPrefill, setSearchAddPrefill] = useState<{ title: string; coverUrl?: string | null; targetHours?: number | null } | undefined>();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [spotlightGame, setSpotlightGame] = useState<Game | null>(null);
  const [showRoulette, setShowRoulette] = useState(false);
  const [winnerGame, setWinnerGame] = useState<Game | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinMode, setSpinMode] = useState<string>("chill");
  const [spinSource, setSpinSource] = useState<"active" | "backlog" | "both">("both");
  const [showPickModal, setShowPickModal] = useState(false);
  const [chaosHovered, setChaosHovered] = useState(false);
  const [spinGame, setSpinGame] = useState<Game | null>(null);
  const [isStartingAdventure, setIsStartingAdventure] = useState(false);
  const [loggingTimeId, setLoggingTimeId] = useState<number | null>(null);
  const [logHours, setLogHours] = useState<string>("1");
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [pulseCharges, setPulseCharges] = useState(3);
  const [nextRefill, setNextRefill] = useState<string | null>(null);
  const [justUpdatedId, setJustUpdatedId] = useState<number | null>(null);
  const [isPro, setIsPro] = useState(user?.isPro ?? false);

 useEffect(() => {
    if (user) {
      setIsPro(user.isPro);
    }
  }, [user]);

  const [lastWinnerId, setLastWinnerId] = useState<number | null>(null);
  const [showProModal, setShowProModal] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

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
    
    const updates: any = { status: newStatus };
    if (currentGame?.status === 'completed' && newStatus !== 'completed') {
      updates.progress = 0;
      updates.playtime = 0;
    }
    updateGame({ id: gameId, ...updates });
  };

  const handleLogTime = async (game: Game) => {
    const hours = parseFloat(logHours);
    if (isNaN(hours) || hours <= 0) return;
    setIsLoggingTime(true);
    try {
      const prevProgress = game.progress || 0;
      const newTotal = (game.playtime || 0) + hours;
      const target = game.targetHours || 20;
      const newProgress = Math.min(100, Math.floor((newTotal / target) * 100));
      let newStatus = game.status;
      if (newProgress >= 100) newStatus = "completed";
      else if (newProgress > 0 && game.status !== 'completed') newStatus = "active";

      await updateGame({
        id: game.id,
        playtime: newTotal,
        progress: newProgress,
        status: newStatus,
      });

      setLoggingTimeId(null);
      setLogHours("1");
    } catch (error) {
      toast({ title: "Update Failed", variant: "destructive" });
    } finally {
      setIsLoggingTime(false);
    }
  };

  const playSound = (type: 'tick' | 'win' | 'clank') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (type === 'clank') {
        const bufferSize = Math.floor(audioCtx.sampleRate * 0.22);
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.12));
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const bp = audioCtx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(5000, audioCtx.currentTime);
        bp.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.22);
        bp.Q.value = 15;
        const hp = audioCtx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 400;
        const clankGain = audioCtx.createGain();
        clankGain.gain.setValueAtTime(1.1, audioCtx.currentTime);
        clankGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
        noise.connect(bp); bp.connect(hp); hp.connect(clankGain); clankGain.connect(audioCtx.destination);
        noise.start(); noise.stop(audioCtx.currentTime + 0.25);
        return;
      }
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
        oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.1);
      }
    } catch (e) { console.warn('Audio feedback failed:', e); }
  };

  const handlePickGame = (mode: string) => {
    if (!isPro && pulseCharges <= 0) {
      toast({ title: "No Charges", variant: "destructive" });
      return;
    }

    const moods: Record<string, { filter: (g: Game) => boolean; label: string }> = {
      chill: { filter: (g: Game) => g.vibe?.toLowerCase() === 'chill', label: 'Chill' },
      epic: { filter: (g: Game) => g.vibe?.toLowerCase() === 'epic', label: 'Epic' },
      quickfix: { filter: (g: Game) => g.vibe?.toLowerCase() === 'quick fix', label: 'Quick Fix' },
      competitive: { filter: (g: Game) => g.vibe?.toLowerCase() === 'competitive', label: 'Competitive' },
      chaos: { filter: () => true, label: 'Chaos Mode' },
    };

    const sourceFilter = (g: Game) =>
      spinSource === "both" ? (g.status === "active" || g.status === "backlog")
      : g.status === spinSource;

    const sourcePool = (games || []).filter(sourceFilter);

    if (sourcePool.length === 0) {
      const label = spinSource === "active" ? "Active Missions"
        : spinSource === "backlog" ? "Backlog Missions"
        : "Missions";
      toast({
        title: `No ${label} Found`,
        description: spinSource === "active"
          ? "Add games to your Pulse first!"
          : spinSource === "backlog"
          ? "Add games to your Backlog first!"
          : "Add some games to spin!",
        variant: "destructive",
      });
      return;
    }

    // CHAOS OVERRIDE: bypass vibe filter entirely
    const eligibleGames = mode === "chaos"
      ? sourcePool
      : sourcePool.filter(g => moods[mode].filter(g));

    console.log(`[PICK] mode=${mode} source=${spinSource} pool=${sourcePool.length} eligible=${eligibleGames.length}`);

    if (eligibleGames.length === 0) {
      toast({
        title: "No Matching Vibe",
        description: `No ${moods[mode].label} games in your ${spinSource} list.`,
        variant: "destructive",
      });
      return;
    }

    if (eligibleGames.length === 1) {
      // Only one option — just slam it as the winner with no spin
      const only = eligibleGames[0];
      setSpinMode(mode);
      setWinnerGame(only);
      setLastWinnerId(only.id);
      return;
    }

    let winner = eligibleGames[Math.floor(Math.random() * eligibleGames.length)];
    if (lastWinnerId !== null && eligibleGames.length > 1) {
      winner = eligibleGames.filter(g => g.id !== lastWinnerId)[Math.floor(Math.random() * (eligibleGames.length - 1))];
    }
    
    setSpinMode(mode);
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
          apiRequest("POST", "/api/user/charges/consume").then(res => {
            if (res.ok) res.json().then(data => setPulseCharges(data.charges));
          });
        }
      }
    }, 150);
    setShowRoulette(false);
  };

  // === AI Deep Pulse Chat ===
  type ChatMsg = { role: "user" | "assistant"; content: string };
  const [aiOpen, setAiOpen] = useState(false);
  const [aiGame, setAiGame] = useState<Game | null>(null);
  const [aiMessages, setAiMessages] = useState<ChatMsg[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiLoadingId, setAiLoadingId] = useState<number | null>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  // Extract integer hours from "~45h" or "45 hours" patterns
  const extractHours = (text: string): number | null => {
    const m = text.match(/~?\s*(\d{1,3})\s*(?:h\b|hours?\b|hrs?\b)/i);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return n > 0 && n <= 300 ? n : null;
  };

  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages, aiStreaming]);

  const streamChat = async (history: ChatMsg[], game: Game) => {
    setAiStreaming(true);
    setAiMessages(prev => [...prev, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          gameTitle: game.title,
          currentTarget: game.targetHours ?? null,
          messages: history,
        }),
      });
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setAiMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
    } catch (e: any) {
      setAiMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: `[Codex error: ${e?.message || "connection failed"}]` };
        return next;
      });
    } finally {
      setAiStreaming(false);
      setAiLoadingId(null);
    }
  };

  const handleAIVibeCheck = async (game: Game) => {
    setAiLoadingId(game.id);
    setAiGame(game);
    setAiMessages([]);
    setAiInput("");
    setAiOpen(true);
    // Kick off opening Vibe Check as the first assistant message
    streamChat([{ role: "user", content: "Give me your opening vibe check on this game in 2 punchy sentences." }], game);
  };

  const handleSendAi = () => {
    const text = aiInput.trim();
    if (!text || aiStreaming || !aiGame) return;
    const next: ChatMsg[] = [...aiMessages, { role: "user", content: text }];
    setAiMessages(next);
    setAiInput("");
    streamChat(next, aiGame);
  };

  // === RAWG Search debounce ===
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const key = (import.meta as any).env.VITE_RAWG_API_KEY;
        const r = await fetch(`https://api.rawg.io/api/games?key=${key}&search=${encodeURIComponent(q)}&page_size=8`);
        const d = await r.json();
        setSearchResults(d.results ?? []);
      } catch { setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 350);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  const handlePickSearchResult = (r: SearchResult) => {
    setSearchAddPrefill({
      title: r.name,
      coverUrl: r.background_image,
      targetHours: r.playtime && r.playtime > 0 ? r.playtime : null,
    });
    setSearchAddOpen(true);
    setSearchQuery("");
    setSearchResults([]);
  };

  // === Filtered Games ===
  const filteredGames = (games || []).filter(g => g.status === activeTab);

  const tabs = [
    { id: "active",    label: "My Pulse",    icon: Gamepad2, color: "text-primary"   },
    { id: "completed", label: "The Vault",   icon: Trophy,   color: "text-secondary" },
    { id: "backlog",   label: "The Backlog", icon: Clock,    color: "text-accent"    },
    { id: "wishlist",  label: "Wish List",   icon: Sword,    color: "text-foreground"},
  ] as const;

  const moodOptions = [
    { id: "chill",       label: "Chill",       icon: Sofa,      glow: "hover:text-emerald-300 hover:shadow-[0_0_15px_rgba(110,231,183,0.6)]" },
    { id: "epic",        label: "Epic",        icon: Sword,     glow: "hover:text-amber-300  hover:shadow-[0_0_15px_rgba(252,211,77,0.6)]"  },
    { id: "quickfix",    label: "Quick Fix",   icon: Zap,       glow: "hover:text-lime-300   hover:shadow-[0_0_15px_rgba(190,242,100,0.6)]" },
    { id: "competitive", label: "Competitive", icon: Bolt,      glow: "hover:text-red-400    hover:shadow-[0_0_15px_rgba(248,113,113,0.6)]" },
    { id: "chaos",       label: "Chaos Mode",  icon: AlertTriangle, glow: "hover:text-fuchsia-400 hover:shadow-[0_0_25px_rgba(232,121,249,0.9)]" },
  ];

  return (
    <Layout>
      <div className={`p-4 md:p-8 space-y-8 ${spinMode === "chaos" && winnerGame ? "animate-[chaosShake_0.4s_ease-in-out_infinite]" : ""}`}>
        {/* === HEADER === */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase tracking-wider">Mission Control</h1>
            <p className="text-sm text-muted-foreground font-mono">
              Manage your gaming operations.
              {!isPro && <span className="ml-2 text-secondary">{pulseCharges} charges left</span>}
              {isPro && <span className="ml-2 text-primary">PRO ∞</span>}
            </p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <Button
              onClick={() => { setSearchAddPrefill(undefined); setSearchAddOpen(true); }}
              className="flex-1 md:flex-none bg-primary text-background font-bold uppercase hover:bg-primary/90"
              data-testid="button-add-game"
            >
              <Plus className="mr-2 h-5 w-5" /> Add Game
            </Button>

            <Button
              onClick={() => setShowPickModal(true)}
              className="flex-1 md:flex-none bg-gradient-to-r from-secondary via-accent to-secondary bg-[length:200%_100%] hover:bg-[position:100%_0] text-background font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(0,184,255,0.4)]"
              disabled={!isPro && pulseCharges === 0}
              data-testid="button-pick-game"
            >
              <Dices className="mr-2 h-5 w-5" /> Pick a Game
            </Button>
          </div>
        </div>

        {/* === RAWG Search === */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search RAWG to add a new game..."
            className="w-full bg-card/50 border border-border rounded-lg pl-10 pr-4 py-3 font-mono focus:border-primary outline-none"
            data-testid="input-search-rawg"
          />
          {searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border/50 rounded-lg shadow-2xl shadow-primary/10 overflow-hidden z-30 max-h-96 overflow-y-auto" data-testid="dropdown-rawg-results">
              {isSearching && <div className="px-4 py-4 text-sm font-mono text-muted-foreground">Searching…</div>}
              {!isSearching && searchResults.length === 0 && (
                <div className="px-4 py-4 text-sm font-mono text-muted-foreground">No matches.</div>
              )}
              {searchResults.map(r => (
                <button
                  key={r.id}
                  onClick={() => handlePickSearchResult(r)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/10 hover:text-primary transition-colors text-left border-b border-border/30 last:border-b-0"
                  data-testid={`result-rawg-${r.id}`}
                >
                  {r.background_image
                    ? <img src={r.background_image} alt="" className="w-12 h-12 object-cover rounded" />
                    : <div className="w-12 h-12 bg-black/40 rounded flex items-center justify-center"><Gamepad2 className="w-5 h-5 text-muted-foreground" /></div>
                  }
                  <span className="font-mono text-sm flex-1 truncate">{r.name}</span>
                  <Plus className="w-4 h-4 opacity-50" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* === TABS === */}
        <div className="flex gap-2 border-b border-white/5 pb-2 overflow-x-auto" data-testid="nav-categories">
          {tabs.map(t => {
            const isActive = activeTab === t.id;
            const count = (games || []).filter(g => g.status === t.id).length;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                data-testid={`tab-${t.id}`}
                className={`relative flex items-center gap-2 px-4 py-2 font-display uppercase tracking-widest text-xs transition-all duration-300 ${
                  isActive ? `${t.color} border-b-2 border-current` : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/5">{count}</span>
              </button>
            );
          })}
        </div>

        {/* === GAME GRID === */}
        {isLoading ? (
          <div className="text-center py-20 font-mono text-muted-foreground">Loading library…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredGames.map(game => (
                <motion.div key={game.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <CyberCard
                    game={game}
                    onUpdateStatus={handleUpdateStatus}
                    onLogTime={() => setLoggingTimeId(game.id)}
                    isLogging={loggingTimeId === game.id}
                    isAILoading={aiLoadingId === game.id}
                    onAIVibeCheck={() => handleAIVibeCheck(game)}
                    onDelete={(id) => deleteGame(id)}
                    onUpdateTarget={(id, targetHours) => {
                      const g = games?.find(x => x.id === id);
                      const playtime = g?.playtime ?? 0;
                      const newProgress = Math.min(100, Math.floor((playtime / targetHours) * 100));
                      updateGame({ id, targetHours, progress: newProgress });
                    }}
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

      {/* === Log Time Dialog === */}
      <Dialog open={loggingTimeId !== null} onOpenChange={(o) => !o && setLoggingTimeId(null)}>
        <DialogContent className="bg-[#0a0a0a] border-primary/40 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-widest">Log Playtime</DialogTitle>
            <DialogDescription className="font-mono text-xs">Hours played in this session.</DialogDescription>
          </DialogHeader>
          <input
            type="number"
            min="0.25"
            step="0.25"
            value={logHours}
            onChange={(e) => setLogHours(e.target.value)}
            className="w-full bg-card/50 border border-border rounded-lg px-3 py-3 font-mono text-lg focus:border-primary outline-none"
            data-testid="input-log-hours"
          />
          <Button
            onClick={() => {
              const g = games?.find(x => x.id === loggingTimeId);
              if (g) handleLogTime(g);
            }}
            disabled={isLoggingTime}
            className="w-full bg-primary text-background font-bold uppercase"
            data-testid="button-confirm-log"
          >
            {isLoggingTime ? "Logging…" : "Confirm"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* === Deep Pulse Chat Modal (centered terminal) === */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent
          className="bg-black border-primary/60 max-w-lg shadow-[0_0_50px_rgba(0,255,159,0.35)] p-0 overflow-hidden"
          data-testid="dialog-ai-vibe"
        >
          <DialogHeader className="px-5 pt-5 pb-2 border-b border-primary/20">
            <DialogTitle className="font-display uppercase tracking-widest text-primary flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Deep Pulse
            </DialogTitle>
            <DialogDescription className="font-mono text-[10px] text-emerald-400/80 uppercase tracking-widest">
              cyber-cynic // mission: <span className="text-primary">{aiGame?.title ?? "—"}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Terminal scroll body */}
          <div
            ref={aiScrollRef}
            className="px-5 py-4 max-h-[55vh] min-h-[260px] overflow-y-auto font-mono text-[13px] leading-relaxed bg-black"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,255,159,0.04) 3px, transparent 4px)",
            }}
            data-testid="ai-chat-log"
          >
            {aiMessages.length === 0 && (
              <p className="text-emerald-400/60 animate-pulse">{">"} jacking into the codex...</p>
            )}
            {aiMessages.map((m, i) => {
              const isAssistant = m.role === "assistant";
              const isLast = i === aiMessages.length - 1;
              const hours = isAssistant && !aiStreaming
                ? extractHours(m.content)
                : isAssistant && aiStreaming && isLast ? null : extractHours(m.content);
              const showApply = isAssistant && hours !== null && aiGame && hours !== (aiGame.targetHours ?? null);
              return (
                <div key={i} className="mb-3" data-testid={`ai-msg-${i}`}>
                  {isAssistant ? (
                    <p className="text-emerald-400" style={{ textShadow: "0 0 6px rgba(0,255,159,0.5)" }}>
                      <span className="text-primary/80">CYNIC{">"}</span>{" "}
                      {m.content}
                      {aiStreaming && isLast && (
                        <span className="inline-block w-2 h-3.5 ml-0.5 bg-primary animate-pulse align-middle" />
                      )}
                    </p>
                  ) : (
                    <p className="text-cyan-300">
                      <span className="text-cyan-500/80">USER{">"}</span> {m.content}
                    </p>
                  )}
                  {showApply && (
                    <button
                      onClick={() => {
                        if (!aiGame) return;
                        const playtime = aiGame.playtime ?? 0;
                        const newProgress = Math.min(100, Math.floor((playtime / hours!) * 100));
                        updateGame({ id: aiGame.id, targetHours: hours!, progress: newProgress });
                        setAiGame({ ...aiGame, targetHours: hours! });
                        toast({ title: "Pulse Target Updated", description: `Set to ${hours}h` });
                      }}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-secondary/60 bg-secondary/15 text-secondary hover:bg-secondary/30 transition-all uppercase tracking-widest text-[11px] font-bold"
                      data-testid={`button-apply-target-${i}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Update Pulse Target → {hours}h
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Input row */}
          <div className="border-t border-primary/20 bg-black p-3 flex items-center gap-2">
            <span className="text-primary font-mono text-sm pl-1">{">"}</span>
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendAi();
                }
              }}
              disabled={aiStreaming}
              placeholder="Ask the Cyber-Cynic more about this mission..."
              className="flex-1 bg-transparent font-mono text-sm text-emerald-400 placeholder:text-emerald-400/30 outline-none border-none"
              data-testid="input-ai-chat"
            />
            <Button
              onClick={handleSendAi}
              disabled={aiStreaming || !aiInput.trim()}
              size="sm"
              className="bg-primary text-background font-bold uppercase font-mono text-xs h-8 px-3 hover:bg-primary/90"
              data-testid="button-send-ai"
            >
              {aiStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiOpen(false)}
              className="font-mono text-xs h-8 px-3 uppercase border-white/20"
              data-testid="button-close-ai"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === PICK A GAME Selection Modal === */}
      <Dialog open={showPickModal} onOpenChange={setShowPickModal}>
        <DialogContent className="bg-[#0a0a0a] border-secondary/50 max-w-lg shadow-[0_0_40px_rgba(0,184,255,0.25)]" data-testid="dialog-pick-game">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-widest text-center text-2xl text-secondary flex items-center justify-center gap-2">
              <Dices className="w-6 h-6" /> Pick a Game
            </DialogTitle>
            <DialogDescription className="text-center font-mono text-xs">
              Choose your source and your vibe.
            </DialogDescription>
          </DialogHeader>

          {/* SOURCE TOGGLE */}
          <div className="mt-2">
            <p className="px-1 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Source</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "active",  label: "Active",  icon: Gamepad2 },
                { id: "backlog", label: "Backlog", icon: Clock },
                { id: "both",    label: "Both",    icon: Sparkles },
              ] as const).map(s => (
                <button
                  key={s.id}
                  onClick={() => setSpinSource(s.id)}
                  data-testid={`source-${s.id}`}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-md border font-mono uppercase tracking-widest text-xs transition-all ${
                    spinSource === s.id
                      ? "bg-secondary/15 border-secondary text-secondary shadow-[0_0_12px_rgba(0,184,255,0.4)]"
                      : "border-white/10 text-muted-foreground hover:text-foreground hover:border-white/30"
                  }`}
                >
                  <s.icon className="w-4 h-4" /> {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* MOOD GRID */}
          <div className="mt-4">
            <p className="px-1 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Mood</p>
            <div className="grid grid-cols-2 gap-2">
              {moodOptions.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setShowPickModal(false); handlePickGame(m.id); }}
                  data-testid={`mood-${m.id}`}
                  className={`flex items-center gap-2 px-3 py-3 rounded-md border border-white/10 font-mono uppercase tracking-widest text-xs transition-all hover:border-white/40 ${m.glow} ${
                    m.id === "chaos"
                      ? "animate-[chaosPulse_1.2s_ease-in-out_infinite] text-fuchsia-400 border-fuchsia-500/40"
                      : "text-foreground"
                  }`}
                >
                  <m.icon className="w-4 h-4" /> {m.label}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* === FULL-SCREEN REEL === */}
      <AnimatePresence>
        {isSpinning && (
          <motion.div
            key="fullscreen-reel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center"
            data-testid="container-reel"
          >
            {/* Scanlines */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,255,159,0.08) 3px, transparent 4px)",
              }}
            />

            <p className="font-display uppercase tracking-[0.4em] text-secondary text-sm mb-6 animate-pulse">
              Spinning the Pulse…
            </p>

            {/* Big bracketed reel */}
            <div className="relative w-[92vw] max-w-5xl h-[42vh] md:h-[48vh] bg-black border-2 border-secondary/60 rounded-xl overflow-hidden shadow-[inset_0_0_80px_rgba(0,184,255,0.4),0_0_60px_rgba(0,184,255,0.4)]">
              {/* Top/bottom fade */}
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />
              {/* Side selector brackets */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-24 bg-primary shadow-[0_0_18px_rgba(0,255,159,1)] z-20" />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-24 bg-primary shadow-[0_0_18px_rgba(0,255,159,1)] z-20" />

              {/* Cover image background */}
              {spinGame?.coverUrl && (
                <img
                  key={`img-${spinGame.id}`}
                  src={spinGame.coverUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
              )}

              {/* Title */}
              <div className="absolute inset-0 flex items-center justify-center px-12">
                <div
                  key={spinGame?.id ?? "init"}
                  className="font-display uppercase tracking-widest text-4xl md:text-7xl text-primary text-center w-full break-words"
                  style={{ textShadow: "0 0 24px rgba(0,255,159,0.95)" }}
                  data-testid="text-reel-current"
                >
                  {spinGame?.title ?? "—"}
                </div>
              </div>
            </div>

            <p className="mt-6 font-mono text-xs text-muted-foreground uppercase tracking-widest">
              [ {spinMode} mode · {spinSource} ]
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Winner Dialog === */}
      <Dialog open={!!winnerGame && !isSpinning} onOpenChange={(o) => !o && setWinnerGame(null)}>
        <DialogContent
          className={`bg-[#0a0a0a] border-primary/60 max-w-md ${spinMode === "chaos" ? "animate-[chaosShake_0.18s_ease-in-out_6]" : ""}`}
          data-testid="dialog-winner"
        >
          <DialogHeader>
            <DialogTitle className={`font-display uppercase tracking-widest text-center text-2xl ${spinMode === "chaos" ? "text-fuchsia-400 animate-[chaosPulse_0.8s_ease-in-out_infinite]" : "text-primary"}`}>
              {spinMode === "chaos" ? "CHAOS LOCKED IN" : "Mission Selected"}
            </DialogTitle>
          </DialogHeader>
          {winnerGame && (
            <div className="space-y-4 text-center">
              {winnerGame.coverUrl && (
                <img
                  src={winnerGame.coverUrl}
                  alt={winnerGame.title}
                  className="w-full h-48 object-cover rounded-md border border-primary/30 shadow-[0_0_30px_rgba(0,255,159,0.3)]"
                  onLoad={() => {
                    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                    playSound("clank");
                  }}
                />
              )}
              <h2 className="font-display text-3xl uppercase tracking-tight">{winnerGame.title}</h2>
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                {winnerGame.platform || "PC"} · {winnerGame.vibe || "—"}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => { handleUpdateStatus(winnerGame.id, "active"); setWinnerGame(null); }}
                  className="flex-1 bg-primary text-background font-bold uppercase"
                  data-testid="button-start-adventure"
                >
                  <Gamepad2 className="w-4 h-4 mr-2" /> Start
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setWinnerGame(null)}
                  className="flex-1 font-mono uppercase"
                  data-testid="button-dismiss-winner"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* === Pro Modal === */}
      <Dialog open={showProModal} onOpenChange={setShowProModal}>
        <DialogContent className="bg-[#161616] border-purple-500/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-white uppercase">Unlock Full Pulse</DialogTitle>
            <DialogDescription>System limits reached. Upgrade to Pro for unlimited storage.</DialogDescription>
          </DialogHeader>
          <Button className="bg-purple-600 hover:bg-purple-500 w-full py-6 text-lg font-bold">UPGRADE FOR $0.99</Button>
        </DialogContent>
      </Dialog>

      <AddGameModal open={searchAddOpen} onOpenChange={setSearchAddOpen} prefill={searchAddPrefill} />
    </Layout>
  );
}