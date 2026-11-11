import { NextResponse } from "next/server";
import { chainConfigured } from "@/lib/near/config";
import { requestPayout } from "@/lib/near/operator";
import { isCompanyId, isTaskId } from "@/lib/near/validate";

export const dynamic = "force-dynamic";

/** Relays a payout request to the treasury contract. The contract runs the policy checks. */
export async function POST(req: Request) {
  if (!chainConfigured()) return NextResponse.json({ error: "Contract not configured" }, { status: 400 });
  const b = (await req.json().catch(() => null)) as { companyId?: unknown; taskId?: unknown; amount?: unknown } | null;
  const amount = typeof b?.amount === "number" ? b.amount : NaN;
  if (!isCompanyId(b?.companyId) || !isTaskId(b?.taskId) || !Number.isFinite(amount) || amount <= 0 || amount > 1000) {
    return NextResponse.json({ error: "companyId, taskId and amount (NEAR) are required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await requestPayout(b.companyId, b.taskId, amount));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
