import { useState, useRef, useEffect } from "react";
import { useGames } from "@/hooks/use-games";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { CyberCard } from "@/components/CyberCard";
import { AddGameModal } from "@/components/AddGameModal";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Gamepad2, Trophy, AlertCircle, Trash2, CheckCircle2, Search, Plus, Dices, Share2, Settings, AlertTriangle, Info, Sword, Sofa, Bolt, Hourglass, Zap, Check } from "lucide-react";
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
  genres: { name: string }[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const { games, isLoading, deleteGame, updateGame, createGame } = useGames();
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
  const [spotlightGame, setSpotlightGame] = useState<Game | null>(null);
  const [showRoulette, setShowRoulette] = useState(false);
  const [winnerGame, setWinnerGame] = useState<Game | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinMode, setSpinMode] = useState<string>("chill");
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

    const eligibleGames = (games || [])
      .filter(g => g.status === "backlog" || g.status === "active")
      .filter(g => moods[mode].filter(g));

    if (eligibleGames.length <= 1) {
      toast({ title: "Insufficient Variety", variant: "destructive" });
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

  // Remaining dashboard logic...
  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-display text-primary mb-6 uppercase tracking-tighter">Mission Control</h1>
        {/* Your Original Dashboard UI Rendering goes here */}
      </div>
    </Layout>
    );
}