"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LedgerEntry } from "../types";
import { fromYocto } from "./config";
import type { ChainEvent, ChainState, PaymentResult } from "./types";

export interface Check {
  rule: string;
  passed: boolean;
  detail: string;
}

/* ───────────── Shared chain state ───────────── */

interface ChainCtx {
  chain: ChainState | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<ChainCtx>({ chain: null, loading: true, refresh: async () => {} });

/** Polls /api/near/state for one company (and the given task ids) and shares it with the app. */
export function ChainProvider({ companyId, taskIds, children }: { companyId: string | null; taskIds: string[]; children: ReactNode }) {
  const [chain, setChain] = useState<ChainState | null>(null);
  const [loading, setLoading] = useState(true);
  const tasksKey = taskIds.join(",");

  const refresh = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`/api/near/state?company=${encodeURIComponent(companyId)}&tasks=${encodeURIComponent(tasksKey)}`, { cache: "no-store" });
      setChain(await r.json());
    } catch {
      setChain((c) => ({ ...(c ?? { configured: true }), error: "Network error reaching NEAR RPC" }));
    } finally {
      setLoading(false);
    }
  }, [companyId, tasksKey]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  const value = useMemo(() => ({ chain, loading, refresh }), [chain, loading, refresh]);
  return createElement(Ctx.Provider, { value }, children);
}

export const useChain = () => useContext(Ctx);

/* ───────────── Operator actions ───────────── */

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`);
  return j as T;
}

export const payOnChain = (companyId: string, taskId: string, amount: number) => post<PaymentResult>("/api/near/pay", { companyId, taskId, amount });
export const approveOnChain = (companyId: string, taskId: string) => post<{ txHash: string; explorerUrl: string }>("/api/near/approve", { companyId, taskId });
export const createTasksOnChain = (companyId: string, tasks: { id: string; agent: string; budget: number }[]) =>
  post<{ created: { id: string; txHash: string; explorerUrl: string }[] }>("/api/near/tasks", { companyId, tasks });

/* ───────────── Formatting ───────────── */

export const CHECK_NAMES = [
  "Company not paused",
  "Recipient authorized",
  "Task exists",
  "Task approved",
  "Within per-payment limit",
  "Within spending cap",
  "Sufficient treasury",
  "Not already paid",
];

/** "3000000000000000000000000 yoctoNEAR" → "3 NEAR" */
export const readable = (s: string) => s.replace(/(\d{7,}) yoctoNEAR/g, (_, y: string) => `${fromYocto(y)} NEAR`);

/** Rebuilds the check list from the contract's verdict (it stops at the first failure). */
export function checksFromOutcome(r: PaymentResult): Check[] {
  const failAt = r.failed_check ? CHECK_NAMES.indexOf(r.failed_check) : -1;
  return CHECK_NAMES.map((rule, i) => ({
    rule,
    passed: failAt === -1 || i < failAt,
    detail: i === failAt ? readable(r.reason ?? "Failed") : failAt === -1 || i < failAt ? "Contract: passed" : "",
  }));
}

const kindMap: Record<string, LedgerEntry["type"] | null> = {
  Deposit: "deposit",
  Payment: "payment",
  Rejected: "rejected",
  Revenue: "revenue",
  Distribution: "distribution",
  Withdrawal: "payment",
  PolicyUpdated: null,
  Paused: null,
  Resumed: null,
};

/** Contract ledger events → UI ledger rows. */
export function chainLedger(events: ChainEvent[] = []): LedgerEntry[] {
  return events.flatMap((e) => {
    const type = kindMap[e.kind];
    if (!type) return [];
    const label =
      e.kind === "Payment" ? `Payout · ${e.task_id ?? ""}` :
      e.kind === "Rejected" ? `Blocked payout · ${e.task_id ?? ""}` :
      e.kind === "Revenue" ? `Sale · ${e.task_id ?? "product"}` :
      e.kind === "Distribution" ? "Worker allocation" :
      e.kind === "Withdrawal" ? "Owner withdrawal" : "Treasury funding";
    return [{
      id: `chain-${e.index}`,
      type,
      label,
      amount: fromYocto(e.amount),
      counterparty: e.counterparty ?? "",
      status: e.kind === "Rejected" ? "rejected" : "confirmed",
      reason: e.reason ? readable(e.reason) : undefined,
      provenance: "onchain",
      at: e.timestamp_ms,
    } satisfies LedgerEntry];
  });
}

/** Company numbers derived from contract state. */
export function companyNumbers(chain: ChainState | null) {
  const c = chain?.company;
  if (!c) return null;
  const ledger = chain?.ledger ?? [];
  return {
    balance: fromYocto(c.balance),
    spent: fromYocto(c.spent),
    revenue: fromYocto(c.revenue),
    maxPayment: fromYocto(c.policy.max_payment),
    spendingCap: fromYocto(c.policy.spending_cap),
    minimumPrice: fromYocto(c.policy.minimum_price),
    retainedPct: c.policy.retained_bps / 100,
    operatorCanApprove: c.policy.operator_can_approve,
    rejected: ledger.filter((e) => e.kind === "Rejected").length,
    deposits: ledger.filter((e) => e.kind === "Deposit").length,
    sales: ledger.filter((e) => e.kind === "Revenue").length,
  };
}

/** Owner CLI command for an owner-only method (the app never holds the owner key). */
export function ownerCommand(chain: ChainState | null, method: string, args: Record<string, unknown>, deposit = "0 NEAR") {
  const json = JSON.stringify({ company_id: chain?.companyId, ...args });
  return `near contract call-function as-transaction ${chain?.contractId} ${method} json-args '${json}' prepaid-gas '30.0 Tgas' attached-deposit '${deposit}' sign-as ${chain?.company?.owner ?? "OWNER.testnet"} network-config testnet sign-with-legacy-keychain send`;
}

/* ───────────── Local owner signer (development only) ───────────── */

export interface OwnerSigner {
  enabled: boolean;
  owner?: string;
  operator?: string;
  balance?: number;
  error?: string;
}

export function useOwnerSigner() {
  const [s, setS] = useState<OwnerSigner | null>(null);
  useEffect(() => {
    fetch("/api/near/owner").then((r) => r.json()).then(setS).catch(() => setS({ enabled: false }));
  }, []);
  return s;
}

export const ownerAction = (companyId: string, method: string, args: Record<string, unknown> = {}, deposit = 0) =>
  post<{ txHash: string; explorerUrl: string }>("/api/near/owner", { action: "call", companyId, method, args, deposit });

export const createCompanyOnChain = (input: {
  companyId: string;
  name: string;
  mission: string;
  budget: number;
  policy: { maxPayment: number; spendingCap: number; minimumPrice: number; retainedPct: number };
}) => post<{ steps: { label: string; txUrl?: string }[]; agents: { role: string; account: string }[] }>("/api/near/owner", { action: "create", ...input });
