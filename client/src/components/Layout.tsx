import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { CyberButton } from "./CyberButton";
import { User, LogOut, Gamepad2, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Grid Background Overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />
      
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group flex-shrink-0">
              <Gamepad2 className="w-8 h-8 text-primary group-hover:animate-pulse" />
              <span className="text-[1.25rem] md:text-[1.5rem] font-display font-bold tracking-tighter text-foreground whitespace-nowrap">
                GAME<span className="text-primary text-shadow-neon">PULSE</span>
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-3 md:gap-6 min-w-0">
            {user ? (
              <>
                <Link href="/dashboard" className={`hidden sm:inline-block text-[0.875rem] font-display font-bold uppercase tracking-wider hover:text-primary transition-colors whitespace-nowrap ${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
                  Dashboard
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-sm hover:bg-white/5 transition-colors focus:outline-none min-w-0">
                      <span className="hidden md:inline-block text-[0.875rem] font-mono text-muted-foreground truncate max-w-[150px]">
                        {user.username}
                      </span>
                      <div className="w-8 h-8 bg-gradient-to-tr from-primary to-secondary rounded-sm flex items-center justify-center text-background font-bold font-mono flex-shrink-0">
                        {user.username.slice(0, 2).toUpperCase()}
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                    <DropdownMenuLabel className="font-display">My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    <Link href="/profile">
                      <DropdownMenuItem className="cursor-pointer font-mono hover:bg-primary/20 hover:text-primary">
                        <User className="w-5 h-5 mr-2" />
                        Profile
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/dashboard">
                      <DropdownMenuItem className="cursor-pointer font-mono hover:bg-primary/20 hover:text-primary">
                        <LayoutDashboard className="w-5 h-5 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem 
                      className="cursor-pointer text-destructive font-mono hover:bg-destructive/10"
                      onClick={() => logout()}
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex gap-4">
                <Link href="/auth">
                  <CyberButton variant="ghost" className="hidden sm:inline-flex">Login</CyberButton>
                </Link>
                <Link href="/auth?mode=register">
                  <CyberButton variant="primary">Get Started</CyberButton>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 relative z-10 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-border/40 py-8 bg-background/50 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground font-mono text-sm">
            © 2024 GAME PULSE SYSTEM. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
