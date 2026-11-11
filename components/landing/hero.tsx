"use client";

import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { Button, EASE, Logo, NearMark, Reveal, TLink, cx } from "../ui";
import { LiveConsole } from "../live-console";
import { CompanyOrbit } from "./orbit";
import { ArrowRight, Check, Key, Lock, Prohibit, Wallet } from "../icons";

const links = [
  ["Product", "#product"],
  ["How it works", "#how"],
  ["Security", "#security"],
  ["Workforce", "#workforce"],
  ["FAQ", "#faq"],
];

export function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE }}
      className={cx("fixed inset-x-0 top-0 z-50 transition-[background,border-color,backdrop-filter] duration-500", scrolled ? "border-b border-line bg-bg/70 backdrop-blur-xl" : "border-b border-transparent")}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-8">
        <TLink href="/">
          <Logo />
        </TLink>
        <nav className="hidden items-center gap-1 text-[13.5px] text-muted lg:flex">
          {links.map(([l, h]) => (
            <a key={h} href={h} className="rounded-lg px-3 py-1.5 transition-colors hover:bg-white/[0.04] hover:text-fg">
              {l}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <Button href="/dashboard" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Open app
          </Button>
          <Button href="/launch" variant="primary" size="sm">
            Launch company
          </Button>
        </div>
      </div>
    </motion.header>
  );
}

export function Hero() {
  const words: [string, boolean][] = [["Give", false], ["AI", false], ["a", false], ["company.", true]];

  return (
    <section className="relative overflow-hidden pb-16 pt-32 md:pb-24 md:pt-40">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute right-[-10%] top-[10%] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(0,226,154,0.10),transparent_65%)] blur-2xl" />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 px-5 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="mb-6 flex items-center justify-center gap-2 text-[12.5px] font-medium text-muted lg:justify-start"
          >
            <span className="relative flex h-1.5 w-1.5 rounded-full bg-accent text-accent pulse-ring" />
            Autonomous Business on NEAR
          </motion.div>

          <h1 className="text-[40px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[52px] lg:text-[60px]">
            {words.map(([w, accent], i) => (
              <motion.span
                key={i}
                className={cx("inline-block", accent && "relative text-accent")}
                initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.9, delay: 0.1 + i * 0.07, ease: EASE }}
              >
                {w}
                {accent && (
                  <motion.svg viewBox="0 0 200 12" className="absolute -bottom-1.5 left-0 h-3 w-full" preserveAspectRatio="none">
                    <motion.path d="M2 8 C 50 2, 120 2, 198 7" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.9, duration: 0.8, ease: EASE }} />
                  </motion.svg>
                )}
                &nbsp;
              </motion.span>
            ))}
            <br className="hidden sm:block" />
            <motion.span className="inline-block text-faint" initial={{ opacity: 0, y: 30, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, delay: 0.45, ease: EASE }}>
              Not your wallet.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease: EASE }}
            className="mx-auto mt-6 max-w-[520px] text-[15.5px] leading-relaxed text-muted lg:mx-0"
          >
            Agent Zero runs a business with an AI workforce. A CEO agent plans the work, specialists research, build and sell, and every payment they ask for is checked by a NEAR smart contract before a single token moves.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.75, ease: EASE }} className="mt-8 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
            <Button href="/launch" variant="primary" size="lg">
              Launch a company <ArrowRight size={14} weight="bold" />
            </Button>
            <Button
              href="/dashboard"
              size="lg"
             
            >
              Open the app
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.95 }} className="mt-10 grid max-w-[520px] grid-cols-3 gap-3 text-left max-lg:mx-auto">
            {[
              [NearMark, "Treasury on NEAR"],
              [Key, "No keys in prompts"],
              [Lock, "Owner sets the rules"],
            ].map(([I, t]) => {
              const Icon = I as typeof Key;
              return (
                <div key={t as string} className="rounded-xl border border-line bg-surface/60 px-3 py-2.5 backdrop-blur">
                  <Icon size={15} className="text-accent" />
                  <div className="mt-1.5 text-[12px] leading-snug text-muted">{t as string}</div>
                </div>
              );
            })}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.4, delay: 0.3, ease: EASE }} className="px-6 pt-6 sm:px-10 lg:px-0">
          <CompanyOrbit />
        </motion.div>
      </div>
    </section>
  );
}

export function ProductShot() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);
  const glow = useTransform(scrollYProgress, [0, 1], [0.2, 1]);

  return (
    <section ref={ref} className="relative pb-24 pt-20 md:pb-32">
      <div className="mx-auto max-w-[1200px] px-5 text-center md:px-8">
        <Reveal>
          <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-faint">The command centre</div>
          <h2 className="mx-auto mt-4 max-w-2xl text-[30px] font-semibold leading-[1.08] tracking-[-0.024em] md:text-[40px]">Watch your company work, earn and get told no.</h2>
        </Reveal>
      </div>
      <div className="relative mx-auto mt-14 max-w-[1060px] px-5 md:px-8" style={{ perspective: 1600 }}>
        <motion.div style={{ rotateX, scale, transformOrigin: "50% 100%" }}>
          <LiveConsole />
        </motion.div>
        <motion.div style={{ opacity: glow }} className="pointer-events-none absolute -bottom-16 left-1/2 h-48 w-3/4 -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(0,226,154,0.12),transparent_70%)] blur-2xl" />
      </div>
    </section>
  );
}

const ticker = [
  "CEO published operating plan",
  "Research brief · 14 sources",
  "Payout T-101 · 2.50 NEAR · cleared",
  "Market report exported · 24 pages",
  "Bid accepted · 1.80 NEAR",
  "Self-transfer 5.00 NEAR · rejected",
  "Sale recorded · 7.00 NEAR",
  "Worker allocation · 20%",
  "Company paused by owner",
  "Policy updated · cap 10 NEAR",
];

export function Marquee() {
  const items = [...ticker, ...ticker];
  return (
    <div className="relative overflow-hidden border-y border-line bg-surface/30 py-4 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <div className="marquee flex w-max gap-12">
        {items.map((t, i) => (
          <span key={i} className="num flex items-center gap-3 whitespace-nowrap text-[12.5px] text-faint">
            <span className={cx("h-1 w-1 rounded-full", t.includes("rejected") ? "bg-danger" : t.includes("paused") ? "bg-warn" : "bg-accent")} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Problem ───────────────────────── */

const options = [
  {
    icon: Wallet,
    name: "Hand the agent a wallet",
    verdict: "Fast, and one prompt injection away from empty.",
    tone: "danger" as const,
    points: ["Full signing power", "No spending limits", "Nothing to stop a bad instruction"],
  },
  {
    icon: Prohibit,
    name: "Keep money away from it",
    verdict: "Safe, and the agent can never finish a job.",
    tone: "warn" as const,
    points: ["Human approves every step", "No hiring, no selling", "Work stalls at the first invoice"],
  },
  {
    icon: Check,
    name: "Give it a company",
    verdict: "Agents operate freely inside rules they cannot change.",
    tone: "accent" as const,
    points: ["Budgets, caps and price floors", "Task-linked payments only", "Contract checks every transfer"],
  },
];

export function Problem() {
  return (
    <section id="product" className="mx-auto max-w-[1200px] px-5 py-28 md:px-8 md:py-36">
      <Reveal>
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-faint">The problem</div>
          <h2 className="mt-4 text-[30px] font-semibold leading-[1.05] tracking-[-0.024em] md:text-[40px]">
            AI can already do the work.
            <br />
            <span className="text-faint">It still can&apos;t run the business.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15.5px] leading-relaxed text-muted">
            Research, reports, listings and support are within reach of today&apos;s agents. What&apos;s missing is the economic structure around them: a budget, a payroll, customers, and rules about money that the model cannot talk its way past.
          </p>
        </div>
      </Reveal>

      <div className="mt-16 grid gap-3 md:grid-cols-3">
        {options.map((o, i) => (
          <Reveal key={o.name} delay={i * 0.1}>
            <div
              className={cx(
                "group relative h-full overflow-hidden rounded-2xl border p-7 transition-colors duration-500",
                o.tone === "accent" ? "border-accent/25 bg-gradient-to-b from-accent/[0.07] to-transparent" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              {o.tone === "accent" && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />}
              <div className={cx("flex h-10 w-10 items-center justify-center rounded-xl border", o.tone === "danger" ? "border-danger/25 bg-danger-dim text-danger" : o.tone === "warn" ? "border-warn/25 bg-warn-dim text-warn" : "border-accent/25 bg-accent-dim text-accent")}>
                <o.icon size={19} weight="duotone" />
              </div>
              <div className="mt-6 text-[11.5px] font-medium uppercase tracking-[0.14em] text-faint">Option {String.fromCharCode(65 + i)}</div>
              <h3 className="mt-1.5 text-[21px] font-semibold tracking-[-0.025em]">{o.name}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{o.verdict}</p>
              <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                {o.points.map((p) => (
                  <li key={p} className="flex items-center gap-2.5 text-[13.5px] text-fg/85">
                    <span className={cx("h-1.5 w-1.5 rounded-full", o.tone === "danger" ? "bg-danger" : o.tone === "warn" ? "bg-warn" : "bg-accent")} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
