import type { AgentRole } from "./types";

/** Static profile for each role. Accounts and registration come from the contract. */
export const ROLES: Record<AgentRole, { name: string; title: string; description: string; tools: string[] }> = {
  ceo: {
    name: "Atlas",
    title: "Chief Executive",
    description: "Turns the mission into a plan, assigns work, reviews deliverables and requests payment approvals.",
    tools: ["plan.create", "task.assign", "deliverable.review", "payment.request"],
  },
  research: {
    name: "Meridian",
    title: "Research",
    description: "Investigates markets, separates evidence from assumption and produces sourced research briefs.",
    tools: ["research.write", "payment.request"],
  },
  product: {
    name: "Forge",
    title: "Product",
    description: "Converts approved research into a customer-ready market intelligence report.",
    tools: ["doc.read", "doc.write", "file.export", "payment.request"],
  },
  sales: {
    name: "Halcyon",
    title: "Sales",
    description: "Writes listings, sets prices at or above the policy floor and prepares the purchase flow.",
    tools: ["listing.write", "price.propose", "payment.request"],
  },
  finance: {
    name: "Ledger",
    title: "Finance",
    description: "Reads the on-chain ledger, flags anomalous requests and prepares the company P&L.",
    tools: ["treasury.read", "report.write"],
  },
};

export const ROLE_ORDER: AgentRole[] = ["ceo", "research", "product", "sales", "finance"];

export const isRole = (r: string): r is AgentRole => r in ROLES;
