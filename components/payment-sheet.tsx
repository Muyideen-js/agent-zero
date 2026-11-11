"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Close as X, ShieldCheck, ShieldWarning as ShieldAlert, Spinner as Loader2 } from "./icons";
import type { Check as PaymentCheck } from "@/lib/near/client";
import { Amt, Button, EASE, cx } from "./ui";

export interface SheetState {
  title: string;
  amount: number;
  recipient: string;
  checks: PaymentCheck[];
  ok: boolean;
  /** Set when the verdict came from a real contract call. */
  txUrl?: string;
}

/** Plays the contract's validation sequence rule by rule, stopping at the first failure. */
export function PaymentSheet({ state, onClose }: { state: SheetState | null; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const failAt = state ? state.checks.findIndex((c) => !c.passed) : -1;
  const stopAt = failAt === -1 ? (state?.checks.length ?? 0) : failAt + 1;
  const done = step >= stopAt;

  useEffect(() => {
    if (!state) return;
    setStep(0);
    const id = setInterval(() => setStep((s) => s + 1), 280);
    return () => clearInterval(id);
  }, [state]);

  return (
    <AnimatePresence>
      {state && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
          <motion.div
            className="pointer-events-auto w-full max-w-lg"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <div className="overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-black/70">
              <div className="flex items-start justify-between border-b border-line p-5">
                <div>
                  <div className="text-[12px] uppercase tracking-[0.12em] text-faint">Payment request</div>
                  <div className="mt-1 text-[16px] font-medium">{state.title}</div>
                  <div className="num mt-1 text-[12.5px] text-muted">
                    <Amt v={state.amount} /> <span className="text-faint">→</span> {state.recipient}
                  </div>
                </div>
                <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-fg" aria-label="Close">
                  <X size={16} />
                </button>
              </div>

              <ul className="space-y-1 p-3">
                {state.checks.map((c, i) => {
                  const shown = i < Math.min(step, stopAt);
                  const running = i === step && !done;
                  const skipped = failAt !== -1 && i > failAt;
                  return (
                    <li
                      key={c.rule}
                      className={cx(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-300",
                        skipped && done && "opacity-30",
                        shown && !c.passed && "bg-danger-dim",
                      )}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {running ? (
                          <Loader2 size={14} className="animate-spin text-muted" />
                        ) : shown ? (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 20 }}>
                            {c.passed ? <Check size={15} className="text-accent" /> : <X size={15} className="text-danger" />}
                          </motion.span>
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-faint/50" />
                        )}
                      </span>
                      <span className={cx("flex-1", shown ? "text-fg" : "text-faint")}>{c.rule}</span>
                      <span className={cx("num text-[12px]", shown && !c.passed ? "text-danger" : "text-faint")}>{shown ? c.detail : ""}</span>
                    </li>
                  );
                })}
              </ul>

              <AnimatePresence>
                {done && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.4, ease: EASE }}>
                    <div className={cx("mx-3 mb-3 flex items-start gap-3 rounded-xl border p-4", state.ok ? "border-accent/20 bg-accent-dim" : "border-danger/25 bg-danger-dim")}>
                      {state.ok ? <ShieldCheck size={18} className="mt-0.5 text-accent" /> : <ShieldAlert size={18} className="mt-0.5 text-danger" />}
                      <div className="text-[13px] leading-relaxed">
                        <div className={cx("font-medium", state.ok ? "text-accent" : "text-danger")}>
                          {state.ok ? (state.txUrl ? "Paid on-chain" : "Precheck passed") : state.txUrl ? "Rejected by the contract" : "Payment rejected"}
                        </div>
                        <div className="text-fg/80">
                          {state.ok
                            ? state.txUrl
                              ? "The treasury contract ran every check and transferred the funds to the agent."
                              : "Queued for execution by the treasury contract. It will show as on-chain once the transaction hash is verified."
                            : `Reason: ${state.checks[failAt]?.detail && state.txUrl ? state.checks[failAt].detail : state.checks[failAt]?.rule}. Funds did not move.`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-line p-3">
                      {state.txUrl ? (
                        <a href={state.txUrl} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-fg">
                          View transaction on NearBlocks <ArrowUpRight size={12} />
                        </a>
                      ) : (
                        <span />
                      )}
                      <Button size="sm" onClick={onClose}>Done</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
