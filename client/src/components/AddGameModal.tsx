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
import { Plus } from "lucide-react";
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
  const { createGame, isCreating } = useGames();
  
  const form = useForm<InsertGame>({
    resolver: zodResolver(insertGameSchema),
    defaultValues: {
      title: "",
      coverUrl: "",
      platform: "PC",
      status: "backlog",
      playtime: 0,
    },
  });

  const onSubmit = (data: InsertGame) => {
    createGame(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <CyberButton className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Game
        </CyberButton>
      </DialogTrigger>
      <DialogContent className="bg-card border-border font-body sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary">New Database Entry</DialogTitle>
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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-display font-bold ml-1">Platform</label>
              <Select 
                onValueChange={(val) => form.setValue("platform", val)} 
                defaultValue={form.getValues("platform") || "PC"}
              >
                <SelectTrigger className="bg-black/40 border-input font-mono rounded-none h-12">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {["PC", "PlayStation", "Xbox", "Switch", "Other"].map(p => (
                    <SelectItem key={p} value={p} className="font-mono focus:bg-primary/20 focus:text-primary cursor-pointer">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          <CyberInput
            type="number"
            label="Playtime (Hours)"
            {...form.register("playtime", { valueAsNumber: true })}
            error={form.formState.errors.playtime?.message}
          />

          <div className="flex justify-end pt-4">
            <CyberButton type="submit" isLoading={isCreating}>
              Save to Database
            </CyberButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
