import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { CyberCard } from "@/components/CyberCard";
import { CyberButton } from "@/components/CyberButton";
import { useGames } from "@/hooks/use-games";
import { User, Mail, Hash, Gamepad2, Timer, Trophy } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { games } = useGames();

  // Calculate stats
  const totalGames = games?.length || 0;
  const completedGames = games?.filter(g => g.status === 'completed').length || 0;
  const totalPlaytime = games?.reduce((acc, curr) => acc + (curr.playtime || 0), 0) || 0;

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-display font-bold uppercase tracking-wider mb-8 border-b border-primary/30 pb-4 inline-block">
          Operative Profile
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* User Info Card */}
          <div className="md:col-span-2">
            <CyberCard glowColor="primary" className="h-full">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-primary via-secondary to-accent rounded-sm flex items-center justify-center text-4xl font-display font-bold text-background shadow-[0_0_30px_rgba(0,255,159,0.3)]">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                
                <div className="space-y-4 flex-1">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white">{user.username}</h2>
                    <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-sm border border-primary/20">
                      LEVEL {Math.floor(totalPlaytime / 10) + 1} OPERATIVE
                    </span>
                  </div>

                  <div className="space-y-2 font-mono text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <Hash className="w-4 h-4" />
                      <span>ID: {user.id.toString().padStart(8, '0')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4" />
                      <span>STATUS: ONLINE</span>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                     <CyberButton variant="outline" className="w-full sm:w-auto opacity-50 cursor-not-allowed" title="System Offline">
                       Connect Steam Account
                     </CyberButton>
                     <p className="text-[10px] text-muted-foreground mt-2 font-mono">* External link module currently offline for maintenance.</p>
                  </div>
                </div>
              </div>
            </CyberCard>
          </div>

          {/* Stats Column */}
          <div className="space-y-6">
            <StatCard 
              label="Total Games" 
              value={totalGames} 
              icon={<Gamepad2 className="w-5 h-5 text-primary" />}
              borderColor="border-primary/30" 
            />
            <StatCard 
              label="Completed" 
              value={completedGames} 
              icon={<Trophy className="w-5 h-5 text-secondary" />}
              borderColor="border-secondary/30" 
            />
            <StatCard 
              label="Total Playtime" 
              value={`${totalPlaytime}h`} 
              icon={<Timer className="w-5 h-5 text-accent" />}
              borderColor="border-accent/30" 
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, icon, borderColor }: { label: string, value: string | number, icon: any, borderColor: string }) {
  return (
    <div className={`bg-card border ${borderColor} p-4 relative overflow-hidden group`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-display font-bold text-foreground">{value}</div>
    </div>
  );
}
