/** Shapes returned by the agent-zero contract (amounts are yoctoNEAR strings). */

export interface ChainPolicy {
  max_payment: string;
  spending_cap: string;
  minimum_price: string;
  retained_bps: number;
  operator_can_approve: boolean;
}

export interface ChainCompany {
  id: string;
  name: string;
  mission: string;
  owner: string;
  operator: string;
  paused: boolean;
  policy: ChainPolicy;
  agents: { account: string; role: string }[];
  balance: string;
  spent: string;
  revenue: string;
  created_at_ms: number;
}

export type ChainEventKind = "Deposit" | "Payment" | "Rejected" | "Revenue" | "Distribution" | "Withdrawal" | "PolicyUpdated" | "Paused" | "Resumed";

export interface ChainEvent {
  index: number;
  company_id: string;
  kind: ChainEventKind;
  amount: string;
  counterparty: string | null;
  task_id: string | null;
  reason: string | null;
  timestamp_ms: number;
}

export interface ChainTask {
  id: string;
  agent: string;
  budget: string;
  status: "Open" | "Approved" | "Paid" | "Cancelled";
}

export interface PaymentResult {
  ok: boolean;
  failed_check: string | null;
  reason: string | null;
  txHash: string;
  explorerUrl: string;
}

export interface ChainState {
  configured: boolean;
  contractId?: string;
  companyId?: string;
  operator?: string;
  company?: ChainCompany | null;
  ledger?: ChainEvent[];
  tasks?: Record<string, ChainTask | null>;
  error?: string;
}
