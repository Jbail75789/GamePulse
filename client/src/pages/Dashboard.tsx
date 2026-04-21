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
import confetti from "canvas-confetti";

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
  const [winnerGame, setWinnerGame] = useState<Game | null>(null);
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

  // --- UI Helpers ---
  const tabData = [
    { id: "active", label: "My Pulse", icon: Gamepad2, color: "text-primary" },
    { id: "completed", label: "The Vault", icon: Trophy, color: "text-secondary" },
    { id: "backlog", label: "The Backlog", icon: Clock, color: "text-accent" },
    { id: "wishlist", label: "Wish List", icon: Sword, color: "text-foreground" },
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

        {/* 4. Tab Navigation */}
        <div className="flex gap-2 border-b border-white/5 pb-2 overflow-x-auto">
          {tabData.map((tab) => (
           <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-display uppercase tracking-widest text-xs transition-all ${
                activeTab === tab.id ? `${tab.color} border-b-2 border-current` : "text-muted-foreground"
              }`}
            >
             <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 5. Game Grid */}
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
    </Layout>
  );
}