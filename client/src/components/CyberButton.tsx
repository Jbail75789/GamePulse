import { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface CyberButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "outline" | "ghost";
  isLoading?: boolean;
  children: ReactNode;
}

export function CyberButton({
  children,
  className,
  variant = "primary",
  isLoading = false,
  disabled,
  ...props
}: CyberButtonProps) {
  const baseStyles = "relative px-6 py-3 font-display uppercase tracking-wider font-bold text-sm transition-all duration-200 clip-path-slant group overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/80 hover:shadow-[0_0_20px_rgba(0,255,159,0.4)] border-none focus:ring-primary",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-[0_0_20px_rgba(0,184,255,0.4)] border-none focus:ring-secondary",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80 border-none focus:ring-destructive",
    outline: "bg-transparent border-2 border-primary text-primary hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(0,255,159,0.2)] focus:ring-primary",
    ghost: "bg-transparent hover:bg-white/5 text-foreground border border-transparent hover:border-white/10",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Glitch overlay effect on hover for primary/secondary */}
      {(variant === "primary" || variant === "secondary") && (
        <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite] skew-x-12" />
      )}
      
      <div className="flex items-center justify-center gap-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </div>

      {/* Decorative corners */}
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-current opacity-50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current opacity-50" />
    </button>
  );
}
