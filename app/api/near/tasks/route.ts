import { NextResponse } from "next/server";
import { chainConfigured } from "@/lib/near/config";
import { createTask } from "@/lib/near/operator";
import { isAccountId, isCompanyId, isTaskId } from "@/lib/near/validate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Registers the CEO's planned tasks on-chain (operator signs, one tx per task). */
export async function POST(req: Request) {
  if (!chainConfigured()) return NextResponse.json({ error: "Contract not configured" }, { status: 400 });
  const b = (await req.json().catch(() => null)) as { companyId?: unknown; tasks?: { id?: unknown; agent?: unknown; budget?: unknown }[] } | null;
  if (!isCompanyId(b?.companyId) || !Array.isArray(b?.tasks) || b.tasks.length === 0 || b.tasks.length > 8) {
    return NextResponse.json({ error: "companyId and 1 to 8 tasks are required" }, { status: 400 });
  }
  const tasks = b.tasks.map((t) => ({ id: t.id, agent: t.agent, budget: Number(t.budget) }));
  if (!tasks.every((t) => isTaskId(t.id) && isAccountId(t.agent) && Number.isFinite(t.budget) && t.budget > 0 && t.budget <= 1000)) {
    return NextResponse.json({ error: "Each task needs id, agent account and budget" }, { status: 400 });
  }
  const created: { id: string; txHash: string; explorerUrl: string }[] = [];
  try {
    for (const t of tasks) created.push({ id: t.id as string, ...(await createTask(b.companyId, t.id as string, t.agent as string, t.budget)) });
    return NextResponse.json({ created });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, created }, { status: 502 });
  }
}
