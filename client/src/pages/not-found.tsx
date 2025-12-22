import { Link } from "wouter";
import { CyberButton } from "@/components/CyberButton";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground font-body">
      <div className="max-w-md text-center space-y-6 p-8 border border-destructive/30 bg-destructive/5 rounded-lg relative overflow-hidden">
        {/* Scanning line effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-destructive/10 to-transparent translate-y-[-100%] animate-[scan_2s_infinite]" />
        
        <AlertTriangle className="w-16 h-16 text-destructive mx-auto animate-pulse" />
        
        <h1 className="text-6xl font-display font-black text-destructive tracking-widest glitch-hover">
          404
        </h1>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold font-mono uppercase">System Error</h2>
          <p className="text-muted-foreground font-mono text-sm">
            The requested sector coordinates do not exist in the mainframe.
          </p>
        </div>

        <Link href="/">
          <CyberButton variant="destructive" className="mt-4">
            Return to Base
          </CyberButton>
        </Link>
      </div>
    </div>
  );
}
