import { AnimatePresence, motion } from "framer-motion";

interface AiProcessingBarProps {
  active: boolean;
  label?: string;
}

export function AiProcessingBar({ active, label = "AI Processing..." }: AiProcessingBarProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="fixed top-0 inset-x-0 z-[150] pointer-events-none"
          data-testid="ai-processing-bar"
        >
          <div className="h-[3px] w-full bg-black/60 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent animate-[aiSweep_1.2s_linear_infinite]" />
          </div>
          <div className="container mx-auto px-4 mt-1 flex items-center gap-2">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary"
              style={{ textShadow: "0 0 6px rgba(0,255,159,0.7)" }}
            >
              {label}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
