import { NextResponse } from "next/server";
import { OWNER_ID, createCompanyAsOwner, ownerBalance, ownerCall, ownerSignerEnabled } from "@/lib/near/owner";
import { OPERATOR_ID } from "@/lib/near/operator";
import { isCompanyId } from "@/lib/near/validate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Local owner signer status (development only). */
export async function GET() {
  if (!ownerSignerEnabled()) return NextResponse.json({ enabled: false, operator: OPERATOR_ID });
  try {
    return NextResponse.json({ enabled: true, owner: OWNER_ID, operator: OPERATOR_ID, balance: await ownerBalance() });
  } catch (e) {
    return NextResponse.json({ enabled: true, owner: OWNER_ID, operator: OPERATOR_ID, error: (e as Error).message });
  }
}

type Body =
  | { action: "create"; companyId: string; name: string; mission: string; budget: number; policy: { maxPayment: number; spendingCap: number; minimumPrice: number; retainedPct: number } }
  | { action: "call"; companyId: string; method: string; args?: Record<string, unknown>; deposit?: number };

export async function POST(req: Request) {
  if (!ownerSignerEnabled()) return NextResponse.json({ error: "The local owner signer is disabled. Sign this action with your own account (see SETUP.md)." }, { status: 403 });
  const b = (await req.json().catch(() => null)) as Body | null;
  if (!b || !isCompanyId(b.companyId)) return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  try {
    if (b.action === "create") {
      const name = String(b.name ?? "").trim().slice(0, 80);
      const mission = String(b.mission ?? "").trim().slice(0, 280);
      const budget = Number(b.budget);
      const p = b.policy;
      if (!p) return NextResponse.json({ error: "policy is required" }, { status: 400 });
      const nums = [budget, p.maxPayment, p.spendingCap, p.minimumPrice, p.retainedPct].map(Number);
      if (!name || !mission || nums.some((x) => !Number.isFinite(x) || x < 0) || budget > 20 || p.maxPayment > p.spendingCap || p.retainedPct > 100) {
        return NextResponse.json({ error: "Check the name, mission, budget (max 20 NEAR) and policy values." }, { status: 400 });
      }
      return NextResponse.json(await createCompanyAsOwner({ companyId: b.companyId, name, mission, budget, policy: p }));
    }
    if (b.action === "call") {
      return NextResponse.json(await ownerCall(b.companyId, b.method, b.args ?? {}, Math.min(20, Math.max(0, Number(b.deposit ?? 0)))));
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
