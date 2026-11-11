"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useState } from "react";
import { Cart, Copy, Download, Lightning } from "@/components/icons";
import { LedgerTable } from "@/components/ledger";
import { Markdown } from "@/components/markdown";
import { Amt, Badge, Button, Card, CardHeader, EASE, PageHeader, ago } from "@/components/ui";
import { downloadText } from "@/lib/ai/client";
import { chainLedger, companyNumbers, useChain } from "@/lib/near/client";
import { forCompany, useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

function Cover({ p, company }: { p: Product; company: string }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 200, damping: 20 });
  const glare = useTransform(mx, [-0.5, 0.5], ["0%", "100%"]);
  const glareBg = useTransform(glare, (g) => `linear-gradient(105deg, transparent 20%, rgba(255,255,255,.18) ${g}, transparent 80%)`);
  return (
    <div className="flex items-center justify-center py-10" style={{ perspective: 1200 }}>
      <motion.div
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onMouseLeave={() => { mx.set(0); my.set(0); }}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: EASE }}
        className="relative aspect-[1/1.32] w-[260px] overflow-hidden rounded-md border border-white/10 bg-[#0f1013] shadow-[0_40px_80px_-20px_rgba(0,0,0,.8),0_0_0_1px_rgba(255,255,255,.03)]"
      >
        <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/50 to-transparent" />
        <div className="flex h-full flex-col p-6">
          <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-faint">
            <span className="truncate">{company}</span>
            <span>{new Date(p.createdAt).getFullYear()}</span>
          </div>
          <div className="mt-auto">
            <div className="mb-3 h-px w-10 bg-accent" />
            <div className="font-display text-[20px] font-semibold leading-[1.1] tracking-[-0.02em]">{p.title}</div>
            <div className="mt-3 text-[10px] leading-relaxed text-muted">Market intelligence report · {p.words.toLocaleString()} words</div>
          </div>
        </div>
        <motion.div className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ background: glareBg }} />
      </motion.div>
    </div>
  );
}

export default function Products() {
  const { chain } = useChain();
  const companyId = useStore((s) => s.companyId);
  const products = forCompany(useStore((s) => s.products), companyId);
  const [copied, setCopied] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const n = companyNumbers(chain);
  const c = chain?.company;
  if (!c || !n) return null;
  const sales = chainLedger(chain?.ledger).filter((l) => l.type === "revenue" || l.type === "distribution");

  const buyCommand = (p: Product) =>
    `near contract call-function as-transaction ${chain?.contractId} purchase json-args '${JSON.stringify({ company_id: companyId, product_id: p.id })}' prepaid-gas '100.0 Tgas' attached-deposit '${p.price} NEAR' sign-as BUYER.testnet network-config testnet sign-with-legacy-keychain send`;

  return (
    <>
      <PageHeader eyebrow="Products & sales" title="What the company sells" sub="Reports written by the workforce, priced at or above the contract's minimum. Sales settle through the contract's purchase method, which splits revenue by policy." />

      {products.length === 0 && (
        <Card className="flex flex-col items-center px-6 py-16 text-center">
          <Lightning size={28} weight="duotone" className="text-faint" />
          <h3 className="mt-4 text-[18px] font-semibold">No products yet</h3>
          <p className="mt-2 max-w-md text-[13.5px] text-muted">When Forge, the Product agent, delivers its report in the Task market, it is published here as a downloadable product.</p>
          <Button href="/tasks" className="mt-6">Open the Task market</Button>
        </Card>
      )}

      <div className="space-y-3">
        {products.map((p, i) => (
          <Card key={p.id} className="overflow-hidden">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <div className="relative border-b border-line bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04),transparent_70%)] lg:border-b-0 lg:border-r">
                <Cover p={p} company={c.name} />
              </div>
              <div className="flex flex-col p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge t="accent">{i === 0 ? "latest" : "listed"}</Badge>
                  <Badge>{ago(p.createdAt)}</Badge>
                  {p.price >= n.minimumPrice ? <Badge t="info">At or above {n.minimumPrice} NEAR floor</Badge> : <Badge t="danger">Below price floor</Badge>}
                </div>
                <h2 className="mt-4 text-[24px] font-semibold tracking-[-0.02em]">{p.title}</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{p.description}</p>

                <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
                  {p.sections.map((s, k) => (
                    <motion.div key={s + k} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + k * 0.05 }} className="flex items-center gap-3 border-b border-line py-2">
                      <span className="num text-[11px] text-faint">{String(k + 1).padStart(2, "0")}</span>
                      <span className="truncate text-fg/85">{s}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-8">
                  <div>
                    <div className="text-[12px] text-faint">Price</div>
                    <Amt v={p.price} className="text-[32px] font-medium tracking-[-0.022em]" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setPreview(preview === p.id ? null : p.id)}>{preview === p.id ? "Hide" : "Read"}</Button>
                    <Button onClick={() => downloadText(`${p.title.replace(/[^a-z0-9]+/gi, "-")}.md`, p.content)}><Download size={14} /> Download</Button>
                    <Button
                      variant="primary"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(buyCommand(p));
                          setCopied(p.id);
                        } catch {
                          setCopied(null);
                        }
                      }}
                    >
                      <Cart size={14} /> {copied === p.id ? "Buyer command copied" : "Buy on testnet"}
                    </Button>
                  </div>
                </div>
                {copied === p.id && (
                  <div className="num mt-3 flex items-start gap-2 break-all rounded-lg border border-line bg-raised p-3 text-[11.5px] text-muted">
                    <Copy size={12} className="mt-0.5 shrink-0" /> {buyCommand(p)}
                  </div>
                )}
                <div className="mt-2 text-[12px] text-faint">The buyer signs with their own account. {100 - n.retainedPct}% of the price is paid out to the registered agents, in the same transaction.</div>
              </div>
            </div>
            {preview === p.id && (
              <div className="border-t border-line px-6 py-6 md:px-10">
                <Markdown text={p.content} />
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="mt-3">
        <CardHeader title="Sales & distributions" sub={`From the contract · retained ${n.retainedPct}% · workers ${100 - n.retainedPct}%`} />
        <LedgerTable entries={sales} />
      </Card>
    </>
  );
}
