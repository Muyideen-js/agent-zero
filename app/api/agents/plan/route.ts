import { NextResponse } from "next/server";
import { aiConfigured, aiModel, chat, parseJson } from "@/lib/ai/llm";
import { SYSTEM } from "@/lib/ai/prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PlanTask = { id: string; title: string; description: string; role: string; budget: number; dependsOn: string[] };
const ROLES = new Set(["research", "product", "sales", "finance"]);

/** CEO planning: mission + policy → validated task list. */
export async function POST(req: Request) {
  if (!aiConfigured()) return NextResponse.json({ error: "AI is not configured. Add AI_API_KEY to .env.local." }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { name?: string; mission?: string; maxPayment?: number; spendingCap?: number } | null;
  const mission = String(body?.mission ?? "").slice(0, 600);
  const maxPayment = Number(body?.maxPayment ?? 3);
  const cap = Number(body?.spendingCap ?? 10);
  if (!mission) return NextResponse.json({ error: "mission is required" }, { status: 400 });

  try {
    const reply = await chat(
      SYSTEM.ceo,
      `Company: ${body?.name ?? "Unnamed"}\nMission: ${mission}\nPer-payment limit: ${maxPayment} NEAR\nTotal agent spending cap: ${cap} NEAR\nPlan the work.`,
      { json: true, maxTokens: 1500 },
    );
    const plan = parseJson<{ summary: string; tasks: PlanTask[] }>(reply);

    // Never trust the model with money: clamp budgets to policy server-side.
    let remaining = cap;
    const tasks = (plan.tasks ?? []).slice(0, 6).flatMap((t, i) => {
      if (!ROLES.has(t.role)) return [];
      const budget = Math.max(0.1, Math.min(Number(t.budget) || 1, maxPayment, remaining));
      remaining = Math.max(0, remaining - budget);
      return [{
        id: /^T-\d{3}$/.test(t.id) ? t.id : `T-${110 + i}`,
        title: String(t.title).slice(0, 120),
        description: String(t.description).slice(0, 400),
        role: t.role,
        budget: Math.round(budget * 100) / 100,
        dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn.map(String).slice(0, 5) : [],
      }];
    });
    return NextResponse.json({ summary: String(plan.summary ?? "").slice(0, 400), tasks, model: aiModel() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
