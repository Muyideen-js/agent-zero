"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { forCompany, useStore } from "@/lib/store";
import { ChainProvider, useChain } from "@/lib/near/client";
import { Badge, EASE } from "./ui";
import { Close, Menu } from "./icons";
import { CompanyGate } from "./empty";
import { NAV, Sidebar } from "./sidebar";

const nav = NAV.flatMap((g) => g.items);

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setH(true));
    if (useStore.persist.hasHydrated()) setH(true);
    return unsub;
  }, []);
  return h;
}

function Header({ onMenu }: { onMenu: () => void }) {
  const path = usePathname();
  const { chain } = useChain();
  const working = useStore((s) => s.working);
  const title = nav.find((n) => path.startsWith(n.href))?.label ?? "";
  const busy = Object.values(working).filter(Boolean).length;
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-bg/70 px-4 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3">
        <button className="text-muted lg:hidden" onClick={onMenu} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 text-[13px]">
          <span className="hidden text-faint sm:inline">{chain?.company?.name ?? "Agent Zero"}</span>
          <span className="hidden text-faint/60 sm:inline">/</span>
          <AnimatePresence mode="wait">
            <motion.span key={title} className="text-fg" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
              {title}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
      {chain?.company && (
        <div className="flex items-center gap-2">
          {busy > 0 && <Badge t="info" dot>{busy} agent{busy > 1 ? "s" : ""} working</Badge>}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={String(chain.company.paused)} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.25 }}>
              {chain.company.paused ? <Badge t="warn">Payments paused</Badge> : <Badge t="accent" dot>Live on testnet</Badge>}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </header>
  );
}

function Body({ children }: { children: ReactNode }) {
  const { chain, loading } = useChain();
  const companyId = useStore((s) => s.companyId);
  const mine = useStore((s) => s.myCompanies);
  const addMyCompany = useStore((s) => s.addMyCompany);

  // A company opened by ID joins "Your companies" once the contract confirms it exists.
  useEffect(() => {
    const c = chain?.company;
    if (c && chain?.companyId === companyId && !mine.some((m) => m.id === companyId)) addMyCompany({ id: companyId!, name: c.name });
  }, [chain, companyId, mine, addMyCompany]);

  if (!companyId) return <CompanyGate />;
  if (loading && !chain) return <ShellSkeleton />;
  if (chain && !chain.configured) return <CompanyGate reason="The treasury contract is not configured. Run scripts/setup-testnet.sh (see SETUP.md)." />;
  if (chain?.error && !chain.company) return <CompanyGate reason={`Could not reach the contract: ${chain.error}`} />;
  if (chain && !chain.company) return <CompanyGate reason={`No company "${companyId}" exists in ${chain.contractId}.`} />;
  return <>{children}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const companyId = useStore((s) => s.companyId);
  const tasks = useStore((s) => s.tasks);
  const taskIds = useMemo(() => forCompany(tasks, companyId).map((t) => t.id), [tasks, companyId]);
  const [open, setOpen] = useState(false);

  return (
    <ChainProvider companyId={hydrated ? companyId : null} taskIds={taskIds}>
      <div className="min-h-dvh bg-bg">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-line bg-surface/40 lg:block">
          <Sidebar />
        </aside>

        <AnimatePresence>
          {open && (
            <>
              <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
              <motion.aside className="fixed inset-y-0 left-0 z-50 w-[272px] border-r border-line bg-surface lg:hidden" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ duration: 0.45, ease: EASE }}>
                <button className="absolute right-3 top-4 text-muted" onClick={() => setOpen(false)} aria-label="Close menu">
                  <Close size={18} />
                </button>
                <Sidebar onNavigate={() => setOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="lg:pl-[248px]">
          <Header onMenu={() => setOpen(true)} />
          <main className="mx-auto w-full max-w-[1240px] px-4 py-8 md:px-8 md:py-10">{hydrated ? <Body>{children}</Body> : <ShellSkeleton />}</main>
        </div>
      </div>
    </ChainProvider>
  );
}

function ShellSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-64 rounded-lg bg-white/[0.04] shimmer" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-line bg-surface shimmer" />
        ))}
      </div>
      <div className="h-80 rounded-2xl border border-line bg-surface shimmer" />
    </div>
  );
}
