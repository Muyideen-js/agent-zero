"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { AgentRole } from "@/lib/types";
import { AgentGlyph, Amt, EASE, Mark, NearMark, cx } from "./ui";
import { Bank, Check, FileText, Gavel, Prohibit, Sparkle } from "./icons";

type Ev = { role: AgentRole; who: string; text: string; kind: "plan" | "doc" | "bid" | "pay" | "sale" | "block" | "fund"; amt?: number };

const script: Ev[] = [
  { role: "finance", who: "Treasury", text: "Funded by owner.testnet", kind: "fund", amt: 20 },
  { role: "ceo", who: "Atlas · CEO", text: "Published a 7-step operating plan", kind: "plan" },
  { role: "research", who: "Meridian · Research", text: "Delivered brief: 14 sources, 6 opportunities", kind: "doc" },
  { role: "research", who: "Meridian · Research", text: "Payout for T-101 cleared all 8 checks", kind: "pay", amt: -2.5 },
  { role: "product", who: "Forge · Product", text: "Exported a 24-page market report", kind: "doc" },
  { role: "sales", who: "Halcyon · Sales", text: "Won the launch listing bid at 1.80", kind: "bid" },
  { role: "sales", who: "Halcyon · Sales", text: "Tried to send itself 5.00 NEAR", kind: "block", amt: 5 },
  { role: "sales", who: "customer.testnet", text: "Purchased the Market Report", kind: "sale", amt: 7 },
];

const icon = { plan: Sparkle, doc: FileText, bid: Gavel, pay: Check, sale: Check, block: Prohibit, fund: Bank };
const roles: AgentRole[] = ["ceo", "research", "product", "sales", "finance"];

export function LiveConsole() {
  const [i, setI] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x >= script.length ? 1 : x + 1)), 2100);
    return () => clearInterval(id);
  }, []);
  const played = script.slice(0, i);
  const shown = [...played].reverse();
  const balance = played.reduce((s, e) => (e.amt && e.kind !== "block" ? s + e.amt : s), 0);
  const blocked = played.some((e) => e.kind === "block");
  const series = played.reduce<number[]>((a, e) => [...a, (a.at(-1) ?? 0) + (e.amt && e.kind !== "block" ? e.amt : 0)], [0]);
  const max = Math.max(...series, 1);
  const pts = series.map((v, k) => `${(k / Math.max(1, series.length - 1)) * 200},${46 - (v / max) * 40}`).join(" ");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line-strong bg-surface/90 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-md border border-line bg-raised px-3 py-1 text-[11px] text-faint">
          <Mark size={12} /> <span className="num">agentzero.app/insightforge</span>
        </div>
        <span className="hidden text-[10.5px] uppercase tracking-[0.14em] text-faint sm:inline">Preview</span>
      </div>

      <div className="grid md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-5 border-b border-line p-5 md:border-b-0 md:border-r">
          <div>
            <div className="flex items-center justify-between text-[11.5px] text-faint">
              <span>Treasury</span>
              <span className="flex items-center gap-1"><NearMark size={10} /> testnet</span>
            </div>
            <motion.div key={balance} initial={{ opacity: 0.3, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="mt-1 text-[34px] font-medium tracking-[-0.022em]">
              <Amt v={balance} />
            </motion.div>
            <svg viewBox="0 0 200 50" className="mt-2 h-12 w-full overflow-visible">
              <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" className="transition-all duration-500" />
              <motion.circle key={pts} cx={pts.split(" ").at(-1)!.split(",")[0]} cy={pts.split(" ").at(-1)!.split(",")[1]} r="3" fill="var(--accent)" initial={{ scale: 0 }} animate={{ scale: 1 }} />
            </svg>
          </div>
          <div className="space-y-2.5">
            {[
              ["Per-payment limit", 3],
              ["Agent spend cap", 10],
              ["Price floor", 5],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-[12px]">
                <span className="text-muted">{k}</span>
                <Amt v={v as number} />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            {roles.map((r) => (
              <AgentGlyph key={r} role={r} size={30} active={shown[0]?.role === r} />
            ))}
          </div>
          <AnimatePresence>
            {blocked && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 rounded-lg border border-danger/25 bg-danger-dim px-3 py-2 text-[11.5px] text-danger">
                <Prohibit size={13} weight="bold" /> 1 payment rejected by policy
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative h-[340px] overflow-hidden p-3">
          <ul className="space-y-1.5">
            <AnimatePresence initial={false}>
              {shown.map((e) => {
                const I = icon[e.kind];
                const bad = e.kind === "block";
                return (
                  <motion.li
                    key={e.text}
                    layout
                    initial={{ opacity: 0, y: -18, scale: 0.98, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: EASE }}
                    className={cx("flex items-center gap-3 rounded-xl border px-3 py-2.5", bad ? "border-danger/25 bg-danger-dim" : "border-line bg-raised/70")}
                  >
                    <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", bad ? "border-danger/30 text-danger" : e.kind === "sale" || e.kind === "pay" ? "border-accent/25 text-accent" : "border-line text-muted")}>
                      <I size={15} weight="bold" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] text-fg">{e.text}</div>
                      <div className="text-[11px] text-faint">{bad ? "Rejected: exceeds the 3 NEAR per-payment limit" : e.who}</div>
                    </div>
                    {e.amt !== undefined && (
                      <Amt v={Math.abs(e.amt)} sign={bad ? "" : e.amt > 0 ? "+" : "−"} className={cx("text-[12.5px]", bad ? "text-danger line-through" : e.amt > 0 ? "text-accent" : "text-fg")} />
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface to-transparent" />
        </div>
      </div>
    </div>
  );
}
