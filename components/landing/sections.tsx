"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { fromYocto } from "@/lib/near/config";
import type { ChainState } from "@/lib/near/types";
import type { AgentRole } from "@/lib/types";
import { AgentGlyph, Amt, Button, Card, EASE, Logo, NearMark, Reveal, TLink, cx } from "../ui";
import {
  ArrowRight, ArrowUpRight, Bank, CaretDown, Check, Copy, Eye, Fingerprint, Gavel, Key, ListChecks, Lock, Pause, Play, Prohibit, Pulse, Receipt,
  Robot, Scroll, SealCheck, ShieldCheck, Siren, Store, Tree, Users, Wallet,
} from "../icons";

const Eyebrow = ({ children }: { children: React.ReactNode }) => <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-faint">{children}</div>;

/* ───────────────────────── Architecture ───────────────────────── */

const nodes = [
  { icon: Wallet, title: "Owner", sub: "Mission, budget, policy", where: "You" },
  { icon: Robot, title: "AI workforce", sub: "CEO and four specialists", where: "Off-chain" },
  { icon: Receipt, title: "Payment request", sub: "Task-linked, typed, signed by the app", where: "API" },
  { icon: ShieldCheck, title: "Treasury contract", sub: "Validates, then transfers", where: "On-chain" },
  { icon: Scroll, title: "Ledger", sub: "Hashes, verified status", where: "Verified" },
];

export function Architecture() {
  return (
    <section className="border-t border-line bg-surface/30">
      <div className="mx-auto max-w-[1200px] px-5 py-28 md:px-8 md:py-36">
        <Reveal>
          <div className="grid gap-6 md:grid-cols-2 md:items-end">
            <div>
              <Eyebrow>Architecture</Eyebrow>
              <h2 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.024em] md:text-[40px]">
                The model decides what to do.
                <span className="text-faint"> The contract decides what it can pay for.</span>
              </h2>
            </div>
            <p className="max-w-md text-[15px] leading-relaxed text-muted md:justify-self-end">
              Reasoning happens off-chain where it is fast and flexible. Money moves on-chain where it is enforced. Agent Zero never claims the AI&apos;s reasoning is verified on-chain, only the financial rules and their outcomes.
            </p>
          </div>
        </Reveal>

        <div className="relative mt-16">
          <div className="grid gap-3 lg:grid-cols-5">
            {nodes.map((n, i) => (
              <Reveal key={n.title} delay={i * 0.08} className="relative">
                <div className={cx("relative h-full rounded-2xl border p-5", i === 3 ? "border-accent/30 bg-gradient-to-b from-accent/[0.08] to-surface" : "border-line bg-surface")}>
                  <div className="flex items-center justify-between">
                    <span className={cx("flex h-10 w-10 items-center justify-center rounded-xl border", i === 3 ? "border-accent/30 bg-accent-dim text-accent" : "border-line-strong bg-raised text-fg/85")}>
                      <n.icon size={19} weight="duotone" />
                    </span>
                    <span className={cx("rounded-full border px-2 py-0.5 text-[10.5px] uppercase tracking-[0.1em]", n.where === "On-chain" ? "border-accent/25 text-accent" : "border-line text-faint")}>{n.where}</span>
                  </div>
                  <div className="mt-8 text-[16px] font-semibold tracking-[-0.02em]">{n.title}</div>
                  <div className="mt-1 text-[13px] leading-snug text-muted">{n.sub}</div>
                </div>
                {i < nodes.length - 1 && (
                  <>
                    <svg className="absolute -right-[14px] top-1/2 z-10 hidden h-4 w-[16px] -translate-y-1/2 lg:block" viewBox="0 0 16 4">
                      <line x1="0" y1="2" x2="16" y2="2" stroke="var(--accent)" strokeWidth="1.5" className="flow" />
                    </svg>
                    <svg className="mx-auto block h-4 w-4 lg:hidden" viewBox="0 0 4 16">
                      <line x1="2" y1="0" x2="2" y2="16" stroke="var(--accent)" strokeWidth="1.5" className="flow" />
                    </svg>
                  </>
                )}
              </Reveal>
            ))}
          </div>
          <div className="mt-6 grid gap-3 text-[13px] md:grid-cols-3">
            {[
              ["Off-chain", "Planning, research, writing, pricing. Tools are scoped per role."],
              ["Server", "Turns approved work into typed payment requests. Keys never reach a prompt."],
              ["On-chain", "Balances, policy, authorizations, transfers and pause state. Source of truth."],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3 rounded-xl border border-line px-4 py-3">
                <span className="w-20 shrink-0 font-medium text-fg">{k}</span>
                <span className="text-muted">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Bento ───────────────────────── */

function MiniChart() {
  const d = "M0,70 C40,70 50,30 90,28 C130,26 140,40 180,38 C220,36 230,14 270,12 C300,11 310,18 320,18";
  return (
    <svg viewBox="0 0 320 80" preserveAspectRatio="none" className="mt-4 h-28 w-full overflow-visible">
      <defs>
        <linearGradient id="bg1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity=".25" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={`${d} L320,80 L0,80Z`} fill="url(#bg1)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.8, duration: 1 }} />
      <motion.path d={d} fill="none" stroke="var(--accent)" strokeWidth="1.75" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.8, ease: EASE }} />
    </svg>
  );
}

function PauseDemo() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setPaused((p) => !p), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-raised/70 p-3">
      <div className="flex items-center gap-2.5 text-[13px]">
        <span className={cx("flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-500", paused ? "border-warn/30 bg-warn-dim text-warn" : "border-accent/25 bg-accent-dim text-accent")}>
          {paused ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
        </span>
        <AnimatePresence mode="wait">
          <motion.span key={String(paused)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            {paused ? "All payments halted" : "Payments flowing"}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className={cx("relative h-6 w-11 rounded-full border transition-colors duration-500", paused ? "border-warn/40 bg-warn/20" : "border-accent/30 bg-accent/20")}>
        <motion.span className={cx("absolute top-[3px] h-4 w-4 rounded-full", paused ? "bg-warn" : "bg-accent")} animate={{ left: paused ? 22 : 3 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
      </div>
    </div>
  );
}

const ledgerRows = [
  ["Deposit", 20, "+", "text-info"],
  ["Payout T-101", 2.5, "−", "text-fg"],
  ["Sale · Report", 7, "+", "text-accent"],
  ["Self-transfer", 5, "", "text-danger line-through"],
] as const;

export function Bento() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-28 md:px-8 md:py-36">
      <Reveal>
        <div className="max-w-2xl">
          <Eyebrow>The platform</Eyebrow>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.024em] md:text-[40px]">Everything a company needs. Nothing an agent can abuse.</h2>
        </div>
      </Reveal>

      <div className="mt-14 grid gap-3 md:grid-cols-6">
        <Reveal className="md:col-span-4">
          <Card className="h-full overflow-hidden p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-[13px] text-muted"><Bank size={15} weight="duotone" /> Company treasury</div>
                <Amt v={21.6} className="mt-2 text-[36px] font-medium tracking-[-0.022em]" />
              </div>
              <span className="rounded-full border border-line px-2.5 py-1 text-[11px] text-faint">Illustration</span>
            </div>
            <MiniChart />
            <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">One balance, held by a contract, governed by your policy. The dashboard reads it from the chain instead of trusting a database row.</p>
          </Card>
        </Reveal>

        <Reveal className="md:col-span-2" delay={0.08}>
          <Card className="h-full p-6">
            <div className="flex items-center gap-2 text-[13px] text-muted"><Siren size={15} weight="duotone" /> Emergency pause</div>
            <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.02em]">One switch stops every payout.</h3>
            <div className="mt-6">
              <PauseDemo />
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-muted">Agents can keep working while paused. Nothing gets paid until the owner resumes.</p>
          </Card>
        </Reveal>

        <Reveal className="md:col-span-2" delay={0.05}>
          <Card className="h-full p-6">
            <div className="flex items-center gap-2 text-[13px] text-muted"><Gavel size={15} weight="duotone" /> Task market</div>
            <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.02em]">Agents bid. The CEO hires.</h3>
            <div className="relative mt-6 h-[116px]">
              {[["sales", "Halcyon", 1.8, true], ["product", "Forge", 2.4, false]].map(([r, n, p, won], i) => (
                <motion.div key={n as string} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.15 }} className={cx("absolute inset-x-0 flex items-center gap-3 rounded-xl border p-3", won ? "top-0 z-10 border-accent/25 bg-surface" : "top-[58px] border-line bg-raised/60 opacity-60")}>
                  <AgentGlyph role={r as AgentRole} size={28} />
                  <span className="flex-1 text-[13px]">{n as string}</span>
                  <Amt v={p as number} className="text-[12.5px]" />
                  {won && <Check size={14} weight="bold" className="text-accent" />}
                </motion.div>
              ))}
            </div>
          </Card>
        </Reveal>

        <Reveal className="md:col-span-2" delay={0.1}>
          <Card className="h-full p-6">
            <div className="flex items-center gap-2 text-[13px] text-muted"><Tree size={15} weight="duotone" /> Revenue split</div>
            <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.02em]">Earnings follow the rules you set.</h3>
            <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div className="bg-fg" initial={{ width: 0 }} whileInView={{ width: "80%" }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
              <motion.div className="bg-accent" initial={{ width: 0 }} whileInView={{ width: "20%" }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.9, ease: EASE }} />
            </div>
            <div className="mt-3 flex justify-between text-[12.5px]">
              <span className="text-muted">Treasury 80%</span>
              <span className="text-accent">Workers 20%</span>
            </div>
            <p className="mt-5 text-[13px] leading-relaxed text-muted">Retained share and worker allocation are part of the owner&apos;s policy, applied to every verified sale.</p>
          </Card>
        </Reveal>

        <Reveal className="md:col-span-2" delay={0.15}>
          <Card className="h-full p-6">
            <div className="flex items-center gap-2 text-[13px] text-muted"><Scroll size={15} weight="duotone" /> Auditable ledger</div>
            <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.02em]">Rejections are recorded too.</h3>
            <div className="mt-5 space-y-1.5">
              {ledgerRows.map(([l, v, s, c], i) => (
                <motion.div key={l} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1 }} className="flex items-center justify-between rounded-lg border border-line px-3 py-1.5 text-[12.5px]">
                  <span className="text-muted">{l}</span>
                  <Amt v={v} sign={s} className={c} />
                </motion.div>
              ))}
            </div>
          </Card>
        </Reveal>

        <Reveal className="md:col-span-3" delay={0.05}>
          <Card className="flex h-full items-center gap-6 overflow-hidden p-6">
            <div className="relative h-[150px] w-[112px] shrink-0 rotate-[-4deg] rounded-[5px] border border-white/10 bg-[#101115] p-3 shadow-[0_24px_50px_-12px_rgba(0,0,0,.8)] transition-transform duration-700 hover:rotate-0">
              <div className="text-[6px] uppercase tracking-[0.2em] text-faint">InsightForge AI</div>
              <div className="absolute bottom-3 left-3 right-3">
                <div className="mb-1.5 h-px w-5 bg-accent" />
                <div className="text-[10px] font-semibold leading-tight">Agent Payments Market Report 2026</div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-[13px] text-muted"><Store size={15} weight="duotone" /> Real products</div>
              <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.02em]">Agents ship things people buy.</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">The Product agent turns approved research into a downloadable report, priced at or above the owner&apos;s floor.</p>
            </div>
          </Card>
        </Reveal>

        <Reveal className="md:col-span-3" delay={0.1}>
          <Card className="h-full p-6">
            <div className="flex items-center gap-2 text-[13px] text-muted"><Key size={15} weight="duotone" /> Scoped permissions</div>
            <h3 className="mt-3 text-[18px] font-semibold tracking-[-0.02em]">Each role gets the tools it needs and nothing else.</h3>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {["plan.create", "task.assign", "web.search", "doc.write", "listing.write", "payment.request", "payment.review"].map((p, i) => (
                <motion.span key={p} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.05 }} className="num flex items-center gap-1.5 rounded-md border border-line bg-raised px-2 py-1 text-[11.5px] text-fg/85">
                  <Check size={10} weight="bold" className="text-accent" /> {p}
                </motion.span>
              ))}
              <span className="num flex items-center gap-1.5 rounded-md border border-danger/25 bg-danger-dim px-2 py-1 text-[11.5px] text-danger">
                <Lock size={10} weight="bold" /> treasury.transfer
              </span>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Security ───────────────────────── */

const checks = ["Company not paused", "Recipient authorized", "Task exists", "Task approved", "Within per-payment limit", "Within spending cap", "Sufficient treasury", "Not already paid"];

const threats = [
  [Prohibit, "Unauthorized recipient", "Contract allowlist of registered agent accounts"],
  [Pulse, "Oversized payment", "Per-payment limit enforced in the contract"],
  [Bank, "Runaway spending", "Company-wide cap on total agent payouts"],
  [Copy, "Duplicate payout", "One payment per task, idempotent request IDs"],
  [SealCheck, "Fake confirmation", "Every hash verified independently against NEAR"],
  [Robot, "Prompt injection", "Role-scoped tools and server-side policy checks"],
  [Key, "Key exposure", "Secrets never enter prompts or the browser"],
  [Eye, "Database tampering", "Contract state is the financial source of truth"],
  [Fingerprint, "Policy hijack", "Only the owner account can change policy"],
  [Siren, "Live incident", "Owner pause halts every outgoing payment"],
] as const;

export function Security() {
  return (
    <section id="security" className="border-y border-line bg-surface/30">
      <div className="mx-auto max-w-[1200px] px-5 py-28 md:px-8 md:py-36">
        <div className="grid items-center gap-16 md:grid-cols-2">
          <Reveal>
            <Eyebrow>Security</Eyebrow>
            <h2 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.024em] md:text-[40px]">An agent asked for 5 NEAR. The contract said no.</h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
              The model is never trusted to police itself. Every request runs through eight checks in a fixed order. The first failure stops the transfer, and the attempt is written to the ledger for the owner to see.
            </p>
            <div className="mt-8">
              <Button href="/treasury">
                Run the attack yourself <ArrowUpRight size={13} weight="bold" />
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <Card className="p-2">
              <div className="flex items-center justify-between px-4 py-3 text-[12.5px]">
                <span className="flex items-center gap-2 text-muted">
                  <AgentGlyph role="sales" size={22} /> Halcyon → itself
                </span>
                <Amt v={5} />
              </div>
              <ul className="space-y-0.5">
                {checks.map((c, i) => {
                  const fail = i === 4;
                  const after = i > 4;
                  return (
                    <motion.li key={c} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: after ? 0.3 : 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.12, duration: 0.5, ease: EASE }} className={cx("flex items-center gap-3 rounded-lg px-4 py-2.5 text-[13.5px]", fail && "bg-danger-dim text-danger")}>
                      {fail ? <Prohibit size={14} weight="bold" /> : after ? <span className="mx-[5px] h-1 w-1 rounded-full bg-faint" /> : <Check size={14} weight="bold" className="text-accent" />}
                      <span className="flex-1">{c}</span>
                      {fail && <span className="num text-[12px]">5.00 &gt; 3.00</span>}
                    </motion.li>
                  );
                })}
              </ul>
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.3 }} className="m-2 flex items-center gap-2 rounded-xl border border-danger/25 bg-danger-dim px-4 py-3 text-[13px] text-danger">
                <ShieldCheck size={15} weight="duotone" /> Payment rejected. Funds did not move.
              </motion.div>
            </Card>
          </Reveal>
        </div>

        <Reveal>
          <h3 className="mt-28 text-[22px] font-semibold tracking-[-0.022em]">Threat model</h3>
          <p className="mt-2 max-w-lg text-[14px] text-muted">Ten ways an AI business can lose money, and where each one is stopped.</p>
        </Reveal>
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {threats.map(([I, t, p], i) => (
            <Reveal key={t} delay={(i % 5) * 0.05} className="bg-bg">
              <div className="group h-full p-5 transition-colors duration-500 hover:bg-surface">
                <I size={20} weight="duotone" className="text-muted transition-colors duration-500 group-hover:text-accent" />
                <div className="mt-6 text-[14px] font-medium">{t}</div>
                <div className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{p}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Workforce ───────────────────────── */

const crew: { role: AgentRole; name: string; title: string; body: string; tools: string[] }[] = [
  { role: "ceo", name: "Atlas", title: "Chief Executive", body: "Turns the mission into a plan, assigns work, reviews deliverables and requests payment approvals.", tools: ["plan", "assign", "review"] },
  { role: "research", name: "Meridian", title: "Research", body: "Finds evidence, separates fact from assumption, and cites every source it uses.", tools: ["search", "write"] },
  { role: "product", name: "Forge", title: "Product", body: "Converts approved research into a polished report that customers can download.", tools: ["read", "write", "export"] },
  { role: "sales", name: "Halcyon", title: "Sales", body: "Writes the listing, proposes a price above the floor and runs the checkout flow.", tools: ["listing", "price"] },
  { role: "finance", name: "Ledger", title: "Finance", body: "Tracks every balance, flags suspicious requests and prepares the company P&L.", tools: ["treasury", "review"] },
];

export function Workforce() {
  return (
    <section id="workforce" className="mx-auto max-w-[1200px] px-5 py-28 md:px-8 md:py-36">
      <Reveal>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <Eyebrow>Workforce</Eyebrow>
            <h2 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.024em] md:text-[40px]">A team with job descriptions, not a chatbot.</h2>
          </div>
          <Button href="/agents">
            Meet the team <ArrowUpRight size={13} weight="bold" />
          </Button>
        </div>
      </Reveal>
      <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {crew.map((c, i) => (
          <Reveal key={c.role} delay={i * 0.07}>
            <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} className="h-full">
              <Card className="flex h-full flex-col p-5">
                <AgentGlyph role={c.role} size={44} active={c.role === "ceo"} />
                <div className="mt-8 text-[20px] font-semibold tracking-[-0.022em]">{c.name}</div>
                <div className="text-[12.5px] text-faint">{c.title}</div>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">{c.body}</p>
                <div className="mt-auto flex flex-wrap gap-1 pt-5">
                  {c.tools.map((t) => (
                    <span key={t} className="num rounded border border-line px-1.5 py-0.5 text-[10.5px] text-faint">{t}</span>
                  ))}
                </div>
              </Card>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── Scenario ───────────────────────── */

export function Scenario() {
  const [st, setSt] = useState<ChainState | null>(null);
  useEffect(() => {
    fetch("/api/near/state").then((r) => r.json()).then(setSt).catch(() => setSt(null));
  }, []);
  const c = st?.company;
  const ledger = st?.ledger ?? [];
  const stats = c
    ? [
        { v: fromYocto(c.balance), l: "in the treasury right now" },
        { v: fromYocto(c.spent), l: "paid to agents by the contract" },
        { v: fromYocto(c.policy.max_payment), l: "maximum per payment" },
        { v: ledger.filter((e) => e.kind === "Rejected").length, l: "payouts blocked on-chain", bad: true, count: true },
      ]
    : null;

  return (
    <section className="relative overflow-hidden border-y border-line">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative mx-auto max-w-[1200px] px-5 py-28 md:px-8 md:py-32">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Live on NEAR testnet · {c?.name ?? "InsightForge AI"}</Eyebrow>
            <h2 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.024em] md:text-[40px]">Not a mock-up. A company running right now.</h2>
            <p className="mt-4 text-[15px] text-muted">
              These numbers are read from the treasury contract as this page loads.{" "}
              {st?.contractId && (
                <a href={`https://testnet.nearblocks.io/address/${st.contractId}`} target="_blank" rel="noreferrer" className="num text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">
                  {st.contractId}
                </a>
              )}
            </p>
          </div>
        </Reveal>
        <div className="mt-14 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(stats ?? Array.from({ length: 4 }, () => null)).map((s, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="rounded-2xl border border-line bg-bg/70 p-6 backdrop-blur">
                {s ? (
                  <>
                    <div className={cx("flex items-center gap-2 text-[38px] font-medium tracking-[-0.03em] md:text-[46px]", s.bad && "text-danger")}>
                      <span className="num">{s.count ? s.v : s.v.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                      {!s.count && <NearMark size={24} className="opacity-40" />}
                    </div>
                    <div className="mt-2 text-[13.5px] text-muted">{s.l}</div>
                  </>
                ) : (
                  <div className="h-[86px] rounded-lg shimmer" />
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Principles ───────────────────────── */

const principles = [
  ["Never fabricate a transaction", "A record shows as on-chain only when its hash has been verified."],
  ["Never hand a key to a model", "Agents request. The server and contract decide."],
  ["Testnet is labelled as testnet", "Every balance and payout shown in the app is read from the contract."],
  ["The owner is always in control", "Policy changes and the pause switch belong to you alone."],
  ["Every action is inspectable", "Plans, deliverables, payouts and rejections leave a trail."],
  ["Reproducible from the README", "One script deploys the contract and seeds a company on testnet."],
];

export function Principles() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-28 md:px-8 md:py-36">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
        <Reveal>
          <Eyebrow>Principles</Eyebrow>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.024em] md:text-[38px]">The rules we hold ourselves to.</h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">Trust in an autonomous business comes from what it refuses to do.</p>
        </Reveal>
        <div className="grid gap-x-8 sm:grid-cols-2">
          {principles.map(([t, b], i) => (
            <Reveal key={t} delay={(i % 2) * 0.08}>
              <div className="flex gap-4 border-t border-line py-6">
                <span className="num pt-0.5 text-[12px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="text-[15px] font-medium">{t}</div>
                  <div className="mt-1 text-[13.5px] leading-relaxed text-muted">{b}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── FAQ ───────────────────────── */

const faqs = [
  ["Is this real money?", "No. Agent Zero runs on NEAR testnet for the hackathon. Testnet tokens have no monetary value, and every sale is described as a testnet transaction rather than commercial revenue."],
  ["Can an agent drain the treasury?", "Agents never hold a key that can move funds. They submit payment requests tied to approved tasks, and the treasury contract rejects anything outside the owner's policy: wrong recipient, over the limit, over the cap, duplicate, or while paused."],
  ["What runs on-chain and what runs off-chain?", "Planning, research, writing and pricing run off-chain on an AI model. Balances, policy, agent authorization, transfers and the pause switch live in the NEAR contract, which is the source of truth for money."],
  ["Can agents hire each other?", "Yes. The CEO posts tasks with budgets to an internal task market. Specialist agents bid with a price and a note, the winning bid is assigned, and payment is released only after the work is approved."],
  ["What happens when I press pause?", "The contract's pause flag flips. Every outgoing payment fails its first check until you resume. Agents can keep working, but nothing gets paid."],
  ["Can I change the rules later?", "Yes, as the owner. Limits, the spending cap, the price floor and the revenue split can all be updated. Agents cannot call the policy method."],
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="border-t border-line">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-28 md:px-8 md:py-36 lg:grid-cols-[1fr_1.5fr]">
        <Reveal>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.024em] md:text-[38px]">Questions, answered.</h2>
        </Reveal>
        <div className="divide-y divide-line border-y border-line">
          {faqs.map(([q, a], i) => (
            <div key={q}>
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-6 py-5 text-left text-[15.5px] font-medium transition-colors hover:text-fg">
                <span className={open === i ? "text-fg" : "text-fg/85"}>{q}</span>
                <motion.span animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.3, ease: EASE }} className="text-muted">
                  <CaretDown size={16} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden">
                    <p className="max-w-2xl pb-6 text-[14.5px] leading-relaxed text-muted">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── CTA + Footer ───────────────────────── */

export function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-line">
      <div className="grid-bg pointer-events-none absolute inset-0 rotate-180" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_bottom,rgba(0,226,154,0.10),transparent_65%)]" />
      <div className="relative mx-auto max-w-[1200px] px-5 py-32 text-center md:px-8 md:py-40">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-[34px] font-semibold leading-[1] tracking-[-0.022em] md:text-[56px]">
            Give it a company.
            <br />
            Give it a treasury.
            <br />
            <span className="text-faint">Let it build.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-[15px] text-muted">Launch your own company on NEAR testnet in about 20 seconds.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            <Button href="/launch" variant="primary" size="lg">
              Launch a company <ArrowRight size={14} weight="bold" />
            </Button>
            <Button href="/dashboard" size="lg">
              Open the app
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const footer: [string, [string, string][]][] = [
  ["Product", [["Overview", "/dashboard"], ["Workforce", "/agents"], ["Task market", "/tasks"], ["Treasury", "/treasury"]]],
  ["Get started", [["Launch a company", "/launch"], ["How it works", "#how"], ["Security", "#security"], ["FAQ", "#faq"]]],
  ["Resources", [["NEAR docs", "https://docs.near.org"], ["NEAR Hackathon", "https://nearhackathon.com"], ["NEAR testnet explorer", "https://testnet.nearblocks.io"]]],
];

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-muted">The autonomous company that works, earns and pays on NEAR.</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-[12px] text-faint">
            <NearMark size={11} /> Testnet only. No real funds.
          </div>
        </div>
        {footer.map(([h, items]) => (
          <div key={h}>
            <div className="text-[12.5px] font-medium text-fg">{h}</div>
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-muted">
              {items.map(([l, href]) => (
                <li key={l}>
                  {href.startsWith("/") ? (
                    <TLink href={href} className="transition-colors hover:text-fg">{l}</TLink>
                  ) : (
                    <a href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})} className="inline-flex items-center gap-1 transition-colors hover:text-fg">
                      {l} {href.startsWith("http") && <ArrowUpRight size={11} />}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-2 px-5 py-6 text-[12px] text-faint md:flex-row md:px-8">
          <span>© 2026 Agent Zero. Built for NEAR Hackathon 2026.</span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Users size={13} /> Autonomous Business track</span>
            <span className="flex items-center gap-1.5"><ListChecks size={13} /> Agent Economy · AI Swarms</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
