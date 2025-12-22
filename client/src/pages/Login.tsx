import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else {
        setLocation("/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-foreground text-sm font-mono mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-border text-foreground rounded-md focus:outline-none focus:border-primary"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-foreground text-sm font-mono mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-black/50 border border-border text-foreground rounded-md focus:outline-none focus:border-primary"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="text-destructive text-sm font-mono">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-primary text-background font-mono font-bold rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
