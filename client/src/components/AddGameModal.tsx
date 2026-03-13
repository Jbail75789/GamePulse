import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGameSchema } from "@shared/schema";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CyberButton } from "./CyberButton";
import { CyberInput } from "./CyberInput";
import { useGames } from "@/hooks/use-games";
import { Plus, Zap, Check, Gamepad2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

const addGameFormSchema = insertGameSchema.extend({
  coverUrl: z.string().optional(),
});
type AddGameForm = z.infer<typeof addGameFormSchema>;

interface AddGameModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  prefill?: { title: string; coverUrl?: string | null };
}

const PLATFORMS = ["PC", "Steam", "PS5", "Xbox", "Switch", "Other"];
const VIBES = ["Chill", "Epic", "Gritty", "Quick Fix", "Competitive"];
const STATUSES = [
  { value: "active", label: "Playing Now" },
  { value: "backlog", label: "Backlog" },
  { value: "wishlist", label: "Wish List" },
  { value: "completed", label: "Completed" },
];

export function AddGameModal({ open: controlledOpen, onOpenChange, prefill }: AddGameModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["PC"]);
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("backlog");
  const { games, createGame, isCreating } = useGames();
  const { user } = useAuth();
  const isPro = user?.isPro ?? false;

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) onOpenChange?.(val);
    else setInternalOpen(val);
  };

  const form = useForm<AddGameForm>({
    resolver: zodResolver(addGameFormSchema),
    defaultValues: { title: "", status: "backlog", playtime: 0 },
  });

  useEffect(() => {
    if (open && prefill) {
      form.reset({ title: prefill.title, status: "backlog", playtime: 0 });
      setSelectedStatus("backlog");
      setSelectedPlatforms(["PC"]);
      setSelectedVibe(null);
    }
    if (!open) {
      form.reset({ title: "", status: "backlog", playtime: 0 });
      setSelectedStatus("backlog");
      setSelectedPlatforms(["PC"]);
      setSelectedVibe(null);
    }
  }, [open, prefill]);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p)
        ? prev.length > 1 ? prev.filter(x => x !== p) : prev
        : [...prev, p]
    );
  };

  const onSubmit = async (data: AddGameForm) => {
    const duplicates = selectedPlatforms.filter(p =>
      games?.some(g => g.title.toLowerCase() === data.title.toLowerCase() && g.platform === p)
    );
    if (duplicates.length > 0) {
      form.setError("title", { type: "manual", message: `Already in Pulse on: ${duplicates.join(", ")}.` });
      return;
    }

    const activeCount = games?.filter(g => g.status === "active").length || 0;
    const backlogCount = games?.filter(g => g.status === "backlog").length || 0;
    const total = selectedPlatforms.length;

    if (!isPro) {
      if (selectedStatus === "active" && activeCount + total > 5) { setShowProModal(true); return; }
      if (selectedStatus === "backlog" && backlogCount + total > 10) { setShowProModal(true); return; }
    }

    try {
      for (const platform of selectedPlatforms) {
        await createGame({
          ...data,
          status: selectedStatus as AddGameForm["status"],
          vibe: selectedVibe as AddGameForm["vibe"],
          coverUrl: prefill?.coverUrl || data.coverUrl || "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&q=80",
          platform,
        });
      }
      setOpen(false);
    } catch (error) {
      console.error("Failed to create game entries", error);
    }
  };

  const coverUrl = prefill?.coverUrl;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {!isControlled && (
          <CyberButton className="w-full sm:w-auto" onClick={() => setOpen(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Add Game
          </CyberButton>
        )}
        <DialogContent className="bg-card border-border font-body sm:max-w-md p-0 overflow-hidden">
          {coverUrl ? (
            <div className="relative h-36 w-full overflow-hidden">
              <img src={coverUrl} alt={prefill?.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-card" />
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-3">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display text-primary uppercase tracking-tighter drop-shadow-lg">
                    {prefill?.title || "Add Game"}
                  </DialogTitle>
                </DialogHeader>
              </div>
            </div>
          ) : (
            <div className="px-6 pt-6 pb-2">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-primary/60" />
                  </div>
                  <DialogTitle className="text-2xl font-display text-primary uppercase tracking-tighter">
                    Database Entry
                  </DialogTitle>
                </div>
              </DialogHeader>
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-6 pb-6 pt-4">
            {!prefill && (
              <CyberInput
                label="Game Title"
                placeholder="e.g. Cyberpunk 2077"
                {...form.register("title")}
                error={form.formState.errors.title?.message}
              />
            )}
            {prefill && form.formState.errors.title?.message && (
              <p className="text-xs font-mono text-destructive -mt-3">{form.formState.errors.title.message}</p>
            )}

            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSelectedStatus(s.value)}
                    className={`px-3 py-2 rounded-md font-mono text-xs transition-all ${selectedStatus === s.value ? "bg-primary/30 border border-primary text-primary" : "bg-black/50 border border-border/50 text-muted-foreground hover:bg-primary/10 hover:text-foreground"}`}
                    data-testid={`status-option-${s.value}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Platform</label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`py-2 rounded-md font-mono text-xs transition-all ${selectedPlatforms.includes(p) ? "bg-secondary/30 border border-secondary text-secondary" : "bg-black/50 border border-border/50 text-muted-foreground hover:bg-secondary/10 hover:text-foreground"}`}
                    data-testid={`platform-option-${p}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 block">Vibe <span className="opacity-50">(optional)</span></label>
              <div className="grid grid-cols-3 gap-2">
                {VIBES.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setSelectedVibe(selectedVibe === v ? null : v)}
                    className={`px-2 py-2 rounded-md font-mono text-[10px] transition-all ${selectedVibe === v ? "bg-accent/30 border border-accent text-accent" : "bg-black/50 border border-border/50 text-muted-foreground hover:bg-accent/10 hover:text-foreground"}`}
                    data-testid={`vibe-option-${v}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <CyberButton type="submit" isLoading={isCreating} data-testid="button-save-game">
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
              You've reached the system limit (5 Active / 10 Backlog). Move games to the Vault to stay free, or upgrade to Pro for life.
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
              <CyberButton
                className="w-full py-8 text-xl font-black italic tracking-tighter bg-purple-600 hover:bg-purple-500 border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300 animate-pulse"
                onClick={() => setShowProModal(false)}
              >
                UPGRADE FOR $0.99
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
