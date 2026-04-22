import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type Estimate = { main: number; full: number; note: string };

export function useEstimate(title: string | undefined, enabled = true) {
  return useQuery<Estimate>({
    queryKey: ["/api/ai/hltb", title],
    enabled: !!title && enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/ai/hltb", { title });
      const data = await res.json();
      const main = Math.max(1, Math.round(Number(data.main ?? data.hours) || 0));
      let full = Math.max(1, Math.round(Number(data.full) || 0));
      if (!full || full < main) full = Math.round(main * 1.6);
      return { main, full, note: String(data.note || "HLTB-style estimate") };
    },
  });
}
