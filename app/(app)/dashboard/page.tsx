"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import { forCompany, useStore } from "@/lib/store";
import { chainLedger, companyNumbers, useChain } from "@/lib/near/client";
import { fromYocto } from "@/lib/near/config";
import { ROLES, isRole } from "@/lib/roles";
import { AgentGlyph, AreaChart, Badge, Button, Card, CardHeader, Meter, NearMark, PageHeader, Ticker, ago, rise, stagger } from "@/components/ui";
import { LedgerTable } from "@/components/ledger";

export default function Dashboard() {
  const { chain } = useChain();
  const companyId = useStore((s) => s.companyId);
  const activity = forCompany(useStore((s) => s.activity), companyId);
  const tasks = forCompany(useStore((s) => s.tasks), companyId);
  const working = useStore((s) => s.working);
  const c = chain?.company;
  const n = companyNumbers(chain);
  if (!c || !n) return null;

  // Running treasury balance from on-chain events, oldest → newest.
  const series = [...(chain?.ledger ?? [])]
    .sort((a, b) => a.index - b.index)
    .reduce<number[]>((acc, e) => {
      const prev = acc.at(-1) ?? 0;
      const amt = fromYocto(e.amount);
      const d = e.kind === "Deposit" || e.kind === "Revenue" ? amt : e.kind === "Payment" || e.kind === "Distribution" || e.kind === "Withdrawal" ? -amt : 0;
      return d === 0 ? acc : [...acc, prev + d];
    }, [0]);
  const capPct = n.spent / n.spendingCap;

  const kpis = [
    { label: "Treasury", value: n.balance, foot: `${n.deposits} deposit${n.deposits === 1 ? "" : "s"} · on-chain` },
    { label: "Revenue", value: n.revenue, foot: `${n.sales} verified sale${n.sales === 1 ? "" : "s"}`, accent: true },
    { label: "Agent payouts", value: n.spent, foot: `of ${n.spendingCap} NEAR cap` },
    { label: "Net", value: n.revenue - n.spent, foot: n.revenue - n.spent >= 0 ? "Operating profit" : "Investing in work" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Company overview"
        title={c.name}
        sub={c.mission}
        actions={
          <>
            <Badge t="accent" dot>Read from {chain?.contractId}</Badge>
            <Button href="/tasks" size="sm">
              Task market <ArrowRight size={13} />
            </Button>
          </>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <motion.div key={k.label} variants={rise}>
            <Card className="h-full p-5">
              <div className="text-[12.5px] text-muted">{k.label}</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <Ticker value={k.value} className={`text-[26px] font-medium md:text-[30px] ${k.accent ? "text-accent" : ""}`} />
                <NearMark size={16} className="text-faint" />
              </div>
              <div className="mt-2 text-[12px] text-faint">{k.foot}</div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7 }}>
          <CardHeader title="Treasury balance" sub="Running balance across on-chain ledger events" action={<Badge t="accent">{series.length - 1} events</Badge>} />
          <div className="px-5 pb-5 pt-6">
            <AreaChart data={series.length > 1 ? series : [0, 0]} height={190} />
          </div>
        </Card>

        <Card className="flex flex-col" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.7 }}>
          <CardHeader title="Policy health" sub="Limits enforced by the treasury contract" />
          <div className="flex flex-1 flex-col gap-5 p-5">
            <div>
              <div className="mb-2 flex justify-between text-[12.5px]">
                <span className="text-muted">Agent spend vs cap</span>
                <span className="num">{(capPct * 100).toFixed(0)}%</span>
              </div>
              <Meter value={n.spent} max={n.spendingCap} t={capPct > 0.85 ? "danger" : capPct > 0.6 ? "warn" : "accent"} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-[12.5px]">
              {[
                ["Per-payment limit", `${n.maxPayment} NEAR`],
                ["Minimum price", `${n.minimumPrice} NEAR`],
                ["Revenue retained", `${n.retainedPct}%`],
                ["Blocked attempts", String(n.rejected)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-raised/50 p-3">
                  <dt className="text-faint">{k}</dt>
                  <dd className="num mt-1 text-[15px] text-fg">{v}</dd>
                </div>
              ))}
            </dl>
            <Link href="/treasury" className="mt-auto inline-flex items-center gap-1 text-[12.5px] text-muted transition-colors hover:text-fg">
              Open treasury & security <ArrowUpRight size={13} />
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Workforce" sub={`${c.agents.length} agents registered in the contract`} action={<Button href="/agents" size="sm" variant="ghost">View all</Button>} />
          <div className="divide-y divide-line">
            {[{ role: "ceo", account: c.operator }, ...c.agents.filter((a) => a.role !== "ceo")].map((a, i) => {
              const role = isRole(a.role) ? a.role : "research";
              const busy = working[role];
              const open = tasks.filter((t) => t.role === role && !t.content).length;
              return (
                <motion.div key={a.account + role} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.05 }} className="flex items-center gap-3.5 px-5 py-3.5">
                  <AgentGlyph role={role} active={!!busy} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[13.5px]">
                      <span className="font-medium">{ROLES[role].name}</span>
                      <span className="text-faint">· {ROLES[role].title}</span>
                    </div>
                    <div className="truncate text-[12.5px] text-muted">{busy ?? <span className="num text-faint">{a.account}</span>}</div>
                  </div>
                  <span className="hidden text-[12px] text-faint sm:block">{open} open</span>
                  <Badge t={busy ? "accent" : "neutral"} dot={!!busy}>{busy ? "working" : "idle"}</Badge>
                </motion.div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Activity" sub="What the company did, newest first" />
          {activity.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-faint">Nothing yet. Ask the CEO for a plan in the Task market.</div>
          ) : (
            <ol className="relative px-5 py-4">
              <span className="absolute bottom-6 left-[27px] top-6 w-px bg-line" />
              {activity.slice(0, 7).map((e, i) => (
                <motion.li key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.06 }} className="relative flex gap-3 py-2.5">
                  <span className="relative z-10 mt-1 h-[9px] w-[9px] shrink-0 rounded-full border-2 border-surface bg-faint" style={i === 0 ? { background: "var(--accent)" } : undefined} />
                  <div>
                    <div className="text-[13px] leading-snug text-fg/90">{e.text}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-faint">
                      {isRole(e.role) ? ROLES[e.role].name : e.role} · {ago(e.at)}
                      {e.txUrl && <a href={e.txUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">tx</a>}
                    </div>
                  </div>
                </motion.li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="mt-3">
        <CardHeader title="Recent transactions" sub="From the contract ledger" action={<Button href="/treasury" size="sm" variant="ghost">Full ledger</Button>} />
        <LedgerTable entries={chainLedger(chain?.ledger)} limit={6} />
      </Card>
    </>
  );
}
