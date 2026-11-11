export type CompanyStatus = "active" | "paused";

export interface Policy {
  maxPayment: number; // NEAR, per payment
  spendingCap: number; // NEAR, total agent spend
  minimumPrice: number; // NEAR, minimum product price
  retainedPct: number; // % of revenue kept in treasury
  workerPct: number; // % of revenue allocated to workers
}

export interface Company {
  id: string;
  name: string;
  description: string;
  mission: string;
  owner: string;
  contractId: string | null;
  status: CompanyStatus;
  createdAt: number;
  policy: Policy;
}

export type AgentRole = "ceo" | "research" | "product" | "sales" | "finance";

export interface Agent {
  id: string;
  role: AgentRole;
  name: string;
  title: string;
  description: string;
  permissions: string[];
  status: "idle" | "working" | "reviewing" | "blocked";
  currentTask: string | null;
  account: string;
}

export type TaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "approved"
  | "completed"
  | "rejected";

export interface Bid {
  id: string;
  agentId: string;
  price: number;
  note: string;
  status: "open" | "accepted" | "declined";
}

export interface Task {
  id: string;
  title: string;
  description: string;
  agentId: string | null;
  budget: number;
  status: TaskStatus;
  dependsOn: string[];
  bids: Bid[];
  deliverable?: string;
  createdAt: number;
}

/**
 * Provenance of a ledger entry. The UI must never present a record as
 * on-chain unless it carries a verified transaction hash.
 */
export type Provenance = "onchain" | "precheck" | "simulated";

export type TxType = "deposit" | "payment" | "revenue" | "distribution" | "rejected";

export interface LedgerEntry {
  id: string;
  type: TxType;
  label: string;
  amount: number;
  counterparty: string;
  status: "confirmed" | "pending" | "rejected";
  reason?: string;
  provenance: Provenance;
  txHash?: string;
  at: number;
}

export interface ActivityEvent {
  id: string;
  agentId: string;
  text: string;
  at: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  status: "draft" | "listed" | "sold";
  pages: number;
  sections: string[];
  sales: number;
}
