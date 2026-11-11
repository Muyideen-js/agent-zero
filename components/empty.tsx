"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { CompanyAvatar } from "./brand";
import { Button, EASE, Mark, TLink, ago } from "./ui";
import { ArrowRight, Plus } from "./icons";

/** Create a company, or pick one that already exists in the treasury contract. */
export function CompanyGate({ reason }: { reason?: string }) {
  const setCompany = useStore((s) => s.setCompany);
  const mine = useStore((s) => s.myCompanies);
  const [id, setId] = useState("");

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <motion.div className="relative mx-auto max-w-3xl px-6 py-16 md:py-20" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <div className="text-center">
          <div className="float mx-auto mb-6 w-fit">
            <Mark size={44} />
          </div>
          <h2 className="text-[28px] font-semibold tracking-[-0.02em]">Start with a company</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-muted">Companies live in the treasury contract on NEAR testnet. Create one with a mission, a budget and spending rules, or open one that already exists.</p>
          {reason && <div className="mx-auto mt-5 max-w-md rounded-xl border border-warn/25 bg-warn-dim px-3 py-2.5 text-[12.5px] text-warn">{reason}</div>}
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-[1.1fr_1fr]">
          <TLink href="/launch" className="group flex flex-col justify-between rounded-2xl border border-accent/25 bg-accent-dim/50 p-6 transition-colors hover:border-accent/50">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 text-accent">
              <Plus size={18} weight="bold" />
            </span>
            <div className="mt-10">
              <div className="text-[17px] font-semibold">Create a company</div>
              <div className="mt-1 text-[13px] text-muted">Mission, treasury and policy, written to the contract in about 20 seconds.</div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent">
                Get started <ArrowRight size={13} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </TLink>

          <div className="flex flex-col rounded-2xl border border-line bg-surface p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">Your companies</div>
            <div className="mt-3 flex-1 space-y-1">
              {mine.length === 0 && <div className="py-4 text-[13px] text-faint">None yet. Companies you create appear here.</div>}
              {mine.map((m) => (
                <button key={m.id} onClick={() => setCompany(m.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.04]">
                  <CompanyAvatar name={m.name} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{m.name}</div>
                    <div className="num text-[11.5px] text-faint">{m.id} · {ago(m.createdAt)}</div>
                  </div>
                  <ArrowRight size={13} className="text-faint" />
                </button>
              ))}
            </div>
            <form
              className="mt-4 flex gap-2 border-t border-line pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (id.trim()) setCompany(id.trim().toLowerCase());
              }}
            >
              <input value={id} onChange={(e) => setId(e.target.value)} placeholder="Open by company ID" className="num h-8 min-w-0 flex-1 rounded-[9px] border border-line-strong bg-raised px-3 text-[12.5px] text-fg outline-none placeholder:text-faint focus:border-white/25" />
              <Button type="submit" disabled={!id.trim()}>Open</Button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
