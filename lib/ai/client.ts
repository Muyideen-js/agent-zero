"use client";

import { useEffect, useState } from "react";
import { useStore } from "../store";
import type { AgentRole, WorkTask } from "../types";
import { ROLES } from "../roles";
import { createTasksOnChain } from "../near/client";
import { fromYocto } from "../near/config";
import type { ChainState } from "../near/types";

export function useAIStatus() {
  const [s, setS] = useState<{ configured: boolean; model?: string } | null>(null);
  useEffect(() => {
    fetch("/api/agents/status").then((r) => r.json()).then(setS).catch(() => setS({ configured: false }));
  }, []);
  return s;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`);
  return j as T;
}

type PlanTask = { id: string; title: string; description: string; role: AgentRole; budget: number; dependsOn: string[] };

/** CEO plans, then every task is registered on-chain against the right agent account. */
export async function runCEO(chain: ChainState) {
  const c = chain.company!;
  const companyId = chain.companyId!;
  const s = useStore.getState();
  s.setWorking("ceo", "Planning the business");
  try {
    const plan = await post<{ summary: string; tasks: PlanTask[]; model?: string }>("/api/agents/plan", {
      name: c.name,
      mission: c.mission,
      maxPayment: fromYocto(c.policy.max_payment),
      spendingCap: Math.max(0.1, fromYocto(c.policy.spending_cap) - fromYocto(c.spent)),
    });

    // Unique on-chain ids for this planning round; keep the plan's dependency links.
    const round = Date.now().toString(36).slice(-5).toUpperCase();
    const idMap = new Map(plan.tasks.map((t, i) => [t.id, `${round}-${i + 1}`]));
    const tasks: WorkTask[] = plan.tasks.flatMap((t) => {
      const agent = c.agents.find((a) => a.role === t.role)?.account;
      if (!agent) return [];
      return [{
        companyId,
        id: idMap.get(t.id)!,
        title: t.title,
        description: t.description,
        role: t.role,
        agent,
        budget: t.budget,
        dependsOn: t.dependsOn.map((d) => idMap.get(d)).filter(Boolean) as string[],
        createdAt: Date.now(),
      }];
    });
    if (!tasks.length) throw new Error("The plan had no tasks for registered agents.");

    s.log(companyId, "ceo", `Planned ${tasks.length} tasks: ${plan.summary}`.slice(0, 200));
    s.setWorking("ceo", "Registering tasks on-chain");
    const { created } = await createTasksOnChain(companyId, tasks.map((t) => ({ id: t.id, agent: t.agent, budget: t.budget })));
    const tx = new Map(created.map((x) => [x.id, x.explorerUrl]));
    useStore.getState().addTasks(tasks.map((t) => ({ ...t, createTx: tx.get(t.id) })));
    useStore.getState().log(companyId, "ceo", `Registered ${created.length} tasks in the treasury contract`, created[0]?.explorerUrl);
  } finally {
    useStore.getState().setWorking("ceo", null);
  }
}

/** Runs one task's agent, feeding it the deliverables it depends on. */
export async function runTask(chain: ChainState, id: string) {
  const c = chain.company!;
  const companyId = chain.companyId!;
  const s = useStore.getState();
  const all = s.tasks.filter((t) => t.companyId === companyId);
  const t = all.find((x) => x.id === id)!;
  const deps = all.filter((x) => x.content && (t.dependsOn.includes(x.id) || (t.role !== "research" && x.role === "research") || (t.role === "sales" && x.role === "product")));
  const context =
    t.role === "finance"
      ? `On-chain company state: balance ${fromYocto(c.balance)} NEAR, spent ${fromYocto(c.spent)} NEAR of ${fromYocto(c.policy.spending_cap)} NEAR cap, revenue ${fromYocto(c.revenue)} NEAR, paused ${c.paused}.\nOn-chain ledger (newest first): ${JSON.stringify((chain.ledger ?? []).slice(0, 30).map((e) => ({ kind: e.kind, amount_near: fromYocto(e.amount), task: e.task_id, reason: e.reason })))}`
      : deps.map((d) => `## ${d.id} · ${d.title}\n${d.content}`).join("\n\n");

  s.setWorking(t.role, `${t.id} · ${t.title}`);
  s.log(companyId, t.role, `${ROLES[t.role].name} started ${t.id}: ${t.title}`);
  try {
    const r = await post<{ content: string; summary: string; model?: string; words?: number; listing?: { price: number; description: string } }>("/api/agents/run", {
      role: t.role,
      company: c.name,
      mission: c.mission,
      title: t.title,
      description: t.description,
      context,
      minimumPrice: fromYocto(c.policy.minimum_price),
    });
    const st = useStore.getState();
    st.updateTask(companyId, id, { content: r.content, summary: r.summary, model: r.model });
    st.log(companyId, t.role, `${ROLES[t.role].name} delivered ${t.id}: ${r.summary}`);

    if (t.role === "product") {
      const title = r.content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? `${c.name} Market Report`;
      const sections = [...r.content.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim()).slice(0, 10);
      const firstPara = r.content.split(/\n{2,}/).find((p) => p && !p.startsWith("#") && !p.startsWith("|"))?.replace(/[*_`>]/g, "").slice(0, 280) ?? "";
      st.addProduct({ companyId, title, description: firstPara, price: fromYocto(c.policy.minimum_price), sections, content: r.content, words: r.words ?? r.content.split(/\s+/).length });
    }
    if (t.role === "sales" && r.listing) st.updateLatestProduct(companyId, { price: r.listing.price, description: r.listing.description.slice(0, 300) });
  } finally {
    useStore.getState().setWorking(t.role, null);
  }
}

/** CEO plans (if nothing is outstanding), then every task without a deliverable runs in dependency order. */
export async function runAutopilot(chain: ChainState, onStep?: (label: string) => void) {
  const companyId = chain.companyId!;
  const pending = () => useStore.getState().tasks.filter((t) => t.companyId === companyId && !t.content);
  if (!pending().length) {
    onStep?.("CEO is planning and registering tasks on-chain");
    await runCEO(chain);
  }
  const done = new Set(useStore.getState().tasks.filter((t) => t.companyId === companyId && t.content).map((t) => t.id));
  for (let guard = 0; guard < 10; guard++) {
    const next = pending().find((t) => t.dependsOn.every((d) => done.has(d) || !pending().some((x) => x.id === d)));
    if (!next) break;
    onStep?.(`${ROLES[next.role].name} · ${next.title}`);
    await runTask(chain, next.id);
    done.add(next.id);
  }
}

export function downloadText(filename: string, text: string, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
