import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { CyberButton } from "@/components/CyberButton";
import { motion } from "framer-motion";
import { Cpu, Trophy, Zap, Gamepad2 } from "lucide-react";

export default function Landing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (user) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative font-body">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,theme(colors.background)),url('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&h=1080&fit=crop')] bg-cover bg-center opacity-20 pointer-events-none" />
      {/* cyberpunk city neon background */}
      
      <div className="container mx-auto px-4 h-screen flex flex-col justify-center relative z-10">
        <nav className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-primary" />
            <span className="text-2xl font-display font-bold tracking-tighter">GAME<span className="text-primary text-shadow-neon">PULSE</span></span>
          </div>
          <Link href="/auth">
            <CyberButton variant="outline" className="hidden sm:flex">System Login</CyberButton>
          </Link>
        </nav>

        <div className="max-w-4xl mx-auto text-center space-y-8 mt-[-10vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-9xl font-display font-black leading-tight tracking-tighter mb-4">
              SYNC YOUR <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent animate-gradient-x">GAMING PROGRESS</span>
            </h1>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-mono"
          >
            The ultimate tracking system for the modern gamer. Manage your backlog, track progress, and vault your victories in high-fidelity.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
          >
            <Link href="/auth?mode=register">
              <CyberButton variant="primary" className="text-lg px-12 py-6 h-auto">
                Initialize System
              </CyberButton>
            </Link>
            <Link href="/auth">
              <CyberButton variant="ghost" className="text-lg px-8 py-6 h-auto">
                Existing User
              </CyberButton>
            </Link>
          </motion.div>
        </div>

        {/* Feature Grid */}
        <div className="absolute bottom-12 left-0 right-0 hidden lg:block">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-3 gap-8 text-center">
              <Feature icon={<Zap className="w-8 h-8 text-primary" />} title="Live Pulse" desc="Track active sessions in real-time" />
              <Feature icon={<Trophy className="w-8 h-8 text-secondary" />} title="The Vault" desc="Archive your completed conquests" />
              <Feature icon={<Cpu className="w-8 h-8 text-accent" />} title="Backlog Core" desc="Manage your future playlist" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-black/40 border border-white/5 backdrop-blur-sm hover:border-primary/50 transition-colors group">
      <div className="mb-2 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="font-display font-bold text-lg uppercase tracking-wider">{title}</h3>
      <p className="text-sm text-muted-foreground font-mono">{desc}</p>
    </div>
  );
}
