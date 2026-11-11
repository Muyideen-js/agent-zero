"use client";

import { motion } from "motion/react";
import { Button, EASE, Mark } from "@/components/ui";
import { ArrowRight } from "@/components/icons";

/** Branded 404 for unknown routes. */
export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-6">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <motion.div className="relative max-w-md text-center" initial={{ opacity: 0, y: 16, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, ease: EASE }}>
        <div className="float mx-auto mb-8 w-fit">
          <Mark size={52} />
        </div>
        <div className="num text-[13px] tracking-[0.2em] text-faint">ERROR 404</div>
        <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.02em]">This page isn&apos;t on the ledger.</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-muted">The address you followed doesn&apos;t exist. Every real page is one click away.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button href="/" variant="primary" size="lg">
            Back to home <ArrowRight size={14} weight="bold" />
          </Button>
          <Button href="/dashboard" size="lg">Open the app</Button>
        </div>
      </motion.div>
    </div>
  );
}
