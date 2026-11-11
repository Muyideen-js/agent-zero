import { CONTRACT_ID, RPC_URL } from "./config";

/** Read-only contract call over JSON-RPC. No keys involved. */
export async function view<T>(method: string, args: Record<string, unknown> = {}, contractId = CONTRACT_ID): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "agent-zero",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: contractId,
        method_name: method,
        args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
      },
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.data ?? json.error.message ?? "RPC error");
  if (json.result?.error) throw new Error(json.result.error);
  return JSON.parse(Buffer.from(json.result.result as number[]).toString()) as T;
}

/** Independently confirm a transaction's final status with the network. */
export async function txStatus(hash: string, signerId: string): Promise<"success" | "failure" | "pending"> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ jsonrpc: "2.0", id: "agent-zero", method: "tx", params: { tx_hash: hash, sender_account_id: signerId, wait_until: "FINAL" } }),
  });
  const json = await res.json();
  const status = json.result?.status;
  if (!status) return "pending";
  if ("Failure" in status) return "failure";
  if ("SuccessValue" in status) return "success";
  return "pending";
}
