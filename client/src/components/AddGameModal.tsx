import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGameSchema, type InsertGame } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CyberButton } from "./CyberButton";
import { CyberInput } from "./CyberInput";
import { useGames } from "@/hooks/use-games";
import { Plus, Zap, Check } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddGameModal() {
  const [open, setOpen] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["PC"]);
  const { games, createGame, isCreating } = useGames();
  const isPro = false;

  const platforms = ["PC", "PlayStation", "Xbox", "Switch", "Other"];

  const form = useForm<InsertGame>({
    resolver: zodResolver(insertGameSchema),
    defaultValues: {
      title: "",
      coverUrl: "",
      status: "backlog",
      playtime: 0,
    },
  });

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(p) 
        ? prev.length > 1 ? prev.filter(x => x !== p) : prev
        : [...prev, p]
    );
  };

  const onSubmit = async (data: any) => {
    // Check for duplicates across all selected platforms
    const duplicates = selectedPlatforms.filter(p => 
      games?.some(g => g.title.toLowerCase() === data.title.toLowerCase() && g.platform === p)
    );

    if (duplicates.length > 0) {
      form.setError("title", {
        type: "manual",
        message: `Already in Pulse on: ${duplicates.join(", ")}.`,
      });
      return;
    }

    const activeGamesCount = games?.filter(g => g.status !== 'completed').length || 0;
    const totalToCreate = selectedPlatforms.length;

    if (!isPro && (activeGamesCount + totalToCreate) > 5) {
      setShowProModal(true);
      return;
    }

    // Create entries for each platform
    try {
      for (const platform of selectedPlatforms) {
        await createGame({
          ...data,
          platform,
        });
      }
      setOpen(false);
      form.reset();
      setSelectedPlatforms(["PC"]);
    } catch (error) {
      console.error("Failed to create multi-platform entries", error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <CyberButton className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Game
          </CyberButton>
        </DialogTrigger>
        <DialogContent className="bg-card border-border font-body sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-primary uppercase tracking-tighter">Database Entry</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <CyberInput
              label="Game Title"
              placeholder="e.g. Cyberpunk 2077"
              {...form.register("title")}
              error={form.formState.errors.title?.message}
            />
            
            <CyberInput
              label="Cover Image URL"
              placeholder="https://..."
              {...form.register("coverUrl")}
              error={form.formState.errors.coverUrl?.message}
            />
            
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-display font-bold ml-1">Systems (Multi-Select)</label>
              <div className="flex flex-wrap gap-2 p-1 bg-black/20 border border-white/5 rounded-sm">
                {platforms.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all rounded-sm border ${
                      selectedPlatforms.includes(p) 
                        ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(var(--primary),0.2)]" 
                        : "bg-white/5 border-transparent text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    {selectedPlatforms.includes(p) && <Check className="w-3 h-3" />}
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-display font-bold ml-1">Status</label>
              <Select 
                onValueChange={(val: any) => form.setValue("status", val)} 
                defaultValue={form.getValues("status")}
              >
                <SelectTrigger className="bg-black/40 border-input font-mono rounded-none h-12">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="active" className="font-mono text-primary focus:bg-primary/20">Active</SelectItem>
                  <SelectItem value="backlog" className="font-mono text-muted-foreground focus:bg-muted/20">Backlog</SelectItem>
                  <SelectItem value="completed" className="font-mono text-secondary focus:bg-secondary/20">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <CyberInput
              type="number"
              label="Playtime (Hours)"
              {...form.register("playtime", { valueAsNumber: true })}
              error={form.formState.errors.playtime?.message}
            />

            <div className="flex justify-end pt-4">
              <CyberButton type="submit" isLoading={isCreating}>
                {selectedPlatforms.length > 1 ? `Sync ${selectedPlatforms.length} Systems` : "Save to Database"}
              </CyberButton>
            </div>
          </form>
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
                "Unlimited Vault Capacity",
                "Priority Neural Processing",
                "Advanced Vibe Analytics",
                "Exclusive Neon Cosmetics"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-[10px] font-mono text-white/70 uppercase tracking-widest bg-black/20 p-2 border border-white/5 rounded-sm">
                  <Check className="w-3 h-3 text-purple-500" />
                  {feature}
                </div>
              ))}
            </div>

            <div className="px-4 pt-4">
              <CyberButton 
                className="w-full py-8 text-xl font-black italic tracking-tighter bg-purple-600 hover:bg-purple-500 border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300"
                onClick={() => setShowProModal(false)}
              >
                INITIALIZE PRO UPGRADE
              </CyberButton>
            </div>
            
            <p className="text-[10px] font-mono text-muted-foreground/30 uppercase tracking-[0.2em]">
              Authorization Status: Level 1 Technician
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
