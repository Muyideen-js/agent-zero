"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Check, Copy, Minus, Siren, Lightning as Zap } from "@/components/icons";
import { LedgerTable } from "@/components/ledger";
import { PaymentSheet, type SheetState } from "@/components/payment-sheet";
import { AgentGlyph, Badge, Button, Card, CardHeader, EASE, PageHeader, Ticker, cx } from "@/components/ui";
import { chainLedger, checksFromOutcome, companyNumbers, ownerAction, ownerCommand, payOnChain, useChain, useOwnerSigner } from "@/lib/near/client";
import { accountUrl, toYocto } from "@/lib/near/config";
import { ROLES, isRole } from "@/lib/roles";
import { forCompany, useStore } from "@/lib/store";
import type { TxType } from "@/lib/types";

const filters: { key: "all" | TxType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "deposit", label: "Deposits" },
  { key: "payment", label: "Payments" },
  { key: "revenue", label: "Revenue" },
  { key: "rejected", label: "Rejected" },
];

const matrix = ["plan.create", "task.assign", "research.write", "doc.write", "listing.write", "payment.request", "report.write", "treasury.transfer"];

export default function Treasury() {
  const { chain, refresh } = useChain();
  const companyId = useStore((s) => s.companyId);
  const tasks = forCompany(useStore((s) => s.tasks), companyId);
  const log = useStore((s) => s.log);
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("all");
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const signer = useOwnerSigner();
  const [ownerBusy, setOwnerBusy] = useState<string | null>(null);
  const c = chain?.company;
  const n = companyNumbers(chain);
  if (!c || !n || !companyId) return null;

  const ledger = chainLedger(chain?.ledger);
  const rows = filter === "all" ? ledger : ledger.filter((l) => l.type === filter);
  const sales = c.agents.find((a) => a.role === "sales");
  const attackAmount = Math.round((n.maxPayment + 2) * 100) / 100;

  const copy = async (cmd: string, label: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setNote(`${label} copied. Run it in your terminal: only the owner's key can do this.`);
    } catch {
      setNote(cmd);
    }
  };

  const isOwner = Boolean(signer?.enabled && signer.owner === c.owner);
  /** Runs an owner action with the local signer when this machine holds the owner key, else copies the CLI command. */
  const ownerDo = async (method: string, args: Record<string, unknown>, deposit: number, label: string) => {
    if (!isOwner) return copy(ownerCommand(chain, method, args, `${deposit} NEAR`), `${label} command`);
    setOwnerBusy(method);
    setNote(null);
    try {
      const r = await ownerAction(companyId, method, args, deposit);
      log(companyId, "owner", `Owner signed ${method}`, r.explorerUrl);
      setNote(`${label} confirmed on-chain.`);
      await refresh();
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setOwnerBusy(null);
    }
  };

  const attack = async () => {
    // Use a task the Sales agent legitimately holds, so the only thing wrong is the amount.
    const own = tasks.find((t) => t.agent === sales?.account && ["Approved", "Paid"].includes(chain?.tasks?.[t.id]?.status ?? ""));
    const taskId = own?.id ?? "T-100";
    setBusy(true);
    setNote(null);
    try {
      const r = await payOnChain(companyId, taskId, attackAmount);
      log(companyId, "sales", `Halcyon tried to pay itself ${attackAmount} NEAR: ${r.ok ? "paid" : `rejected (${r.failed_check})`}`, r.explorerUrl);
      setSheet({ title: "Sales agent → self-transfer", amount: attackAmount, recipient: sales?.account ?? "sales agent", checks: checksFromOutcome(r), ok: r.ok, txUrl: r.explorerUrl });
      refresh();
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Treasury & security" title="The money, and the rules around it" sub="Everything on this page is read from the treasury contract. Agents can only request payouts; the contract checks each request against the owner's policy." />

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-6 lg:col-span-2">
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted">Available balance</span>
              <Badge t="accent" dot>Live from contract</Badge>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <Ticker value={n.balance} className="text-[52px] font-medium leading-none tracking-[-0.02em] md:text-[64px]" />
              <span className="text-[20px] text-faint">NEAR</span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-[12.5px]">
              {[
                ["Treasury contract", chain?.contractId ?? ""],
                ["Owner", c.owner],
                ["Operator", c.operator],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <div className="text-faint">{k}</div>
                  <a href={accountUrl(v)} target="_blank" rel="noreferrer" className="num mt-1 block truncate text-fg/90 underline decoration-line-strong underline-offset-4 hover:decoration-fg">{v}</a>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" disabled={!!ownerBusy} onClick={() => ownerDo("deposit", {}, 1, "Deposit of 1 NEAR")}>{isOwner ? (ownerBusy === "deposit" ? "Depositing…" : "Deposit 1 NEAR") : <><Copy size={13} /> Copy deposit command</>}</Button>
              {isOwner && <span className="self-center text-[12px] text-faint">Signed by your local owner key</span>}
            </div>
          </div>
        </Card>

        <Card className={cx("relative overflow-hidden p-6 transition-colors duration-500", c.paused && "border-warn/30")}>
          <AnimatePresence>
            {c.paused && <motion.div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(245,176,65,0.06)_0_12px,transparent_12px_24px)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
          </AnimatePresence>
          <div className="relative flex h-full flex-col">
            <div className="flex items-center gap-2 text-[13px] text-muted">
              <Siren size={15} /> Emergency control
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={String(c.paused)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE }} className="mt-4">
                <div className="text-[20px] font-semibold tracking-[-0.015em]">{c.paused ? "All payments halted" : "Payments flowing"}</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  {c.paused ? "Every outgoing payment fails the contract's pause check until the owner resumes." : "Pausing makes the contract reject every outgoing payment, whoever requests it."}
                </p>
              </motion.div>
            </AnimatePresence>
            <Button variant={c.paused ? "primary" : "danger"} size="lg" className="mt-auto w-full" disabled={!!ownerBusy} onClick={() => ownerDo(c.paused ? "resume_company" : "pause_company", {}, 0, c.paused ? "Resume" : "Pause")}>
              {isOwner ? (ownerBusy ? "Signing…" : c.paused ? "Resume company" : "Pause all payments") : <><Copy size={15} /> {c.paused ? "Copy owner resume command" : "Copy owner pause command"}</>}
            </Button>
          </div>
        </Card>
      </div>

      {note && <div className="num mt-3 break-all rounded-xl border border-info/25 bg-info-dim p-3 text-[12px] text-info">{note}</div>}

      <div className="mt-3 grid gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Financial policy" sub="Read from the contract. Only the owner can call set_policy." />
          <dl className="grid grid-cols-2 gap-3 p-5 text-[12.5px]">
            {[
              ["Max individual payment", `${n.maxPayment} NEAR`],
              ["Total agent spending cap", `${n.spendingCap} NEAR`],
              ["Minimum selling price", `${n.minimumPrice} NEAR`],
              ["Revenue retained", `${n.retainedPct}%`],
              ["Spent so far", `${n.spent} NEAR`],
              ["Operator can approve", n.operatorCanApprove ? "Yes" : "No"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line bg-raised/50 p-3">
                <dt className="text-faint">{k}</dt>
                <dd className="num mt-1 text-[15px] text-fg">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="px-5 pb-5">
            <Button
              size="sm"
              onClick={() =>
                copy(
                  ownerCommand(chain, "set_policy", {
                    policy: { max_payment: toYocto(n.maxPayment), spending_cap: toYocto(n.spendingCap), minimum_price: toYocto(n.minimumPrice), retained_bps: n.retainedPct * 100, operator_can_approve: n.operatorCanApprove },
                  }),
                  "set_policy command (edit the values first)",
                )
              }
            >
              <Copy size={13} /> Copy set_policy command
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader
            title="Security test"
            sub="Make an agent try to break the rules, for real"
            action={<Button size="sm" variant="danger" onClick={attack} disabled={busy}><Zap size={13} /> {busy ? "Sending to contract…" : "Run attack on-chain"}</Button>}
          />
          <div className="p-5">
            <div className="rounded-xl border border-line bg-raised/60 p-4 text-[13px] leading-relaxed text-muted">
              <span className="text-fg">Scenario:</span> the Sales agent asks the treasury to pay it <span className="num text-fg">{attackAmount} NEAR</span>. Policy allows <span className="num text-fg">{n.maxPayment} NEAR</span> per payment. This sends a real transaction; the contract rejects it and records the attempt.
            </div>
            <h4 className="mb-2 mt-6 text-[12px] font-medium uppercase tracking-[0.1em] text-faint">Permission matrix</h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[12px]">
                <thead>
                  <tr>
                    <th />
                    {(["ceo", "research", "product", "sales", "finance"] as const).map((r) => (
                      <th key={r} className="px-1 pb-2 font-normal">
                        <div className="flex flex-col items-center gap-1 text-faint">
                          <AgentGlyph role={r} size={24} />
                          {ROLES[r].name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((perm, ri) => (
                    <motion.tr key={perm} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + ri * 0.04 }} className="border-t border-line">
                      <td className={cx("num py-2 pr-3", perm === "treasury.transfer" ? "text-danger" : "text-muted")}>{perm}</td>
                      {(["ceo", "research", "product", "sales", "finance"] as const).map((r) => (
                        <td key={r} className="py-2 text-center">
                          {isRole(r) && ROLES[r].tools.includes(perm) ? <Check size={14} className="mx-auto text-accent" /> : <Minus size={14} className="mx-auto text-faint/60" />}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h3 className="text-[13.5px] font-medium">On-chain ledger</h3>
          <div className="flex gap-0.5 rounded-lg border border-line bg-raised/50 p-0.5">
            {filters.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={cx("relative rounded-md px-3 py-1.5 text-[12.5px] transition-colors", filter === f.key ? "text-fg" : "text-faint hover:text-muted")}>
                {filter === f.key && <motion.span layoutId="ledger-filter" className="absolute inset-0 rounded-md bg-white/[0.07]" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <span className="relative">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
        <LedgerTable entries={rows} />
      </Card>

      <PaymentSheet state={sheet} onClose={() => setSheet(null)} />
    </>
  );
}
