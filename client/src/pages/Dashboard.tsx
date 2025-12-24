import { useState, useRef, useEffect } from "react";
import { useGames } from "@/hooks/use-games";
import { Layout } from "@/components/Layout";
import { CyberCard } from "@/components/CyberCard";
import { AddGameModal } from "@/components/AddGameModal";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Gamepad2, Trophy, AlertCircle, Trash2, CheckCircle2, Search, Dices } from "lucide-react";
import { type Game } from "@shared/schema";
import { CyberButton } from "@/components/CyberButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";

import { useToast } from "@/hooks/use-toast";

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
  const [selectedStatus, setSelectedStatus] = useState<"active" | "completed" | "backlog">("backlog");
  const [selectedVibe, setSelectedVibe] = useState<"chill" | "intense" | "story" | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [spotlightGame, setSpotlightGame] = useState<Game | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const handlePickGame = () => {
    const eligibleGames = games?.filter(g => g.status === "backlog") || [];
    if (eligibleGames.length === 0) {
      toast({
        title: "No Games Available",
        description: "Complete some games or add more to your backlog!",
        variant: "destructive",
      });
      return;
    }
    const randomIndex = Math.floor(Math.random() * eligibleGames.length);
    setSpotlightGame(eligibleGames[randomIndex]);
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
          console.log("RAWG API Results:", data);
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
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase tracking-wider text-foreground">
              Mission Control
            </h1>
            <p className="text-muted-foreground font-mono">Manage your gaming operations.</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xl font-display font-bold text-primary">
                {filteredGames.length}
              </span>
              <span className="text-sm font-mono text-muted-foreground">
                Showing in <span className="text-primary">{currentTab}</span>
              </span>
              <span className="text-xs font-mono text-muted-foreground/60 ml-2">
                ({games?.length || 0} total)
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePickGame}
              className="px-6 py-3 bg-gradient-to-r from-secondary to-secondary/80 text-background font-display font-bold uppercase tracking-wider rounded-md hover:from-secondary/90 hover:to-secondary/70 transition-all flex items-center gap-2"
              data-testid="button-pick-game"
            >
              <Dices className="w-5 h-5" />
              Pick a Game
            </button>
            <AddGameModal />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative z-50">
          <div className="flex items-center gap-2 bg-black/50 border border-border/50 rounded-md px-4 py-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search RAWG database..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none font-mono text-sm"
              data-testid="input-search-games"
            />
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-black/80 border border-border/50 rounded-md overflow-hidden backdrop-blur-sm max-h-96 overflow-y-auto"
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowPlatformModal(false);
              setSelectedGame(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
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
                          ? "bg-secondary/30 border border-secondary text-secondary"
                          : "bg-black/50 border border-border text-foreground hover:bg-secondary/20"
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
                      onClick={() => setSelectedPlatform(selectedPlatform === platform ? null : platform)}
                      className={`w-full px-4 py-3 rounded-md font-mono font-bold text-sm transition-all duration-200 ${
                        selectedPlatform === platform
                          ? "bg-accent/30 border border-accent text-accent"
                          : "bg-black/50 border border-border text-foreground hover:bg-accent/20"
                      }`}
                      data-testid={`button-platform-${platform}`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleSaveGame}
                  disabled={!selectedPlatform}
                  className={`w-full px-4 py-3 rounded-md font-mono font-bold transition-all duration-200 ${
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
                  className="w-full px-4 py-2 text-muted-foreground font-mono text-sm hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Cyberpunk Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border/50 pb-1">
          {tabData.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative px-6 py-3 font-display font-bold uppercase tracking-wider text-sm transition-all duration-300
                  ${isActive ? 'text-background' : 'text-muted-foreground hover:text-foreground'}
                `}
              >
                {/* Active Tab Background Shape */}
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
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border/50 rounded-lg bg-black/20">
              <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-mono text-lg">No signals detected in this sector.</p>
              <p className="text-sm mt-2">Add a game to initialize tracking.</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              <AnimatePresence>
                {filteredGames.map((game) => (
                  <GameCard 
                    key={game.id} 
                    game={game} 
                    onDelete={() => deleteGame(game.id)}
                    onStatusUpdate={(status) => updateGame({ id: game.id, status })}
                    onProgressUpdate={(progress) => {
                      let newStatus = game.status;
                      if (progress === 100) {
                        newStatus = "completed";
                      } else if (progress > 0 && progress < 100) {
                        newStatus = "active";
                      } else if (progress === 0) {
                        newStatus = "backlog";
                      }
                      updateGame({ id: game.id, progress, status: newStatus });
                      if (progress === 100) {
                        toast({
                          title: "Game Completed!",
                          description: `${game.title} has been moved to The Vault!`,
                          className: "border-secondary text-secondary font-mono",
                        });
                      }
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
                {/* Background Image */}
                <div className="relative aspect-[16/9] overflow-hidden bg-black/50">
                  <img
                    src={spotlightGame.coverUrl}
                    alt={spotlightGame.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-secondary font-display font-bold text-sm uppercase tracking-widest mb-3">
                      Your Next Mission
                    </p>
                    <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 leading-tight drop-shadow-lg">
                      {spotlightGame.title}
                    </h2>
                    <div className="flex gap-3 justify-center mb-6">
                      <span className="bg-secondary/30 backdrop-blur-md text-secondary font-mono text-sm px-4 py-2 rounded-md border border-secondary/50">
                        {spotlightGame.platform}
                      </span>
                      {spotlightGame.vibe && (
                        <span className="bg-primary/30 backdrop-blur-md text-primary font-mono text-sm px-4 py-2 rounded-md border border-primary/50 capitalize">
                          {spotlightGame.vibe}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSpotlightGame(null)}
                      className="mt-8 px-8 py-3 bg-secondary text-background font-display font-bold uppercase tracking-wider rounded-md hover:bg-secondary/90 transition-all"
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
      </div>
    </Layout>
  );
}

function GameCard({ game, onDelete, onStatusUpdate, onProgressUpdate, isInVault }: { 
  game: Game, 
  onDelete: () => void,
  onStatusUpdate: (status: string) => void,
  onProgressUpdate: (progress: number) => void,
  isInVault?: boolean
}) {
  const statusColors: Record<string, "primary" | "secondary" | "accent"> = {
    active: "primary",
    completed: "secondary",
    backlog: "accent",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
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
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&q=80"; // Fallback gaming image
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          
          <div className="absolute top-2 right-2">
            <span className="bg-black/80 backdrop-blur-md text-xs font-mono px-2 py-1 border border-white/10 text-white rounded-sm">
              {game.platform}
            </span>
          </div>
        </div>

        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-display font-bold text-lg leading-tight mb-1 line-clamp-1 text-white group-hover:text-primary transition-colors">
            {game.title}
          </h3>
          
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-4">
            <Clock className="w-3 h-3" />
            <span>{game.playtime}h recorded</span>
          </div>

          {/* Progress Slider */}
          <div className="mb-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-muted-foreground">Progress</span>
              <span className={`text-sm font-display font-bold ${isInVault ? "text-secondary" : "text-primary"}`}>
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
            {isInVault && (
              <p className="text-xs font-mono text-secondary text-center">
                Locked in The Vault
              </p>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-white/5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-white transition-colors flex items-center gap-1 focus:outline-none">
                  Status: <span className={`text-${statusColors[game.status]}`}>{game.status}</span>
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

            <button 
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive transition-colors p-1.5 hover:bg-destructive/10 rounded-sm"
              title="Delete Game"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CyberCard>
    </motion.div>
  );
}
