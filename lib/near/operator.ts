import "server-only";
import { KeyPair, connect, keyStores, providers } from "near-api-js";
import type { KeyPairString } from "near-api-js/lib/utils";
import { CONTRACT_ID, NETWORK, RPC_URL, toYocto, txUrl } from "./config";
import type { PaymentResult } from "./types";

/**
 * The operator is the Agent Zero server's own NEAR account. It may create and
 * approve tasks and request payouts, but the contract decides whether money moves.
 * Its key lives only in server env vars and never reaches a prompt or the browser.
 */
export const OPERATOR_ID = process.env.NEAR_OPERATOR_ACCOUNT_ID ?? "";

async function operatorAccount() {
  const key = process.env.NEAR_OPERATOR_PRIVATE_KEY;
  if (!OPERATOR_ID || !key || !CONTRACT_ID) throw new Error("NEAR operator is not configured. See SETUP.md.");
  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey(NETWORK, OPERATOR_ID, KeyPair.fromString(key as KeyPairString));
  const near = await connect({ networkId: NETWORK, nodeUrl: RPC_URL, keyStore });
  return near.account(OPERATOR_ID);
}

async function call(methodName: string, args: Record<string, unknown>) {
  const account = await operatorAccount();
  const outcome = await account.functionCall({
    contractId: CONTRACT_ID,
    methodName,
    args,
    gas: BigInt("100000000000000"), // 100 Tgas
    attachedDeposit: BigInt(0),
  });
  return { outcome, hash: outcome.transaction.hash as string };
}

export async function requestPayout(companyId: string, taskId: string, amountNear: number): Promise<PaymentResult> {
  const { outcome, hash } = await call("pay_agent", { company_id: companyId, task_id: taskId, amount: toYocto(amountNear) });
  const result = providers.getTransactionLastResult(outcome) as { ok: boolean; failed_check: string | null; reason: string | null };
  return { ...result, txHash: hash, explorerUrl: txUrl(hash) };
}

export async function approveTask(companyId: string, taskId: string) {
  const { hash } = await call("approve_task", { company_id: companyId, task_id: taskId });
  return { txHash: hash, explorerUrl: txUrl(hash) };
}

export async function createTask(companyId: string, taskId: string, agent: string, budgetNear: number) {
  const { hash } = await call("create_task", { company_id: companyId, task_id: taskId, agent, budget: toYocto(budgetNear) });
  return { txHash: hash, explorerUrl: txUrl(hash) };
}
