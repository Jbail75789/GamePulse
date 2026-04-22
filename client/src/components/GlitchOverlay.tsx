import { AnimatePresence, motion } from "framer-motion";

interface GlitchOverlayProps {
  trigger: number;
}

// Edge-only glitch flash — fires for ~500ms whenever `trigger` increments
// (e.g. on game status transitions). Stays out of card content.
export function GlitchOverlay({ trigger }: GlitchOverlayProps) {
  return (
    <AnimatePresence>
      {trigger > 0 && (
        <motion.div
          key={trigger}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 pointer-events-none z-[120]"
          data-testid="glitch-overlay"
        >
          <div className="absolute inset-0 animate-[glitchFlash_0.5s_steps(8)_1] mix-blend-screen" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
