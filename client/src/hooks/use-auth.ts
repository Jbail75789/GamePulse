import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertUser } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const userQuery = useQuery({
    queryKey: [api.auth.user.path],
    queryFn: async () => {
      const res = await fetch(api.auth.user.path);
      if (res.status === 401 || res.status === 403) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.auth.user.responses[200].parse(await res.json());
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid username or password");
        const error = await res.json();
        throw new Error(error.message || "Login failed");
      }
      
      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.user.path], user);
      toast({
        title: "System Access Granted",
        description: `Welcome back, ${user.username}.`,
        className: "border-primary text-primary font-mono",
      });
      // Sync isPro state if needed
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Access Denied",
        description: error.message,
        variant: "destructive",
        className: "font-mono",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }

      return api.auth.register.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      // Auto login after register not strictly required but good UX, 
      // however, standard pattern is to require login or handle session on backend.
      // For this flow, let's assume we redirect to login or auto-log them in if backend sets cookie.
      // We'll just invalidate user to be safe.
      queryClient.invalidateQueries({ queryKey: [api.auth.user.path] });
      toast({
        title: "Identity Created",
        description: "Welcome to the network.",
        className: "border-primary text-primary font-mono",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Error",
        description: error.message,
        variant: "destructive",
        className: "font-mono",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
      });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.user.path], null);
      toast({
        title: "Disconnected",
        description: "Session terminated.",
        className: "font-mono",
      });
      window.location.href = "/";
    },
  });

  return {
    user: userQuery.data,
    isLoading: userQuery.isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutate,
  };
}
