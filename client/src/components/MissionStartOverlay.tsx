import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

const PHASES = [
  "SCANNING BACKLOG...",
  "CALIBRATING VIBE CHECKS...",
  "PULSE STABILIZED.",
];

const SESSION_KEY = "gp_mission_started";

export function MissionStartOverlay() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(true);
    const t1 = setTimeout(() => setPhase(1), 700);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => setVisible(false), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
          data-testid="mission-start-overlay"
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,255,159,0.08) 3px, transparent 4px)",
            }}
          />
          <div className="relative flex flex-col items-center gap-4">
            <Zap className="w-10 h-10 text-primary animate-pulse" />
            <div className="font-display uppercase tracking-[0.4em] text-primary text-lg">
              GamePulse System
            </div>
            <div className="space-y-1 font-mono text-xs uppercase tracking-widest text-primary/80 text-left min-w-[260px]">
              {PHASES.slice(0, phase + 1).map((p, i) => (
                <div
                  key={p}
                  className="flex items-center gap-2"
                  data-testid={`phase-${i}`}
                >
                  <span className="text-primary">[OK]</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
