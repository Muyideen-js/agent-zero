"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Check, Close as X, Lock } from "@/components/icons";
import { forCompany, useStore } from "@/lib/store";
import { useChain } from "@/lib/near/client";
import { accountUrl, fromYocto } from "@/lib/near/config";
import { ROLES, isRole } from "@/lib/roles";
import type { AgentRole } from "@/lib/types";
import { AgentGlyph, Amt, Badge, Card, EASE, PageHeader, ago, cx, rise, stagger } from "@/components/ui";

export default function Agents() {
  const { chain } = useChain();
  const companyId = useStore((s) => s.companyId);
  const tasks = forCompany(useStore((s) => s.tasks), companyId);
  const activity = forCompany(useStore((s) => s.activity), companyId);
  const working = useStore((s) => s.working);
  const [open, setOpen] = useState<AgentRole | null>(null);
  const c = chain?.company;
  if (!c) return null;

  // The CEO acts through the operator account; the other four are registered payees.
  const crew: { role: AgentRole; account: string; registered: boolean }[] = [
    { role: "ceo", account: c.operator, registered: false },
    ...c.agents.filter((a) => isRole(a.role) && a.role !== "ceo").map((a) => ({ role: a.role as AgentRole, account: a.account, registered: true })),
  ];
  const earned = (account: string) => (chain?.ledger ?? []).filter((e) => (e.kind === "Payment" || e.kind === "Distribution") && e.counterparty === account).reduce((s, e) => s + fromYocto(e.amount), 0);
  const sel = crew.find((a) => a.role === open);

  return (
    <>
      <PageHeader eyebrow="Workforce" title="Five agents. Scoped tools. No keys." sub="Agent accounts are registered in the treasury contract. None of them can move company funds: the operator requests, the contract decides." />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {crew.map((a) => {
          const p = ROLES[a.role];
          const delivered = tasks.filter((t) => t.role === a.role && t.content).length;
          const busy = working[a.role];
          return (
            <motion.div key={a.role} variants={rise}>
              <motion.div layoutId={`agent-${a.role}`} onClick={() => setOpen(a.role)} className="cursor-pointer" whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                <Card className="h-full p-5 transition-colors hover:border-line-strong">
                  <div className="flex items-start justify-between">
                    <motion.div layoutId={`glyph-${a.role}`}>
                      <AgentGlyph role={a.role} size={44} active={!!busy} />
                    </motion.div>
                    <Badge t={busy ? "accent" : "neutral"} dot={!!busy}>{busy ? "working" : "idle"}</Badge>
                  </div>
                  <motion.div layoutId={`name-${a.role}`} className="mt-5">
                    <div className="text-[17px] font-semibold tracking-[-0.015em]">{p.name}</div>
                    <div className="text-[12.5px] text-faint">{p.title}{a.role === "ceo" ? " · acts via operator" : " · registered payee"}</div>
                  </motion.div>
                  <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted">{busy ?? p.description}</p>
                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-[12px]">
                    <div>
                      <div className="text-faint">Delivered</div>
                      <div className="num mt-0.5 text-[14px]">{delivered}</div>
                    </div>
                    <div>
                      <div className="text-faint">Earned</div>
                      <Amt v={a.registered ? earned(a.account) : 0} className="mt-0.5 text-[14px]" />
                    </div>
                    <div>
                      <div className="text-faint">Tools</div>
                      <div className="num mt-0.5 text-[14px]">{p.tools.length}</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {sel && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)} />
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div layoutId={`agent-${sel.role}`} className="pointer-events-auto max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-black/60" transition={{ duration: 0.5, ease: EASE }}>
                <div className="flex items-start justify-between border-b border-line p-6">
                  <div className="flex items-center gap-4">
                    <motion.div layoutId={`glyph-${sel.role}`}>
                      <AgentGlyph role={sel.role} size={52} active={!!working[sel.role]} />
                    </motion.div>
                    <motion.div layoutId={`name-${sel.role}`}>
                      <div className="text-[20px] font-semibold tracking-[-0.015em]">{ROLES[sel.role].name}</div>
                      <a href={accountUrl(sel.account)} target="_blank" rel="noreferrer" className="num text-[12.5px] text-faint hover:text-fg">{sel.account}</a>
                    </motion.div>
                  </div>
                  <button onClick={() => setOpen(null)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-fg" aria-label="Close">
                    <X size={18} />
                  </button>
                </div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.15, duration: 0.4 }} className="space-y-6 p-6">
                  <p className="text-[14px] leading-relaxed text-muted">{ROLES[sel.role].description}</p>

                  <section>
                    <h4 className="mb-2.5 text-[12px] font-medium uppercase tracking-[0.1em] text-faint">Tools</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {ROLES[sel.role].tools.map((p) => (
                        <span key={p} className="num inline-flex items-center gap-1.5 rounded-md border border-line bg-raised px-2 py-1 text-[12px] text-fg/90">
                          <Check size={11} className="text-accent" /> {p}
                        </span>
                      ))}
                      <span className="num inline-flex items-center gap-1.5 rounded-md border border-danger/20 bg-danger-dim px-2 py-1 text-[12px] text-danger">
                        <Lock size={11} /> treasury.transfer
                      </span>
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-2.5 text-[12px] font-medium uppercase tracking-[0.1em] text-faint">Work</h4>
                    <div className="divide-y divide-line rounded-xl border border-line">
                      {tasks.filter((t) => t.role === sel.role).map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
                          <div className="min-w-0 truncate">
                            <span className="num mr-2 text-faint">{t.id}</span>
                            {t.title}
                          </div>
                          <Badge t={t.content ? "accent" : "neutral"}>{t.content ? "delivered" : "assigned"}</Badge>
                        </div>
                      ))}
                      {!tasks.some((t) => t.role === sel.role) && <div className="px-4 py-6 text-center text-[13px] text-faint">No assignments yet</div>}
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-2.5 text-[12px] font-medium uppercase tracking-[0.1em] text-faint">Recent activity</h4>
                    <ul className="space-y-2">
                      {activity.filter((e) => e.role === sel.role).slice(0, 6).map((e) => (
                        <li key={e.id} className={cx("flex justify-between gap-4 text-[13px]")}>
                          <span className="text-fg/90">{e.text}</span>
                          <span className="shrink-0 text-faint">{ago(e.at)}</span>
                        </li>
                      ))}
                      {!activity.some((e) => e.role === sel.role) && <li className="text-[13px] text-faint">Nothing yet</li>}
                    </ul>
                  </section>
                </motion.div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
