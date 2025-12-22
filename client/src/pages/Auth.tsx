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
import { Gamepad2 } from "lucide-react";

export default function Auth() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const { login, register, isLoggingIn, isRegistering, user } = useAuth();
  const [, setLocation] = useLocation();

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

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    form.reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Cyber Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      
      <div className="w-full max-w-md relative z-10">
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
