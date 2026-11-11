"use client";

import { animate, motion, useMotionValue, useTransform, type HTMLMotionProps } from "motion/react";
import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import type { AgentRole, Provenance } from "@/lib/types";
import { useGo } from "./transition";
import { ChartUp, Crown, Cube, Search, Vault } from "./icons";

export const cx = clsx;
export const EASE = [0.16, 1, 0.3, 1] as const;
export { Logo, Mark, NearMark, Amt } from "./brand";

/* ───────────────────────── Buttons ───────────────────────── */

type BtnProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Button({ children, variant = "secondary", size = "md", href, className, ...rest }: BtnProps) {
  const go = useGo();
  const cls = cx(
    "group relative inline-flex select-none items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap font-semibold tracking-[0.005em] transition-[background,color,box-shadow,border-color,transform] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
    size === "sm" && "h-7 rounded-[8px] px-2.5 text-[12.5px]",
    size === "md" && "h-8 rounded-[9px] px-3.5 text-[13px]",
    size === "lg" && "h-9 rounded-[10px] px-4 text-[13.5px]",
    variant === "primary" &&
      "bg-fg text-bg shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_1px_2px_rgba(0,0,0,.4),0_6px_20px_-6px_rgba(255,255,255,.22)] hover:bg-white",
    variant === "secondary" && "border border-line-strong bg-white/[0.03] text-fg shadow-[inset_0_1px_0_rgba(255,255,255,.04)] hover:border-white/20 hover:bg-white/[0.06]",
    variant === "ghost" && "text-muted hover:bg-white/[0.04] hover:text-fg",
    variant === "danger" && "border border-danger/30 bg-danger-dim text-danger hover:bg-danger/20",
    className,
  );
  const inner = (
    <>
      {variant === "primary" && (
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      )}
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </>
  );
  if (href?.startsWith("#") || href?.startsWith("http"))
    return (
      <a href={href} className={cls} onClick={rest.onClick} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
        {inner}
      </a>
    );
  if (href)
    return (
      <Link
        href={href}
        className={cls}
        onClick={(e) => {
          e.preventDefault();
          rest.onClick?.();
          go(href);
        }}
      >
        {inner}
      </Link>
    );
  return (
    <button type={rest.type ?? "button"} className={cls} onClick={rest.onClick} disabled={rest.disabled}>
      {inner}
    </button>
  );
}

/** Link that uses the curtain transition when crossing zones. */
export function TLink({ href, children, className, onClick }: { href: string; children: ReactNode; className?: string; onClick?: () => void }) {
  const go = useGo();
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
        go(href);
      }}
    >
      {children}
    </Link>
  );
}

/* ───────────────────────── Card w/ edge spotlight ───────────────────────── */

export function Card({ className, children, ...rest }: HTMLMotionProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        ref.current!.style.setProperty("--mx", `${e.clientX - r.left}px`);
        ref.current!.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cx("spot rounded-2xl border border-line bg-surface", className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ title, action, sub }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h3 className="text-[14px] font-semibold tracking-[-0.015em] text-fg">{title}</h3>
        {sub && <p className="mt-0.5 text-[12.5px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ───────────────────────── Reveal ───────────────────────── */

export function Reveal({ children, delay = 0, className, y = 18 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
export const rise = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
};

/* ───────────────────────── Number ticker ───────────────────────── */

export function Ticker({ value, decimals = 2, prefix = "", suffix = "", className }: { value: number; decimals?: number; prefix?: string; suffix?: string; className?: string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`);
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.4, ease: EASE });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span className={cx("num", className)}>{text}</motion.span>;
}

/* ───────────────────────── Badges ───────────────────────── */

const tone = {
  neutral: "bg-white/[0.04] text-muted border-line",
  accent: "bg-accent-dim text-accent border-accent/20",
  warn: "bg-warn-dim text-warn border-warn/20",
  danger: "bg-danger-dim text-danger border-danger/20",
  info: "bg-info-dim text-info border-info/20",
};
export type Tone = keyof typeof tone;

export function Badge({ children, t = "neutral", dot, className }: { children: ReactNode; t?: Tone; dot?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[11.5px] font-medium first-letter:uppercase", tone[t], className)}>
      {dot && <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current pulse-ring" />}
      {children}
    </span>
  );
}

export function ProvenanceTag({ p }: { p: Provenance }) {
  void p;
  return <Badge t="accent">On-chain</Badge>;
}

/* ───────────────────────── Agent avatar ───────────────────────── */

const roleIcon: Record<AgentRole, typeof Crown> = { ceo: Crown, research: Search, product: Cube, sales: ChartUp, finance: Vault };

export function AgentGlyph({ role, size = 36, active }: { role: AgentRole; size?: number; active?: boolean }) {
  const I = roleIcon[role];
  return (
    <span
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center rounded-[10px] border bg-gradient-to-b from-white/[0.07] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,.06)]",
        active ? "border-accent/30 text-accent" : "border-line-strong text-fg/80",
      )}
      style={{ width: size, height: size }}
    >
      <I size={size * 0.5} weight="duotone" />
      {active && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent text-accent ring-2 ring-surface pulse-ring" />}
    </span>
  );
}

/* ───────────────────────── Area chart ───────────────────────── */

export function AreaChart({ data, height = 160, className }: { data: number[]; height?: number; className?: string }) {
  const w = 600;
  const max = Math.max(...data) * 1.12 || 1;
  const min = Math.min(...data) * 0.9;
  const pts = data.map((d, i) => [(i / Math.max(1, data.length - 1)) * w, height - ((d - min) / (max - min || 1)) * height] as const);
  const line = pts
    .map((p, i) => {
      if (i === 0) return `M${p[0]},${p[1]}`;
      const [px, py] = pts[i - 1];
      const c = px + (p[0] - px) / 2;
      return `C${c},${py} ${c},${p[1]} ${p[0]},${p[1]}`;
    })
    .join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cx("w-full overflow-visible", className)} style={{ height }}>
      <defs>
        <linearGradient id="ag" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={w} y1={height * f} y2={height * f} stroke="var(--line)" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
      ))}
      <motion.path d={area} fill="url(#ag)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.6 }} />
      <motion.path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.75" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: EASE }} />
      <motion.circle cx={last[0]} cy={last[1]} r="4" fill="var(--accent)" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.5, type: "spring" }} />
    </svg>
  );
}

/* ───────────────────────── Meter ───────────────────────── */

export function Meter({ value, max, t = "accent" }: { value: number; max: number; t?: "accent" | "warn" | "danger" }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = t === "accent" ? "bg-accent" : t === "warn" ? "bg-warn" : "bg-danger";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <motion.div className={cx("h-full rounded-full", color)} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: EASE, delay: 0.2 }} />
    </div>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

export function ago(t: number) {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow?: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <motion.div variants={rise} className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.16em] text-faint">{eyebrow}</motion.div>}
        <motion.h1 variants={rise} className="text-[28px] font-semibold leading-tight tracking-[-0.022em] md:text-[34px]">{title}</motion.h1>
        {sub && <motion.p variants={rise} className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">{sub}</motion.p>}
      </div>
      {actions && <motion.div variants={rise} className="flex flex-wrap items-center gap-2">{actions}</motion.div>}
    </motion.div>
  );
}
