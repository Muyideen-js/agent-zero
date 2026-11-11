"use client";

import { motion } from "motion/react";

/** Quick, light page entrance: no blur, so navigation feels instant. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
