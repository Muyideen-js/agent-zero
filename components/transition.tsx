"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { create } from "zustand";
import { Mark } from "./brand";

const APP = ["/dashboard", "/agents", "/tasks", "/products", "/treasury"];
const zone = (p: string) => (APP.some((a) => p.startsWith(a)) ? "app" : p.split("?")[0]);

type Phase = "idle" | "cover" | "reveal";
const useCurtain = create<{ phase: Phase; target: string | null; set: (p: Phase, t?: string | null) => void }>((set) => ({
  phase: "idle",
  target: null,
  set: (phase, target = null) => set({ phase, target }),
}));

/**
 * Navigate with a full-screen curtain when moving between zones
 * (landing, launch, app). Inside the app, falls back to a plain push.
 */
export function useGo() {
  const router = useRouter();
  const path = usePathname();
  const set = useCurtain((s) => s.set);
  return useCallback(
    (href: string) => {
      if (zone(href) === zone(path) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(href);
        return;
      }
      router.prefetch(href);
      set("cover", href);
    },
    [path, router, set],
  );
}

const EASE = [0.76, 0, 0.24, 1] as const;

export function Curtain() {
  const { phase, target, set } = useCurtain();
  const router = useRouter();
  const path = usePathname();

  // Once the new route is mounted, lift the curtain.
  useEffect(() => {
    if (phase === "cover" && target && zone(path) === zone(target)) {
      const t = setTimeout(() => set("reveal"), 120);
      return () => clearTimeout(t);
    }
  }, [path, phase, target, set]);

  return (
    <AnimatePresence>
      {phase !== "idle" && (
        <motion.div
          key="curtain"
          className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center bg-[#0b0c0f]"
          initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
          animate={phase === "cover" ? { clipPath: "inset(0% 0% 0% 0%)" } : { clipPath: "inset(0% 0% 100% 0%)" }}
          transition={{ duration: 0.7, ease: EASE }}
          onAnimationComplete={() => {
            if (phase === "cover" && target) router.push(target);
            if (phase === "reveal") set("idle");
          }}
        >
          <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
          <motion.div
            initial={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
            animate={phase === "cover" ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 1.08, filter: "blur(6px)" }}
            transition={{ duration: 0.5, delay: phase === "cover" ? 0.25 : 0, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <Mark size={44} />
            <div className="h-px w-24 overflow-hidden bg-white/10">
              <motion.div className="h-full bg-accent" initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
