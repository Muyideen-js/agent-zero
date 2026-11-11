import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { KeyPair, connect, keyStores, transactions } from "near-api-js";
import type { KeyPairString } from "near-api-js/lib/utils";
import { CONTRACT_ID, NETWORK, RPC_URL, toYocto, txUrl } from "./config";
import { OPERATOR_ID } from "./operator";
import { view } from "./rpc";

/**
 * LOCAL DEVELOPMENT ONLY. Signs owner actions with the owner key from .env.local
 * so a company can be created and governed from the browser while testing.
 * Never set NEAR_OWNER_PRIVATE_KEY on a public deployment: without it, every
 * owner action falls back to a CLI command the owner signs themselves.
 */
export const OWNER_ID = process.env.NEAR_OWNER_ACCOUNT_ID ?? "";
export const ownerSignerEnabled = () => Boolean(OWNER_ID && process.env.NEAR_OWNER_PRIVATE_KEY && CONTRACT_ID);

const GAS = BigInt("30000000000000"); // 30 Tgas per action

async function owner() {
  if (!ownerSignerEnabled()) throw new Error("Local owner signer is not configured.");
  const ks = new keyStores.InMemoryKeyStore();
  await ks.setKey(NETWORK, OWNER_ID, KeyPair.fromString(process.env.NEAR_OWNER_PRIVATE_KEY as KeyPairString));
  const near = await connect({ networkId: NETWORK, nodeUrl: RPC_URL, keyStore: ks });
  return near.account(OWNER_ID);
}

async function accountExists(id: string) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { request_type: "view_account", finality: "final", account_id: id } }),
  });
  const j = await res.json();
  return Boolean(j.result);
}

/** Saves a key the same way near-cli's legacy keychain does, so the owner can use the agent accounts later. */
function saveKey(accountId: string, kp: KeyPair) {
  try {
    const dir = path.join(os.homedir(), ".near-credentials", NETWORK);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${accountId}.json`), JSON.stringify({ account_id: accountId, public_key: kp.getPublicKey().toString(), private_key: kp.toString() }));
  } catch {
    /* non-fatal: the account still receives payouts */
  }
}

export interface Step {
  label: string;
  txUrl?: string;
}

export async function createCompanyAsOwner(input: {
  companyId: string;
  name: string;
  mission: string;
  budget: number;
  policy: { maxPayment: number; spendingCap: number; minimumPrice: number; retainedPct: number };
}): Promise<{ steps: Step[]; agents: { role: string; account: string }[] }> {
  const acct = await owner();
  if (await view("get_company", { company_id: input.companyId })) throw new Error(`Company "${input.companyId}" already exists.`);

  const steps: Step[] = [];
  const roles = [
    ["ceo", "atlas"],
    ["research", "meridian"],
    ["product", "forge"],
    ["sales", "halcyon"],
    ["finance", "ledger"],
  ];
  const short = input.companyId.replace(/[^a-z0-9]/g, "").slice(0, 12) || "co";
  const agents = roles.map(([role, name]) => ({ role, account: `${name}-${short}.${OWNER_ID}` }));

  // 1. Agent accounts: real named accounts so payouts have somewhere to land.
  for (const a of agents) {
    if (await accountExists(a.account)) continue;
    const kp = KeyPair.fromRandom("ed25519");
    const out = await acct.createAccount(a.account, kp.getPublicKey(), BigInt(toYocto(0.05)));
    saveKey(a.account, kp);
    steps.push({ label: `Created ${a.account}`, txUrl: txUrl(out.transaction.hash) });
  }

  // 2. One transaction: create the company with its treasury, then register every agent.
  const policy = {
    max_payment: toYocto(input.policy.maxPayment),
    spending_cap: toYocto(input.policy.spendingCap),
    minimum_price: toYocto(input.policy.minimumPrice),
    retained_bps: Math.round(input.policy.retainedPct * 100),
    operator_can_approve: true,
  };
  const actions = [
    transactions.functionCall("create_company", { company_id: input.companyId, name: input.name, mission: input.mission, operator: OPERATOR_ID, policy }, GAS, BigInt(toYocto(input.budget))),
    ...agents.map((a) => transactions.functionCall("register_agent", { company_id: input.companyId, account: a.account, role: a.role }, GAS, BigInt(0))),
  ];
  const out = await acct.signAndSendTransaction({ receiverId: CONTRACT_ID, actions });
  steps.push({ label: `Created ${input.name} with a ${input.budget} NEAR treasury and registered 5 agents`, txUrl: txUrl(out.transaction.hash) });
  return { steps, agents };
}

const OWNER_METHODS = new Set(["pause_company", "resume_company", "set_policy", "deposit"]);

export async function ownerCall(companyId: string, method: string, args: Record<string, unknown>, depositNear = 0) {
  if (!OWNER_METHODS.has(method)) throw new Error("Method not allowed");
  const acct = await owner();
  const out = await acct.functionCall({ contractId: CONTRACT_ID, methodName: method, args: { company_id: companyId, ...args }, gas: GAS, attachedDeposit: BigInt(toYocto(depositNear)) });
  return { txHash: out.transaction.hash as string, explorerUrl: txUrl(out.transaction.hash) };
}

export async function ownerBalance() {
  const acct = await owner();
  const b = await acct.getAccountBalance();
  return Number(BigInt(b.available) / BigInt("1000000000000000000")) / 1e6;
}
