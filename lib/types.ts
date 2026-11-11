export type AgentRole = "ceo" | "research" | "product" | "sales" | "finance";

/**
 * A unit of work. Identity, assignee, budget and payment status live on-chain
 * (create_task / approve_task / pay_agent). The plan text and the deliverable
 * the agent produced live off-chain, here.
 */
export interface WorkTask {
  companyId: string;
  id: string;
  title: string;
  description: string;
  role: AgentRole;
  agent: string; // on-chain account that will be paid
  budget: number; // NEAR
  dependsOn: string[];
  content?: string; // deliverable (Markdown)
  summary?: string;
  model?: string;
  createdAt: number;
  createTx?: string;
}

/** Chain task status, or "missing" while the create tx is not yet visible. */
export type ChainTaskStatus = "Open" | "Approved" | "Paid" | "Cancelled" | "missing";

export type Provenance = "onchain";
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
  companyId: string;
  role: AgentRole | "owner" | "system";
  text: string;
  at: number;
  txUrl?: string;
}

export interface Product {
  id: string;
  companyId: string;
  title: string;
  description: string;
  price: number;
  sections: string[];
  content: string;
  words: number;
  createdAt: number;
}
