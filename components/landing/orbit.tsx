"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { AgentRole } from "@/lib/types";
import { AgentGlyph, Amt, EASE, cx } from "../ui";
import { Check, Prohibit, ShieldCheck, Users } from "../icons";

type Pt = { x: number; y: number };

const R = 38;
const at = (deg: number): Pt => ({ x: 50 + R * Math.cos((deg * Math.PI) / 180), y: 50 + R * Math.sin((deg * Math.PI) / 180) });

const agents: { role: AgentRole; name: string; pos: Pt }[] = [
  { role: "ceo", name: "Atlas", pos: at(-90) },
  { role: "research", name: "Meridian", pos: at(-18) },
  { role: "product", name: "Forge", pos: at(54) },
  { role: "sales", name: "Halcyon", pos: at(126) },
  { role: "finance", name: "Ledger", pos: at(198) },
];
const CENTER: Pt = { x: 50, y: 50 };
const CUSTOMER: Pt = { x: 50, y: 103 };

type Ev =
  | { kind: "pay"; to: number; amt: number; label: string }
  | { kind: "sale"; amt: number; label: string }
  | { kind: "block"; from: number; amt: number; label: string };

const events: Ev[] = [
  { kind: "pay", to: 1, amt: 2.5, label: "Payout to Meridian · T-101" },
  { kind: "pay", to: 2, amt: 3, label: "Payout to Forge · T-103" },
  { kind: "block", from: 3, amt: 5, label: "Halcyon tried to pay itself" },
  { kind: "sale", amt: 7, label: "Customer bought the report" },
  { kind: "pay", to: 3, amt: 1.8, label: "Payout to Halcyon · T-104" },
];

function Particle({ from, to, color, bounce }: { from: Pt; to: Pt; color: string; bounce?: boolean }) {
  const mid = { x: from.x + (to.x - from.x) * 0.72, y: from.y + (to.y - from.y) * 0.72 };
  return (
    <motion.span
      className="absolute z-20 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{ background: color, boxShadow: `0 0 18px 2px ${color}` }}
      initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 0, scale: 0.4 }}
      animate={
        bounce
          ? { left: [`${from.x}%`, `${mid.x}%`, `${from.x}%`], top: [`${from.y}%`, `${mid.y}%`, `${from.y}%`], opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.4] }
          : { left: `${to.x}%`, top: `${to.y}%`, opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.6] }
      }
      transition={{ duration: bounce ? 1.5 : 1.2, ease: [0.65, 0, 0.35, 1] }}
    />
  );
}

export function CompanyOrbit() {
  const [i, setI] = useState(0);
  const [balance, setBalance] = useState(20);
  useEffect(() => {
    const id = setInterval(() => setI((x) => x + 1), 2200);
    return () => clearInterval(id);
  }, []);
  const ev = events[i % events.length];

  useEffect(() => {
    const t = setTimeout(() => {
      if (ev.kind === "pay") setBalance((b) => (b - ev.amt < 4 ? 20 : b - ev.amt));
      if (ev.kind === "sale") setBalance((b) => b + ev.amt);
    }, 1100);
    return () => clearTimeout(t);
  }, [i, ev]);

  const blocked = ev.kind === "block";
  const activeAgent = ev.kind === "pay" ? ev.to : ev.kind === "block" ? ev.from : -1;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px] select-none">
      {/* rings + spokes */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,226,154,.16)" />
            <stop offset="100%" stopColor="rgba(0,226,154,0)" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="24" fill="url(#core)" />
        <g className="spin-slow" style={{ transformOrigin: "50px 50px" }}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth=".25" strokeDasharray="0.6 1.4" />
        </g>
        <circle cx="50" cy="50" r="49" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth=".25" />
        <circle cx="50" cy="50" r="15" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth=".25" />
        {agents.map((a, k) => (
          <line key={a.name} x1="50" y1="50" x2={a.pos.x} y2={a.pos.y} stroke={k === activeAgent ? (blocked ? "rgba(255,92,92,.5)" : "rgba(0,226,154,.45)") : "rgba(255,255,255,.07)"} strokeWidth=".3" style={{ transition: "stroke .5s" }} />
        ))}
        <line x1="50" y1="50" x2={CUSTOMER.x} y2={98} stroke={ev.kind === "sale" ? "rgba(0,226,154,.45)" : "rgba(255,255,255,.05)"} strokeWidth=".3" strokeDasharray="1 1" style={{ transition: "stroke .5s" }} />
      </svg>

      {/* treasury core */}
      <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          animate={blocked ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className={cx(
            "relative flex h-[112px] w-[112px] flex-col items-center justify-center rounded-[28px] border bg-surface/95 shadow-[0_20px_60px_-10px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur transition-colors duration-500",
            blocked ? "border-danger/40" : "border-accent/30",
          )}
        >
          <ShieldCheck size={22} weight="duotone" className={cx("transition-colors duration-500", blocked ? "text-danger" : "text-accent")} />
          <motion.div key={balance} initial={{ opacity: 0.4, y: -3 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 text-[15px] font-medium">
            <Amt v={balance} />
          </motion.div>
          <div className="mt-0.5 text-[9.5px] uppercase tracking-[0.14em] text-faint">Treasury</div>
          <span className={cx("absolute -inset-2 rounded-[34px] border transition-colors duration-500", blocked ? "border-danger/20" : "border-accent/10")} />
        </motion.div>
      </div>

      {/* agents */}
      {agents.map((a, k) => (
        <div key={a.name} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${a.pos.x}%`, top: `${a.pos.y}%` }}>
          <motion.div className="float flex flex-col items-center gap-1.5" style={{ animationDelay: `${k * -1.2}s` }}>
            <div className={cx("rounded-[12px] p-[3px] transition-colors duration-500", k === activeAgent ? (blocked ? "bg-danger/15" : "bg-accent/15") : "bg-transparent")}>
              <AgentGlyph role={a.role} size={46} active={k === activeAgent && !blocked} />
            </div>
            <span className={cx("rounded-full border bg-bg/80 px-2 py-0.5 text-[11px] backdrop-blur transition-colors duration-500", k === activeAgent ? "border-line-strong text-fg" : "border-line text-faint")}>{a.name}</span>
          </motion.div>
        </div>
      ))}

      {/* customer */}
      <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: "50%", top: "98%" }}>
        <span className={cx("flex items-center gap-1.5 rounded-full border bg-bg/90 px-2.5 py-1 text-[11px] backdrop-blur transition-colors duration-500", ev.kind === "sale" ? "border-accent/30 text-accent" : "border-line text-faint")}>
          <Users size={12} weight="duotone" /> Customers
        </span>
      </div>

      {/* particle for the current event */}
      <AnimatePresence>
        <motion.div key={i} className="pointer-events-none absolute inset-0" exit={{ opacity: 0 }}>
          {ev.kind === "pay" && <Particle from={CENTER} to={agents[ev.to].pos} color="var(--accent)" />}
          {ev.kind === "sale" && <Particle from={{ x: 50, y: 96 }} to={CENTER} color="var(--accent)" />}
          {ev.kind === "block" && <Particle from={agents[ev.from].pos} to={CENTER} color="var(--danger)" bounce />}
        </motion.div>
      </AnimatePresence>

      {/* event caption */}
      <div className="absolute -top-2 left-1/2 z-30 w-max -translate-x-1/2">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: EASE }}
            className={cx(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] shadow-[0_10px_30px_-10px_rgba(0,0,0,.8)] backdrop-blur",
              blocked ? "border-danger/30 bg-danger-dim text-danger" : "border-line-strong bg-surface/90 text-fg",
            )}
          >
            {blocked ? <Prohibit size={13} weight="bold" /> : <Check size={13} weight="bold" className="text-accent" />}
            {ev.label}
            <span className="text-faint">·</span>
            {blocked ? <span>Rejected, over 3 NEAR limit</span> : <Amt v={ev.amt} sign={ev.kind === "sale" ? "+" : "−"} className={ev.kind === "sale" ? "text-accent" : "text-muted"} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
