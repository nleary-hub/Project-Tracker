"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Re-mounts on every navigation inside the workspace, so page content eases
 * in rather than snapping. Skipped when the OS asks for reduced motion.
 */
export default function WorkspaceTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
      className="flex min-h-full flex-col"
    >
      {children}
    </motion.div>
  );
}
