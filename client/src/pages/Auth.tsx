import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { CyberInput } from "@/components/CyberInput";
import { CyberButton } from "@/components/CyberButton";
import { CyberCard } from "@/components/CyberCard";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const { login, register, isLoggingIn, isRegistering, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [adminCode, setAdminCode] = useState<string | null>(null);

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

  const handleGenerateCode = async () => {
    try {
      const res = await apiRequest("POST", "/api/admin/generate-code");
      const data = await res.json();
      setAdminCode(data.code);
      toast({ title: "Access Code Generated", description: data.code });
    } catch (e) {
      toast({ title: "Unauthorized", variant: "destructive" });
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    form.reset();
  };

  const isAdmin = user?.email === "admin@gamepulse.system";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Cyber Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      
      <div className="w-full max-w-md relative z-10">
        {isAdmin && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-md backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-primary font-display text-sm uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" /> Admin Mainframe
              </div>
              <CyberButton onClick={handleGenerateCode} className="text-[10px] h-8">
                Generate Access Key
              </CyberButton>
            </div>
            {adminCode && (
              <div className="p-3 bg-black/40 border border-primary/30 rounded-sm text-center">
                <div className="text-[10px] text-muted-foreground uppercase mb-1 font-mono">Active Deployment Key</div>
                <div className="text-2xl font-display text-white tracking-[0.3em]">{adminCode}</div>
              </div>
            )}
          </motion.div>
        )}

        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }}
            className="inline-flex p-4 rounded-full bg-primary/10 mb-4 border border-primary/20"
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
            />
            
            <CyberInput
              type="password"
              label="Password"
              placeholder="••••••••"
              {...form.register("password")}
              error={form.formState.errors.password?.message}
            />

            <CyberButton 
              type="submit" 
              className="w-full" 
              isLoading={isLoggingIn || isRegistering}
              variant="primary"
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
            >
              {mode === "login" ? "Initialize New User" : "Access Existing Account"}
            </button>
          </div>
        </CyberCard>
      </div>
    </div>
  );
}
