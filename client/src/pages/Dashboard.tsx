import { useState, useRef, useEffect } from "react";
import { useGames } from "@/hooks/use-games";
import { Layout } from "@/components/Layout";
import { CyberCard } from "@/components/CyberCard";
import { AddGameModal } from "@/components/AddGameModal";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Gamepad2, Trophy, AlertCircle, Trash2, CheckCircle2, Search } from "lucide-react";
import { type Game } from "@shared/schema";
import { CyberButton } from "@/components/CyberButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

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
    setShowPlatformModal(true);
  };

  const handlePlatformSelect = async (platform: string) => {
    if (!selectedGame) return;

    try {
      await createGame({
        title: selectedGame.name,
        coverUrl: selectedGame.background_image || "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&q=80",
        platform,
        status: "backlog",
        playtime: 0,
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

  const filteredGames = games?.filter(game => game.status === activeTab) || [];

  const tabData = [
    { id: "active", label: "My Pulse", icon: Gamepad2, color: "text-primary" },
    { id: "completed", label: "The Vault", icon: Trophy, color: "text-secondary" },
    { id: "backlog", label: "Backlog", icon: Clock, color: "text-accent" },
  ] as const;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase tracking-wider text-foreground">
              Mission Control
            </h1>
            <p className="text-muted-foreground font-mono">Manage your gaming operations.</p>
          </div>
          <AddGameModal />
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

        {/* Platform Selection Modal */}
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
              className="bg-card border border-border rounded-lg p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-display font-bold text-foreground mb-2">
                {selectedGame.name}
              </h2>
              <p className="text-muted-foreground font-mono text-sm mb-6">
                Which platform do you own this on?
              </p>

              <div className="space-y-3">
                {["Steam", "Xbox", "PS5"].map((platform) => (
                  <button
                    key={platform}
                    onClick={() => handlePlatformSelect(platform)}
                    className="w-full px-4 py-3 bg-black/50 border border-border hover:bg-primary/20 hover:border-primary text-foreground font-mono font-bold rounded-md transition-all duration-200"
                    data-testid={`button-platform-${platform}`}
                  >
                    {platform}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setShowPlatformModal(false);
                  setSelectedGame(null);
                }}
                className="w-full mt-4 px-4 py-2 text-muted-foreground font-mono text-sm hover:text-foreground transition-colors"
              >
                Cancel
              </button>
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
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function GameCard({ game, onDelete, onStatusUpdate }: { 
  game: Game, 
  onDelete: () => void,
  onStatusUpdate: (status: string) => void
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
        className="h-full flex flex-col p-0 group"
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
