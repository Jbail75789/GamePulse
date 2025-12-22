import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertGame } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useGames() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const gamesQuery = useQuery({
    queryKey: [api.games.list.path],
    queryFn: async () => {
      const res = await fetch(api.games.list.path);
      if (!res.ok) throw new Error("Failed to fetch games");
      return api.games.list.responses[200].parse(await res.json());
    },
  });

  const createGameMutation = useMutation({
    mutationFn: async (game: InsertGame) => {
      const res = await fetch(api.games.create.path, {
        method: api.games.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(game),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create game");
      }
      return api.games.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.list.path] });
      toast({
        title: "Database Updated",
        description: "Game entry added successfully.",
        className: "border-primary text-primary font-mono",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateGameMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertGame>) => {
      const url = buildUrl(api.games.update.path, { id });
      const res = await fetch(url, {
        method: api.games.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) throw new Error("Failed to update game");
      return api.games.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.list.path] });
      toast({
        title: "Sync Complete",
        description: "Game status updated.",
        className: "border-secondary text-secondary font-mono",
      });
    },
  });

  const deleteGameMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.games.delete.path, { id });
      const res = await fetch(url, { method: api.games.delete.method });
      if (!res.ok) throw new Error("Failed to delete game");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.games.list.path] });
      toast({
        title: "Entry Purged",
        description: "Game removed from database.",
        className: "border-destructive text-destructive font-mono",
      });
    },
  });

  return {
    games: gamesQuery.data,
    isLoading: gamesQuery.isLoading,
    createGame: createGameMutation.mutate,
    isCreating: createGameMutation.isPending,
    updateGame: updateGameMutation.mutate,
    isUpdating: updateGameMutation.isPending,
    deleteGame: deleteGameMutation.mutate,
    isDeleting: deleteGameMutation.isPending,
  };
}
