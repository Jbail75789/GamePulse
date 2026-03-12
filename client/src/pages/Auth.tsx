import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { CyberInput } from "@/components/CyberInput";
import { CyberButton } from "@/components/CyberButton";
import { CyberCard } from "@/components/CyberCard";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, ShieldCheck, Copy, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ADMIN_SECRET = "GAMEPULSE_ADMIN_2025";

export default function Auth() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const { login, register, isLoggingIn, isRegistering, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [adminVisible, setAdminVisible] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState(false);
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (data: InsertUser) => {
    if (mode === "login") {
      login(data);
    } else {
      register(data);
    }
  };

  const handleLogoClick = () => {
    logoClickCount.current += 1;
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
    logoClickTimer.current = setTimeout(() => {
      logoClickCount.current = 0;
    }, 2000);
    if (logoClickCount.current >= 5) {
      logoClickCount.current = 0;
      setAdminVisible(true);
    }
  };

  const handleAdminUnlock = () => {
    if (adminPassword === ADMIN_SECRET) {
      setAdminUnlocked(true);
      setAdminPasswordError(false);
      setAdminPassword("");
    } else {
      setAdminPasswordError(true);
    }
  };

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/admin/generate-code", {
        adminSecret: ADMIN_SECRET,
      });
      const data = await res.json();
      setAdminCode(data.code);
    } catch {
      toast({ title: "Failed to generate code", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!adminCode) return;
    navigator.clipboard.writeText(adminCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    form.reset();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />

      <div className="w-full max-w-md relative z-10">

        <AnimatePresence>
          {adminVisible && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-md backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 text-primary font-display text-sm uppercase tracking-wider mb-4">
                <ShieldCheck className="w-4 h-4" /> Admin Mainframe
              </div>

              {!adminUnlocked ? (
                <div className="space-y-3">
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={e => {
                      setAdminPassword(e.target.value);
                      setAdminPasswordError(false);
                    }}
                    onKeyDown={e => e.key === "Enter" && handleAdminUnlock()}
                    placeholder="Enter admin password"
                    className={`w-full bg-black/40 border rounded-sm px-3 py-2 text-sm font-mono text-white placeholder-gray-600 outline-none focus:ring-1 ${
                      adminPasswordError
                        ? "border-red-500 focus:ring-red-500"
                        : "border-primary/30 focus:ring-primary/50"
                    }`}
                    data-testid="input-admin-password"
                  />
                  {adminPasswordError && (
                    <p className="text-red-400 text-xs font-mono">Access denied.</p>
                  )}
                  <CyberButton onClick={handleAdminUnlock} className="w-full text-xs h-8">
                    Authenticate
                  </CyberButton>
                </div>
              ) : (
                <div className="space-y-3">
                  <CyberButton
                    onClick={handleGenerateCode}
                    isLoading={isGenerating}
                    className="w-full text-xs h-8"
                    data-testid="button-generate-access-key"
                  >
                    Generate Access Key
                  </CyberButton>

                  {adminCode && (
                    <div
                      className="p-3 bg-black/40 border border-primary/30 rounded-sm flex items-center justify-between gap-3 cursor-pointer group"
                      onClick={handleCopyCode}
                      data-testid="display-admin-code"
                    >
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase mb-1 font-mono">
                          Active Deployment Key
                        </div>
                        <div className="text-xl font-display text-white tracking-[0.3em]">
                          {adminCode}
                        </div>
                      </div>
                      <div className="text-primary/60 group-hover:text-primary transition-colors">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex p-4 rounded-full bg-primary/10 mb-4 border border-primary/20 cursor-pointer select-none"
            onClick={handleLogoClick}
            title=""
            data-testid="logo-gamepulse"
          >
            <Gamepad2 className="w-12 h-12 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-display font-bold tracking-tighter mb-2">
            SYSTEM <span className="text-primary">{mode === "login" ? "ACCESS" : "INITIALIZATION"}</span>
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            {mode === "login" ? "Enter credentials to access the mainframe." : "Create a new identity token."}
          </p>
        </div>

        <CyberCard glowColor="primary" className="backdrop-blur-xl bg-card/90">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CyberInput
              label="Username"
              placeholder="NeonRunner2077"
              {...form.register("username")}
              error={form.formState.errors.username?.message}
              data-testid="input-username"
            />

            <CyberInput
              type="password"
              label="Password"
              placeholder="••••••••"
              {...form.register("password")}
              error={form.formState.errors.password?.message}
              data-testid="input-password"
            />

            <CyberButton
              type="submit"
              className="w-full"
              isLoading={isLoggingIn || isRegistering}
              variant="primary"
              data-testid="button-submit-auth"
            >
              {mode === "login" ? "Connect" : "Register Identity"}
            </CyberButton>
          </form>

          <div className="mt-6 text-center space-y-4">
            <div className="h-px w-full bg-border relative">
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground font-mono">
                OR
              </span>
            </div>

            <button
              onClick={toggleMode}
              className="text-sm text-primary hover:text-primary/80 hover:underline font-mono uppercase tracking-wide transition-all"
              data-testid="button-toggle-mode"
            >
              {mode === "login" ? "Initialize New User" : "Access Existing Account"}
            </button>
          </div>
        </CyberCard>
      </div>
    </div>
  );
}
