import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CyberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const CyberInput = forwardRef<HTMLInputElement, CyberInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-display font-bold ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          <input
            ref={ref}
            className={cn(
              "flex h-12 w-full bg-black/40 border-2 border-input px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_10px_rgba(0,255,159,0.2)] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 font-mono clip-path-slant-left",
              error && "border-destructive focus-visible:border-destructive focus-visible:shadow-[0_0_10px_rgba(255,0,0,0.2)]",
              className
            )}
            {...props}
          />
          {/* Decorative element */}
          <div className="absolute bottom-0 right-0 w-4 h-[2px] bg-primary/50 group-hover:w-full transition-all duration-300 pointer-events-none" />
        </div>
        {error && (
          <p className="text-xs text-destructive font-mono mt-1 animate-pulse">
            [ERROR]: {error}
          </p>
        )}
      </div>
    );
  }
);
CyberInput.displayName = "CyberInput";
