import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CyberCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  glowColor?: "primary" | "secondary" | "accent" | "none";
}

export function CyberCard({ 
  children, 
  className, 
  title, 
  subtitle,
  glowColor = "none" 
}: CyberCardProps) {
  const glows = {
    primary: "hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,255,159,0.15)]",
    secondary: "hover:border-secondary/50 hover:shadow-[0_0_30px_rgba(0,184,255,0.15)]",
    accent: "hover:border-accent/50 hover:shadow-[0_0_30px_rgba(214,0,255,0.15)]",
    none: "",
  };

  return (
    <div className={cn(
      "relative bg-card border border-border/50 p-3 sm:p-4 md:p-6 overflow-hidden transition-all duration-300 group",
      glows[glowColor],
      className
    )}>
      {/* Card Header Background Mesh */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {(title || subtitle) && (
        <div className="mb-6 relative z-10">
          {title && <h3 className="text-xl font-display font-bold uppercase tracking-wide text-foreground">{title}</h3>}
          {subtitle && <p className="text-sm font-mono text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      )}
      
      <div className="relative z-10">
        {children}
      </div>

      {/* Cyberpunk decoration lines */}
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/10 group-hover:border-primary/30 transition-colors" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/10 group-hover:border-primary/30 transition-colors" />
      
      {/* Background scanline effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,20,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
    </div>
  );
}
