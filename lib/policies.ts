import type { Company, LedgerEntry, Task } from "./types";

export interface PaymentCheck {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface PaymentRequest {
  agentId: string;
  taskId: string | null;
  amount: number;
  recipient: string;
  authorizedRecipients: string[];
}

/**
 * Mirrors the validation order the treasury contract enforces (PRD §12.1).
 * This runs client-side as a precheck only — the contract is authoritative.
 */
export function precheckPayment(
  company: Company,
  req: PaymentRequest,
  tasks: Task[],
  ledger: LedgerEntry[],
  treasury: number,
): PaymentCheck[] {
  const task = tasks.find((t) => t.id === req.taskId);
  const spent = ledger
    .filter((l) => l.type === "payment" && l.status === "confirmed")
    .reduce((s, l) => s + l.amount, 0);
  const paidForTask = ledger.some(
    (l) => l.type === "payment" && l.status === "confirmed" && l.label.includes(req.taskId ?? "__none"),
  );

  return [
    { rule: "Company not paused", passed: company.status === "active", detail: company.status === "active" ? "Operations active" : "Company is paused by owner" },
    { rule: "Recipient authorized", passed: req.authorizedRecipients.includes(req.recipient), detail: req.recipient },
    { rule: "Task exists", passed: !!task, detail: task ? task.id : "No task referenced" },
    { rule: "Task approved", passed: !!task && (task.status === "approved" || task.status === "completed"), detail: task ? task.status.replace("_", " ") : "—" },
    { rule: "Within per-payment limit", passed: req.amount <= company.policy.maxPayment, detail: `${req.amount} / ${company.policy.maxPayment} NEAR` },
    { rule: "Within spending cap", passed: spent + req.amount <= company.policy.spendingCap, detail: `${(spent + req.amount).toFixed(2)} / ${company.policy.spendingCap} NEAR` },
    { rule: "Sufficient treasury", passed: treasury >= req.amount, detail: `${treasury.toFixed(2)} NEAR available` },
    { rule: "Not already paid", passed: !paidForTask, detail: paidForTask ? "Duplicate request" : "Unique request" },
  ];
}

export function firstFailure(checks: PaymentCheck[]) {
  return checks.find((c) => !c.passed) ?? null;
}
