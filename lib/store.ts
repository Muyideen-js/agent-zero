"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActivityEvent, AgentRole, Product, WorkTask } from "./types";

let n = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}${(n++).toString(36)}`;

/**
 * Off-chain working memory for the AI workforce: plans, deliverables, products
 * and the activity feed. Money, policy, agents and task status are never stored
 * here; they are read from the contract.
 */
interface State {
  companyId: string | null;
  tasks: WorkTask[];
  products: Product[];
  activity: ActivityEvent[];
  working: Partial<Record<AgentRole, string>>;
  /** Companies launched from this browser. */
  myCompanies: { id: string; name: string; createdAt: number }[];

  addMyCompany: (c: { id: string; name: string }) => void;
  setCompany: (id: string | null) => void;
  addTasks: (tasks: WorkTask[]) => void;
  updateTask: (companyId: string, id: string, patch: Partial<WorkTask>) => void;
  addProduct: (p: Omit<Product, "id" | "createdAt">) => void;
  updateLatestProduct: (companyId: string, patch: Partial<Product>) => void;
  log: (companyId: string, role: ActivityEvent["role"], text: string, txUrl?: string) => void;
  setWorking: (role: AgentRole, label: string | null) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      companyId: null,
      tasks: [],
      products: [],
      activity: [],
      working: {},
      myCompanies: [],

      addMyCompany: (c) => set({ myCompanies: [{ ...c, createdAt: Date.now() }, ...get().myCompanies.filter((x) => x.id !== c.id)] }),
      setCompany: (companyId) => set({ companyId }),

      addTasks: (tasks) => set({ tasks: [...get().tasks, ...tasks] }),

      updateTask: (companyId, id, patch) =>
        set({ tasks: get().tasks.map((t) => (t.companyId === companyId && t.id === id ? { ...t, ...patch } : t)) }),

      addProduct: (p) => set({ products: [{ ...p, id: uid("P"), createdAt: Date.now() }, ...get().products] }),

      updateLatestProduct: (companyId, patch) => {
        const idx = get().products.findIndex((p) => p.companyId === companyId);
        if (idx === -1) return;
        set({ products: get().products.map((p, i) => (i === idx ? { ...p, ...patch } : p)) });
      },

      log: (companyId, role, text, txUrl) =>
        set({ activity: [{ id: uid("E"), companyId, role, text, at: Date.now(), txUrl }, ...get().activity].slice(0, 300) }),

      setWorking: (role, label) => {
        const working = { ...get().working };
        if (label) working[role] = label;
        else delete working[role];
        set({ working });
      },
    }),
    {
      name: "agent-zero",
      version: 4,
      // Older versions held sample data; start clean.
      migrate: (s) => ({ myCompanies: [], ...(s as object) }) as unknown as State,
      partialize: (s) => ({ companyId: s.companyId, tasks: s.tasks, products: s.products, activity: s.activity, myCompanies: s.myCompanies }) as unknown as State,
    },
  ),
);

/** Items that belong to the active company. */
export const forCompany = <T extends { companyId: string }>(items: T[], companyId: string | null) => items.filter((i) => i.companyId === companyId);
