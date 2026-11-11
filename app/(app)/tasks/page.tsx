"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { ArrowUpRight, Check, Close, Crown, Download, Eye, FileText, Lightning, Play, Spinner } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { PaymentSheet, type SheetState } from "@/components/payment-sheet";
import { AgentGlyph, Amt, Badge, Button, Card, PageHeader, cx } from "@/components/ui";
import { downloadText, runAutopilot, runCEO, runTask, useAIStatus } from "@/lib/ai/client";
import { approveOnChain, checksFromOutcome, payOnChain, useChain } from "@/lib/near/client";
import { ROLES } from "@/lib/roles";
import { forCompany, useStore } from "@/lib/store";
import type { ChainTaskStatus, WorkTask } from "@/lib/types";

type Stage = "registering" | "assigned" | "delivered" | "approved" | "paid" | "cancelled";

const columns: { key: Stage[]; label: string; hint: string }[] = [
  { key: ["registering", "assigned"], label: "Assigned", hint: "On-chain, waiting for the agent" },
  { key: ["delivered"], label: "Delivered", hint: "Work done, needs approval" },
  { key: ["approved"], label: "Approved", hint: "Ready for payout" },
  { key: ["paid", "cancelled"], label: "Paid", hint: "Settled by the contract" },
];

function stageOf(t: WorkTask, status: ChainTaskStatus): Stage {
  if (status === "Paid") return "paid";
  if (status === "Cancelled") return "cancelled";
  if (status === "Approved") return "approved";
  if (status === "missing") return "registering";
  return t.content ? "delivered" : "assigned";
}

export default function Tasks() {
  const { chain, refresh } = useChain();
  const companyId = useStore((s) => s.companyId);
  const tasks = forCompany(useStore((s) => s.tasks), companyId);
  const log = useStore((s) => s.log);
  const ai = useAIStatus();
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [view, setView] = useState<WorkTask | null>(null);
  if (!chain?.company || !companyId) return null;

  const status = (id: string): ChainTaskStatus => (chain.tasks?.[id]?.status as ChainTaskStatus) ?? "missing";
  const canApprove = chain.company.policy.operator_can_approve;

  const guard = async (label: string, fn: () => Promise<void>, needsAI = true) => {
    if (needsAI && ai && !ai.configured) {
      setError("AI agents need a model key. Add AI_API_KEY to .env.local and restart (see SETUP.md).");
      return;
    }
    setError(null);
    setRunning(label);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(null);
    }
  };

  const plan = () => guard("ceo", () => runCEO(chain));
  const autopilot = () => guard("autopilot", () => runAutopilot(chain, (s) => setRunning(`autopilot:${s}`)));
  const run = (t: WorkTask) => guard(t.id, () => runTask(chain, t.id));
  const approve = (t: WorkTask) =>
    guard(`approve:${t.id}`, async () => {
      const r = await approveOnChain(companyId, t.id);
      log(companyId, "ceo", `Approved ${t.id} on-chain`, r.explorerUrl);
    }, false);
  const pay = (t: WorkTask) =>
    guard(`pay:${t.id}`, async () => {
      const r = await payOnChain(companyId, t.id, t.budget);
      log(companyId, t.role, r.ok ? `${ROLES[t.role].name} was paid ${t.budget} NEAR for ${t.id}` : `Payout for ${t.id} rejected: ${r.failed_check}`, r.explorerUrl);
      setSheet({ title: `${t.id} · ${t.title}`, amount: t.budget, recipient: t.agent, checks: checksFromOutcome(r), ok: r.ok, txUrl: r.explorerUrl });
    }, false);

  const budget = tasks.reduce((s, t) => s + t.budget, 0);

  return (
    <>
      <PageHeader
        eyebrow="Task market"
        title="Work, approvals and payouts"
        sub="The CEO plans tasks and registers them in the treasury contract. Agents do the work. Approval and payment are on-chain transactions the contract checks against your policy."
        actions={
          <>
            {ai?.configured ? <Badge t="info">AI · {ai.model}</Badge> : ai ? <Badge t="warn">AI not connected</Badge> : null}
            <Button size="sm" onClick={plan} disabled={!!running}>
              <Crown size={13} weight="duotone" /> {running === "ceo" ? "CEO is planning…" : "Ask the CEO for a plan"}
            </Button>
            <Button size="sm" variant="primary" onClick={autopilot} disabled={!!running}>
              <Lightning size={13} weight="fill" /> Run autopilot
            </Button>
          </>
        }
      />

      <AnimatePresence>
        {running?.startsWith("autopilot") && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 flex items-center gap-2.5 rounded-xl border border-accent/25 bg-accent-dim px-4 py-3 text-[13px] text-accent">
            <Spinner size={14} className="animate-spin" /> Autopilot · {running.replace("autopilot:", "") || "starting"}
          </motion.div>
        )}
      </AnimatePresence>
      {error && <div className="num mb-4 break-all rounded-xl border border-danger/25 bg-danger-dim p-3 text-[12.5px] text-danger">{error}</div>}
      {!canApprove && <div className="mb-4 rounded-xl border border-info/25 bg-info-dim p-3 text-[12.5px] text-info">This company&apos;s policy does not let the operator approve tasks. Approvals must be signed by the owner.</div>}

      {tasks.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-16 text-center">
          <AgentGlyph role="ceo" size={52} active={!!running} />
          <h3 className="mt-5 text-[18px] font-semibold">No work planned yet</h3>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">
            Atlas will read the mission and policy from the contract, plan the work, and register every task on-chain against the right agent.
          </p>
          <div className="mt-6 flex gap-2">
            <Button onClick={plan} disabled={!!running}><Crown size={13} weight="duotone" /> Plan only</Button>
            <Button variant="primary" onClick={autopilot} disabled={!!running}><Lightning size={13} weight="fill" /> Plan and do the work</Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2 text-[12px] text-faint">
            <span>{tasks.length} tasks</span>·<Amt v={budget} /> budgeted ·<span>{tasks.filter((t) => status(t.id) === "Paid").length} paid on-chain</span>
          </div>
          <LayoutGroup>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {columns.map((col, ci) => {
                const items = tasks.filter((t) => col.key.includes(stageOf(t, status(t.id))));
                return (
                  <motion.div key={col.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.07, duration: 0.6 }} className="flex flex-col rounded-2xl border border-line bg-surface/50 p-2">
                    <div className="px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium">{col.label}</span>
                        <span className="num text-[12px] text-faint">{items.length}</span>
                      </div>
                      <div className="text-[11.5px] text-faint">{col.hint}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {items.map((t) => {
                        const stage = stageOf(t, status(t.id));
                        const p = ROLES[t.role];
                        return (
                          <motion.div layout layoutId={t.id} key={t.id} transition={{ type: "spring", stiffness: 350, damping: 34 }}>
                            <Card className="p-4">
                              <div className="flex items-center justify-between">
                                <span className="num text-[11.5px] text-faint">{t.id}</span>
                                <Amt v={t.budget} className="text-[12.5px]" />
                              </div>
                              <div className="mt-2 text-[13.5px] font-medium leading-snug">{t.title}</div>
                              <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{t.description}</p>

                              {t.summary && (
                                <button onClick={() => setView(t)} className="mt-3 flex w-full items-center gap-2 rounded-lg border border-line bg-raised px-2.5 py-2 text-left text-[12px] text-fg/85 transition-colors hover:border-line-strong">
                                  <FileText size={13} className="text-muted" />
                                  <span className="truncate">{t.summary}</span>
                                  <Eye size={13} className="ml-auto shrink-0 text-faint" />
                                </button>
                              )}

                              <div className="mt-4 flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2 text-[12px] text-muted">
                                  <AgentGlyph role={t.role} size={22} /> {p.name}
                                </span>
                                {t.createTx ? (
                                  <a href={t.createTx} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-faint hover:text-fg">on-chain <ArrowUpRight size={10} /></a>
                                ) : null}
                              </div>

                              {stage === "registering" && <div className="mt-3 flex items-center gap-2 text-[12px] text-faint"><Spinner size={12} className="animate-spin" /> Waiting for the contract…</div>}
                              {stage === "assigned" && (
                                <Button size="sm" className="mt-3 w-full" onClick={() => run(t)} disabled={!!running}>
                                  {running === t.id ? <><Spinner size={13} className="animate-spin" /> {p.name} is working…</> : <><Play size={12} weight="fill" /> Run {p.name}</>}
                                </Button>
                              )}
                              {stage === "delivered" && (
                                <Button size="sm" className="mt-3 w-full" onClick={() => approve(t)} disabled={!!running || !canApprove}>
                                  {running === `approve:${t.id}` ? <><Spinner size={13} className="animate-spin" /> Approving on-chain…</> : <><Check size={13} weight="bold" /> Approve on-chain</>}
                                </Button>
                              )}
                              {stage === "approved" && (
                                <Button size="sm" variant="primary" className="mt-3 w-full" onClick={() => pay(t)} disabled={!!running}>
                                  {running === `pay:${t.id}` ? <><Spinner size={13} className="animate-spin" /> Sending to contract…</> : <>Request payout</>}
                                </Button>
                              )}
                              {stage === "paid" && <div className={cx("mt-3 flex items-center gap-1.5 text-[12px] text-accent")}><Check size={13} weight="bold" /> Paid by the contract</div>}
                            </Card>
                          </motion.div>
                        );
                      })}
                      {items.length === 0 && <div className="rounded-xl border border-dashed border-line px-3 py-8 text-center text-[12.5px] text-faint">Nothing here</div>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </LayoutGroup>
        </>
      )}

      <PaymentSheet state={sheet} onClose={() => setSheet(null)} />

      <AnimatePresence>
        {view && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setView(null)} />
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-3">
              <motion.div
                className="pointer-events-auto flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-black/70"
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <div className="min-w-0">
                    <div className="text-[11.5px] uppercase tracking-[0.14em] text-faint">{view.id} · {ROLES[view.role].name} · {view.model}</div>
                    <div className="truncate text-[15px] font-semibold">{view.title}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" onClick={() => downloadText(`${view.id}.md`, view.content ?? "")}><Download size={13} /> .md</Button>
                    <button onClick={() => setView(null)} className="rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-fg" aria-label="Close"><Close size={16} /></button>
                  </div>
                </div>
                <div className="overflow-y-auto px-6 py-5">
                  <div className="mb-4 rounded-lg border border-warn/20 bg-warn-dim px-3 py-2 text-[12px] text-warn">AI-generated. Sources and estimates are not independently verified.</div>
                  <Markdown text={view.content ?? ""} />
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
