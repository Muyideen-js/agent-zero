import { NextResponse } from "next/server";
import { COMPANY_ID, CONTRACT_ID, chainConfigured } from "@/lib/near/config";
import { OPERATOR_ID } from "@/lib/near/operator";
import { view } from "@/lib/near/rpc";
import type { ChainCompany, ChainEvent, ChainState, ChainTask } from "@/lib/near/types";
import { isCompanyId, isTaskId } from "@/lib/near/validate";

export const dynamic = "force-dynamic";

/**
 * Company, ledger and task statuses read straight from the contract,
 * the financial source of truth. ?company=<id>&tasks=T-1,T-2
 */
export async function GET(req: Request) {
  if (!chainConfigured()) return NextResponse.json<ChainState>({ configured: false });
  const url = new URL(req.url);
  const companyId = url.searchParams.get("company") || COMPANY_ID;
  if (!isCompanyId(companyId)) return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  const taskIds = (url.searchParams.get("tasks") ?? "").split(",").filter(isTaskId).slice(0, 40);

  try {
    const [company, ledger, tasks] = await Promise.all([
      view<ChainCompany | null>("get_company", { company_id: companyId }),
      view<ChainEvent[]>("get_ledger", { company_id: companyId, limit: 100 }),
      Promise.all(taskIds.map((id) => view<ChainTask | null>("get_task", { company_id: companyId, task_id: id }))),
    ]);
    return NextResponse.json<ChainState>({
      configured: true,
      contractId: CONTRACT_ID,
      companyId,
      operator: OPERATOR_ID,
      company,
      ledger,
      tasks: Object.fromEntries(taskIds.map((id, i) => [id, tasks[i]])),
    });
  } catch (e) {
    return NextResponse.json<ChainState>({ configured: true, contractId: CONTRACT_ID, companyId, error: (e as Error).message }, { status: 502 });
  }
}
