import { NextResponse } from "next/server";
import { chainConfigured } from "@/lib/near/config";
import { approveTask } from "@/lib/near/operator";
import { isCompanyId, isTaskId } from "@/lib/near/validate";

export const dynamic = "force-dynamic";

/** Operator approval. Only works if the owner's policy sets operator_can_approve. */
export async function POST(req: Request) {
  if (!chainConfigured()) return NextResponse.json({ error: "Contract not configured" }, { status: 400 });
  const b = (await req.json().catch(() => null)) as { companyId?: unknown; taskId?: unknown } | null;
  if (!isCompanyId(b?.companyId) || !isTaskId(b?.taskId)) return NextResponse.json({ error: "companyId and taskId are required" }, { status: 400 });
  try {
    return NextResponse.json(await approveTask(b.companyId, b.taskId));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
