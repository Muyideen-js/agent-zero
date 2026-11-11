"use client";

import { AnimatePresence, motion } from "motion/react";
import type { LedgerEntry } from "@/lib/types";
import { Amt, ProvenanceTag, ago, cx, EASE } from "./ui";
import { ArrowDownLeft, ArrowUpRight, Bank, Fork, Prohibit } from "./icons";

const meta = {
  deposit: { icon: Bank, label: "Deposit", c: "text-info" },
  payment: { icon: ArrowUpRight, label: "Agent payment", c: "text-fg" },
  revenue: { icon: ArrowDownLeft, label: "Revenue", c: "text-accent" },
  distribution: { icon: Fork, label: "Distribution", c: "text-muted" },
  rejected: { icon: Prohibit, label: "Rejected", c: "text-danger" },
};

export function LedgerTable({ entries, limit }: { entries: LedgerEntry[]; limit?: number }) {
  const rows = limit ? entries.slice(0, limit) : entries;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.1em] text-faint">
            <th className="px-5 py-3 font-medium">Activity</th>
            <th className="px-5 py-3 font-medium">Counterparty</th>
            <th className="px-5 py-3 font-medium">Source</th>
            <th className="px-5 py-3 text-right font-medium">Amount</th>
            <th className="px-5 py-3 text-right font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {rows.map((e, i) => {
              const m = meta[e.type];
              const sign = e.type === "deposit" || e.type === "revenue" ? "+" : e.type === "rejected" ? "" : "−";
              return (
                <motion.tr
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: -8, backgroundColor: "rgba(0,226,154,0.08)" }}
                  animate={{ opacity: 1, x: 0, backgroundColor: "rgba(0,0,0,0)" }}
                  transition={{ duration: 0.6, delay: i * 0.03, ease: EASE, backgroundColor: { duration: 1.6 } }}
                  className="border-t border-line transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className={cx("flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-raised", m.c)}>
                        <m.icon size={15} weight="bold" />
                      </span>
                      <div>
                        <div className="text-fg">{e.label}</div>
                        {e.reason ? (
                          <div className="text-[12px] text-danger/90">{e.reason}</div>
                        ) : (
                          <div className="text-[12px] text-faint">
                            {m.label}
                            {e.status === "pending" ? " · pending" : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="num px-5 py-3.5 text-[12px] text-muted">{e.counterparty}</td>
                  <td className="px-5 py-3.5">
                    <ProvenanceTag p={e.provenance} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Amt v={e.amount} sign={sign} className={cx(e.type === "rejected" ? "text-danger line-through decoration-danger/40" : e.type === "revenue" ? "text-accent" : "text-fg")} />
                  </td>
                  <td className="px-5 py-3.5 text-right text-[12.5px] text-faint">{ago(e.at)}</td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
        </tbody>
      </table>
      {rows.length === 0 && <div className="px-5 py-10 text-center text-[13px] text-faint">No transactions yet.</div>}
    </div>
  );
}
