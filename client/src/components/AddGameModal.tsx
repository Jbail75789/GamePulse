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
import { Plus, Zap } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Plus, Zap, Check } from "lucide-react";
import { useState } from "react";

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
        <DialogContent className="bg-card border-primary/50 sm:max-w-md shadow-[0_0_30px_rgba(var(--primary),0.2)]">
          <DialogHeader>
            <DialogTitle className="text-3xl font-display font-black text-primary text-center uppercase tracking-tighter italic">
              Capacity Reached
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6 text-center">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full animate-pulse">
                <Zap className="w-12 h-12 text-primary" />
              </div>
            </div>
            <p className="font-mono text-sm text-muted-foreground leading-relaxed">
              Your neural links are currently capped at 5 active operational slots. 
              Upgrade to <span className="text-primary font-bold">GAMEPULSE PRO</span> for unlimited library capacity and priority neural processing.
            </p>
            <CyberButton 
              className="w-full py-6 text-lg"
              onClick={() => setShowProModal(false)}
            >
              UPGRADE TO PRO
            </CyberButton>
            <p className="text-[10px] font-mono text-muted-foreground/40 uppercase">
              Current Tier: Standard Operator
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
