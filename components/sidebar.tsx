"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { forCompany, useStore } from "@/lib/store";
import { companyNumbers, useChain } from "@/lib/near/client";
import { CONTRACT_ID, accountUrl } from "@/lib/near/config";
import { CompanyAvatar } from "./brand";
import { ArrowUpRight, CaretDown, Check, Grid, ListChecks, Plus, Robot, ShieldCheck, Store } from "./icons";
import { Logo, TLink, cx } from "./ui";

export const NAV = [
  { group: "Operate", items: [
    { href: "/dashboard", label: "Overview", icon: Grid, key: "1" },
    { href: "/tasks", label: "Task market", icon: ListChecks, key: "2" },
  ] },
  { group: "Company", items: [
    { href: "/agents", label: "Workforce", icon: Robot, key: "3" },
    { href: "/products", label: "Products", icon: Store, key: "4" },
  ] },
  { group: "Money", items: [
    { href: "/treasury", label: "Treasury & security", icon: ShieldCheck, key: "5" },
  ] },
];
const FLAT = NAV.flatMap((g) => g.items);

/** Press 1–5 to jump between pages (ignored while typing). */
function useShortcuts() {
  const router = useRouter();
  useEffect(() => {
    FLAT.forEach((i) => router.prefetch(i.href));
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, [contenteditable]")) return;
      const hit = FLAT.find((i) => i.key === e.key);
      if (hit) router.push(hit.href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
}

function CompanySwitcher() {
  const { chain } = useChain();
  const companyId = useStore((s) => s.companyId);
  const mine = useStore((s) => s.myCompanies);
  const setCompany = useStore((s) => s.setCompany);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const c = chain?.company;

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!c) return <div className="mx-3 mb-4 h-[52px] rounded-xl border border-line shimmer" />;
  const others = mine.filter((m) => m.id !== companyId);

  return (
    <div ref={ref} className="relative mx-3 mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cx("flex w-full items-center gap-2.5 rounded-xl border bg-raised px-2.5 py-2 text-left transition-colors", open ? "border-line-strong" : "border-line hover:border-line-strong")}
      >
        <CompanyAvatar name={c.name} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">{c.name}</div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-faint">
            <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", c.paused ? "bg-warn" : "bg-accent")} />
            <span className="num truncate">{companyId}</span>
          </div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-faint">
          <CaretDown size={13} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-line-strong bg-overlay p-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,.8)]"
          >
            <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-faint">Companies</div>
            <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]">
              <CompanyAvatar name={c.name} size={22} />
              <span className="flex-1 truncate">{c.name}</span>
              <Check size={13} weight="bold" className="text-accent" />
            </div>
            {others.map((m) => (
              <button key={m.id} onClick={() => { setCompany(m.id); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-muted hover:bg-white/[0.05] hover:text-fg">
                <CompanyAvatar name={m.name} size={22} />
                <span className="flex-1 truncate">{m.name}</span>
              </button>
            ))}
            <div className="my-1 h-px bg-line" />
            <TLink href="/launch" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted hover:bg-white/[0.05] hover:text-fg">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md border border-dashed border-line-strong"><Plus size={11} /></span>
              Create company
            </TLink>
            <button onClick={() => { setCompany(null); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-muted hover:bg-white/[0.05] hover:text-fg">
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md border border-line-strong text-[10px]">#</span>
              Open by ID…
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  useShortcuts();
  const path = usePathname();
  const { chain } = useChain();
  const companyId = useStore((s) => s.companyId);
  const tasks = forCompany(useStore((s) => s.tasks), companyId);
  const products = forCompany(useStore((s) => s.products), companyId);
  const working = useStore((s) => s.working);
  const n = companyNumbers(chain);
  const openTasks = tasks.filter((t) => chain?.tasks?.[t.id]?.status !== "Paid").length;
  const busy = Object.keys(working).length;

  const badge: Record<string, React.ReactNode> = {
    "/tasks": openTasks ? <span className="num text-[11px] text-faint">{openTasks}</span> : null,
    "/agents": busy ? <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" /> : null,
    "/products": products.length ? <span className="num text-[11px] text-faint">{products.length}</span> : null,
    "/treasury": chain?.company?.paused ? <span className="rounded bg-warn-dim px-1.5 text-[10px] font-medium text-warn">PAUSED</span> : n?.rejected ? <span className="num text-[11px] text-danger/80">{n.rejected}</span> : null,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-5">
        <TLink href="/" className="text-fg">
          <Logo size={22} />
        </TLink>
      </div>

      {companyId && <CompanySwitcher />}

      <nav className="flex flex-col gap-4 px-3">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="px-2.5 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-faint/80">{g.group}</div>
            <div className="flex flex-col gap-px">
              {g.items.map((item) => {
                const active = path.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    onClick={onNavigate}
                    className={cx("group relative flex h-[34px] items-center gap-2.5 rounded-lg pl-3 pr-2.5 text-[13.5px] transition-colors duration-150", active ? "bg-white/[0.045] text-fg" : "text-muted hover:bg-white/[0.025] hover:text-fg")}
                  >
                    {active && <motion.span layoutId="nav-bar" className="absolute left-0 top-[9px] h-4 w-[2px] rounded-full bg-accent" transition={{ type: "spring", stiffness: 600, damping: 40 }} />}
                    <item.icon size={16} weight={active ? "fill" : "regular"} className={cx("shrink-0 transition-colors", active ? "text-accent" : "text-faint group-hover:text-muted")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge[item.href] ?? <kbd className="num hidden h-[18px] min-w-[18px] items-center justify-center rounded border border-line px-1 text-[10px] text-faint opacity-0 transition-opacity group-hover:opacity-100 lg:inline-flex">{item.key}</kbd>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto p-3">
        <div className="rounded-xl border border-line bg-raised/60 p-3 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted">
              <span className={cx("relative inline-flex h-1.5 w-1.5 rounded-full", chain?.company ? "bg-accent text-accent pulse-ring" : "bg-faint")} />
              {chain?.company ? "Connected" : "Not connected"}
            </span>
            <span className="num text-faint">testnet</span>
          </div>
          {CONTRACT_ID && (
            <a href={accountUrl(CONTRACT_ID)} target="_blank" rel="noreferrer" className="num mt-2 flex items-center gap-1 truncate text-[11.5px] text-faint transition-colors hover:text-fg">
              <span className="truncate">{CONTRACT_ID}</span>
              <ArrowUpRight size={10} className="shrink-0" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
