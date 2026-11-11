"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AgentRole } from "@/lib/types";
import { AgentGlyph, Amt, EASE, Mark, Reveal, cx } from "../ui";
import { Bank, Check, Target, Wallet } from "../icons";

/* ───────────────────────── Step visuals ───────────────────────── */

function Panel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_40px_100px_-30px_rgba(0,0,0,.9),inset_0_1px_0_rgba(255,255,255,.05)]">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-faint">
        <span>{label}</span>
        <Mark size={14} />
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Typewriter({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x >= text.length ? x : x + 2)), 22);
    return () => clearInterval(id);
  }, [text]);
  return (
    <span>
      {text.slice(0, n)}
      <span className="ml-px inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-pulse bg-accent" />
    </span>
  );
}

function VMission() {
  return (
    <Panel label="New company">
      <div className="text-[11.5px] text-faint">Company name</div>
      <div className="mt-1 rounded-lg border border-line-strong bg-raised px-3 py-2 text-[14px]">InsightForge AI</div>
      <div className="mt-4 text-[11.5px] text-faint">Mission</div>
      <div className="mt-1 min-h-[96px] rounded-lg border border-white/20 bg-raised px-3 py-2.5 text-[13.5px] leading-relaxed text-fg/90 shadow-[0_0_0_4px_rgba(255,255,255,0.03)]">
        <Typewriter text="Research an emerging market and produce a professional market intelligence report that customers will pay for." />
      </div>
      <div className="mt-4 flex gap-2">
        {["Research", "Report", "Sell"].map((t, i) => (
          <motion.span key={t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 + i * 0.12 }} className="flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 text-[12px] text-muted">
            <Target size={12} /> {t}
          </motion.span>
        ))}
      </div>
    </Panel>
  );
}

function VFund() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setV(20), 900);
    return () => clearTimeout(t);
  }, []);
  return (
    <Panel label="Treasury funding">
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line-strong bg-raised text-muted">
            <Wallet size={22} weight="duotone" />
          </div>
          <span className="num text-[11px] text-faint">owner.testnet</span>
        </div>
        <div className="relative mx-3 h-px flex-1 bg-line">
          <motion.span className="absolute -top-[5px] flex h-[11px] w-[11px] items-center justify-center rounded-full bg-accent text-bg shadow-[0_0_16px_rgba(0,226,154,.7)]" initial={{ left: "0%" }} animate={{ left: ["0%", "100%"] }} transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.6, ease: [0.65, 0, 0.35, 1] }} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent-dim text-accent">
            <Bank size={22} weight="duotone" />
          </div>
          <span className="num text-[11px] text-faint">treasury</span>
        </div>
      </div>
      <div className="mt-7 rounded-xl border border-line bg-raised p-4">
        <div className="text-[11.5px] text-faint">Available balance</div>
        <motion.div key={v} initial={{ opacity: 0.4, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-[32px] font-medium tracking-[-0.022em]">
          <Amt v={v} />
        </motion.div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]">
          {[["Per payment", 3], ["Spend cap", 10], ["Price floor", 5]].map(([k, n]) => (
            <div key={k} className="rounded-lg border border-line px-2.5 py-2">
              <div className="text-faint">{k}</div>
              <Amt v={n as number} d={0} className="mt-0.5 text-[13px]" />
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

const plan: [string, string, AgentRole, number][] = [
  ["T-101", "Map the agent payments market", "research", 2.5],
  ["T-102", "Rank underserved buyer segments", "research", 1.5],
  ["T-103", "Produce the 24-page report", "product", 3],
  ["T-104", "Write listing and checkout", "sales", 2],
  ["T-105", "Prepare first-week P&L", "finance", 1],
];

function VPlan() {
  return (
    <Panel label="CEO · operating plan">
      <div className="mb-4 flex items-center gap-3">
        <AgentGlyph role="ceo" size={34} active />
        <div>
          <div className="text-[13.5px] font-medium">Atlas</div>
          <div className="text-[11.5px] text-faint">Structured plan · 5 tasks · 10 NEAR budget</div>
        </div>
      </div>
      <ol className="relative space-y-1.5">
        <span className="absolute bottom-4 left-[13px] top-4 w-px bg-line" />
        {plan.map(([id, t, r, b], i) => (
          <motion.li key={id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.14, ease: EASE, duration: 0.6 }} className="relative flex items-center gap-3 rounded-lg border border-line bg-raised/70 px-2.5 py-2">
            <AgentGlyph role={r} size={26} />
            <span className="num text-[11px] text-faint">{id}</span>
            <span className="flex-1 truncate text-[12.5px]">{t}</span>
            <Amt v={b} className="text-[11.5px] text-muted" />
          </motion.li>
        ))}
      </ol>
    </Panel>
  );
}

function VWork() {
  const rows: [AgentRole, string, string, number][] = [
    ["research", "Meridian", "Research brief · 14 sources", 100],
    ["product", "Forge", "Market report · 24 pages", 100],
    ["sales", "Halcyon", "Listing and launch posts", 68],
    ["finance", "Ledger", "Watching the payment queue", 40],
  ];
  return (
    <Panel label="Workforce · live">
      <div className="space-y-3">
        {rows.map(([r, n, t, p], i) => (
          <div key={n} className="rounded-xl border border-line bg-raised/70 p-3">
            <div className="flex items-center gap-3">
              <AgentGlyph role={r} size={30} active={p < 100} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium">{n}</span>
                  <span className={cx("text-[11px]", p === 100 ? "text-accent" : "text-muted")}>{p === 100 ? "Delivered" : "Working"}</span>
                </div>
                <div className="truncate text-[11.5px] text-faint">{t}</div>
              </div>
            </div>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div className={cx("h-full rounded-full", p === 100 ? "bg-accent" : "bg-fg/60")} initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 1.4, delay: 0.2 + i * 0.15, ease: EASE }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const checks = ["Company not paused", "Recipient authorized", "Task exists", "Task approved", "Within per-payment limit", "Within spending cap", "Sufficient treasury", "Not already paid"];

function VPay() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => Math.min(checks.length, x + 1)), 220);
    return () => clearInterval(id);
  }, []);
  return (
    <Panel label="Treasury contract · pay_agent">
      <div className="mb-3 flex items-center justify-between rounded-lg border border-line bg-raised px-3 py-2 text-[12.5px]">
        <span className="text-muted">T-101 → meridian.testnet</span>
        <Amt v={2.5} />
      </div>
      <ul className="space-y-0.5">
        {checks.map((c, i) => (
          <li key={c} className="flex items-center gap-2.5 px-1 py-1.5 text-[12.5px]">
            <span className="flex h-4 w-4 items-center justify-center">
              {i < n ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 20 }}>
                  <Check size={13} weight="bold" className="text-accent" />
                </motion.span>
              ) : (
                <span className="h-1 w-1 rounded-full bg-faint" />
              )}
            </span>
            <span className={i < n ? "text-fg" : "text-faint"}>{c}</span>
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {n >= checks.length && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center justify-between rounded-lg border border-accent/25 bg-accent-dim px-3 py-2.5 text-[12.5px] text-accent">
            <span className="flex items-center gap-2"><Check size={13} weight="bold" /> Transfer executed</span>
            <span className="text-[11px] opacity-80">8 of 8 passed</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}

function VEarn() {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <Panel label="Revenue · distribution">
      <div className="flex items-center gap-6">
        <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
          <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="12" />
          <motion.circle cx="66" cy="66" r={r} fill="none" stroke="var(--fg)" strokeWidth="12" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * 0.2 }} transition={{ duration: 1.3, ease: EASE }} />
          <motion.circle cx="66" cy="66" r={r} fill="none" stroke="var(--accent)" strokeWidth="12" strokeDasharray={`${c * 0.2} ${c}`} initial={{ strokeDashoffset: c * 0.2, opacity: 0 }} animate={{ strokeDashoffset: -c * 0.8, opacity: 1 }} transition={{ duration: 1.3, delay: 0.4, ease: EASE }} />
        </svg>
        <div className="space-y-3 text-[13px]">
          <div>
            <div className="flex items-center gap-2 text-faint"><span className="h-2 w-2 rounded-full bg-fg" /> Retained · 80%</div>
            <Amt v={5.6} className="mt-0.5 text-[18px]" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-faint"><span className="h-2 w-2 rounded-full bg-accent" /> Workers · 20%</div>
            <Amt v={1.4} className="mt-0.5 text-[18px] text-accent" />
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-lg border border-line bg-raised px-3 py-2.5 text-[12.5px]">
        <span className="text-muted">Sale · Market Report 2026</span>
        <Amt v={7} sign="+" className="text-accent" />
      </div>
    </Panel>
  );
}

/* ───────────────────────── Steps ───────────────────────── */

const steps = [
  { k: "Define", title: "Write the mission, set the rules", body: "Name the company, describe the outcome you want, and decide how money may move: a per-payment limit, a total spending cap, a minimum price and a revenue split.", v: VMission },
  { k: "Fund", title: "Fund a treasury, not an agent", body: "Your NEAR goes into a company treasury governed by a contract. Agents never see a private key. They can only ask the treasury to pay, and the treasury answers to your policy.", v: VFund },
  { k: "Plan", title: "The CEO turns intent into a plan", body: "Atlas breaks the mission into tasks with IDs, owners, budgets and dependencies, then posts them to the internal task market where specialists bid for the work.", v: VPlan },
  { k: "Work", title: "Specialists do the actual work", body: "Research produces a sourced brief. Product turns it into a report customers can download. Sales writes the listing. Finance watches every number.", v: VWork },
  { k: "Pay", title: "Every payment passes eight checks", body: "Approved work becomes a payment request. The contract checks pause state, recipient, task, approval, limits, balance and duplicates in order, and stops at the first failure.", v: VPay },
  { k: "Earn", title: "Revenue flows back by policy", body: "When a customer buys, the sale is verified and the split you configured is applied: most stays in the treasury, the rest is allocated to the workforce that earned it.", v: VEarn },
];

export function Story() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(steps.length - 1, Math.max(0, Math.floor(v * steps.length)))));
  const V = steps[active].v;

  return (
    <section id="how" className="border-t border-line">
      <div className="mx-auto max-w-[1200px] px-5 pt-28 md:px-8 md:pt-36">
        <Reveal>
          <div className="max-w-3xl">
            <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-faint">How it works</div>
            <h2 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.024em] md:text-[40px]">
              From a sentence to a running business
              <span className="text-faint"> in six steps.</span>
            </h2>
          </div>
        </Reveal>
      </div>

      {/* Desktop: pinned scrollytelling */}
      <div ref={ref} className="relative hidden lg:block" style={{ height: `${steps.length * 75}vh` }}>
        <div className="sticky top-0 flex h-screen items-center">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[1fr_1fr] items-center gap-16 px-8">
            <div className="relative">
              <div className="absolute bottom-2 left-[15px] top-2 w-px bg-line" />
              <motion.div className="absolute left-[15px] top-2 w-px origin-top bg-accent" style={{ height: "calc(100% - 16px)", scaleY: scrollYProgress }} />
              <ol className="space-y-2">
                {steps.map((s, i) => (
                  <li key={s.k} className="relative pl-12">
                    <span className={cx("absolute left-0 top-1 flex h-[31px] w-[31px] items-center justify-center rounded-full border text-[11px] transition-all duration-500 num", i <= active ? "border-accent/40 bg-bg text-accent" : "border-line bg-bg text-faint", i === active && "shadow-[0_0_0_5px_rgba(0,226,154,.08)]")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className={cx("pt-1.5 text-[12px] font-medium uppercase tracking-[0.14em] transition-colors duration-500", i === active ? "text-accent" : "text-faint")}>{s.k}</div>
                    <motion.div initial={false} animate={{ height: i === active ? "auto" : 0, opacity: i === active ? 1 : 0 }} transition={{ duration: 0.5, ease: EASE }} className="overflow-hidden">
                      <h3 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.018em]">{s.title}</h3>
                      <p className="mt-3 max-w-md pb-4 text-[15px] leading-relaxed text-muted">{s.body}</p>
                    </motion.div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="relative flex min-h-[520px] items-center justify-center">
              <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_65%)]" />
              <AnimatePresence mode="wait">
                <motion.div key={active} className="relative flex w-full justify-center" initial={{ opacity: 0, y: 30, scale: 0.96, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, y: -24, scale: 0.98, filter: "blur(10px)" }} transition={{ duration: 0.55, ease: EASE }}>
                  <V />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile and tablet: stacked */}
      <div className="mx-auto max-w-[1200px] space-y-16 px-5 py-16 md:px-8 lg:hidden">
        {steps.map((s, i) => (
          <Reveal key={s.k}>
            <div className="text-[12px] font-medium uppercase tracking-[0.14em] text-accent">
              <span className="num">{String(i + 1).padStart(2, "0")}</span> · {s.k}
            </div>
            <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.022em]">{s.title}</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{s.body}</p>
            <div className="mt-6 flex justify-center">
              <s.v />
            </div>
          </Reveal>
        ))}
      </div>
      <div className="h-16 lg:h-24" />
    </section>
  );
}
