"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, Spinner } from "@/components/icons";
import { useGo } from "@/components/transition";
import { Button, EASE, Logo, TLink, cx } from "@/components/ui";
import { CONTRACT_ID, toYocto } from "@/lib/near/config";
import { ROLE_ORDER, ROLES } from "@/lib/roles";
import { useStore } from "@/lib/store";
import { createCompanyOnChain, useOwnerSigner } from "@/lib/near/client";

const steps = ["Company", "Treasury policy", "Accounts", "Create on-chain"];

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[13px] font-medium">{label}</span>
        {hint && <span className="text-[12px] text-faint">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

const input =
  "w-full rounded-xl border border-line-strong bg-raised px-3.5 py-2.5 text-[14px] text-fg outline-none transition-[border,box-shadow] placeholder:text-faint focus:border-white/25 focus:shadow-[0_0_0_4px_rgba(255,255,255,0.04)]";

function NumField({ value, onChange, unit }: { value: number; onChange: (v: number) => void; unit: string }) {
  return (
    <div className="relative">
      <input type="number" min={0} step="0.5" value={value} onChange={(e) => onChange(Number(e.target.value))} className={cx(input, "num pr-14")} />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-faint">{unit}</span>
    </div>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export default function Launch() {
  const navigate = useGo();
  const setCompany = useStore((s) => s.setCompany);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [operator, setOperator] = useState("");
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [f, setF] = useState({
    name: "",
    id: "",
    mission: "",
    budget: 5,
    maxPayment: 3,
    spendingCap: 10,
    minimumPrice: 5,
    retainedPct: 80,
    owner: "",
    createAgents: true,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const go = (d: number) => {
    setDir(d);
    setStep((s) => Math.max(0, Math.min(steps.length - 1, s + d)));
  };

  const signer = useOwnerSigner();
  const addMyCompany = useStore((s) => s.addMyCompany);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<{ label: string; txUrl?: string }[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  // The app's operator account comes from the server config.
  useEffect(() => {
    fetch("/api/near/state?company=__none__").then((r) => r.json()).then((j) => setOperator(j.operator ?? "")).catch(() => {});
  }, []);

  const companyId = f.id || slug(f.name);
  const local = Boolean(signer?.enabled);
  const owner = local ? (signer?.owner ?? "") : f.owner.trim();
  const short = companyId.replace(/[^a-z0-9]/g, "").slice(0, 12) || "co";
  const agents = ROLE_ORDER.map((r) => ({ role: r, account: local ? `${ROLES[r].name.toLowerCase()}-${short}.${owner}` : `${ROLES[r].name.toLowerCase()}.${owner || "OWNER.testnet"}` }));

  const createNow = async () => {
    setCreating(true);
    setCreateError(null);
    setProgress([{ label: "Creating agent accounts and the company on NEAR testnet…" }]);
    try {
      const r = await createCompanyOnChain({
        companyId,
        name: f.name.trim(),
        mission: f.mission.trim(),
        budget: f.budget,
        policy: { maxPayment: f.maxPayment, spendingCap: f.spendingCap, minimumPrice: f.minimumPrice, retainedPct: f.retainedPct },
      });
      setProgress(r.steps);
      addMyCompany({ id: companyId, name: f.name.trim() });
      setCompany(companyId);
      setTimeout(() => navigate("/dashboard"), 1400);
    } catch (e) {
      setCreateError((e as Error).message);
      setProgress([]);
      setCreating(false);
    }
  };

  const issues = [
    !f.name.trim() && "Company needs a name",
    !/^[a-z0-9_-]{1,64}$/.test(companyId) && "Company ID can only use a-z, 0-9, - and _",
    !f.mission.trim() && "Write a mission for the CEO",
    f.maxPayment > f.spendingCap && "Per-payment limit is larger than the total cap",
    step >= 2 && !/^[a-z0-9._-]+\.testnet$/.test(owner) && "Owner must be a testnet account, e.g. yourname.testnet",
    local && signer?.balance !== undefined && f.budget + 0.4 > signer.balance && `Owner has ${signer.balance} NEAR; lower the treasury to at most ${Math.max(0, Math.floor((signer.balance - 0.4) * 10) / 10)} NEAR`,
    !CONTRACT_ID && "The treasury contract is not configured (see SETUP.md)",
  ].filter(Boolean) as string[];

  const script = useMemo(() => {
    const sign = `network-config testnet sign-with-legacy-keychain send`;
    const call = (method: string, args: object, deposit = "0 NEAR") =>
      `near contract call-function as-transaction ${CONTRACT_ID} ${method} json-args '${JSON.stringify(args)}' prepaid-gas '100.0 Tgas' attached-deposit '${deposit}' sign-as ${owner} ${sign}`;
    const lines: string[] = [`# ${f.name}: run in Git Bash as ${owner}`];
    if (f.createAgents) {
      lines.push("", "# 1. Agent accounts (0.1 NEAR each, paid by the owner)");
      for (const a of agents) lines.push(`near account create-account fund-myself ${a.account} '0.1 NEAR' autogenerate-new-keypair save-to-legacy-keychain sign-as ${owner} ${sign}`);
    }
    lines.push(
      "",
      `# ${f.createAgents ? 2 : 1}. Company, policy and a ${f.budget} NEAR treasury`,
      call(
        "create_company",
        {
          company_id: companyId,
          name: f.name.trim(),
          mission: f.mission.trim(),
          operator: operator || "OPERATOR.testnet",
          policy: { max_payment: toYocto(f.maxPayment), spending_cap: toYocto(f.spendingCap), minimum_price: toYocto(f.minimumPrice), retained_bps: f.retainedPct * 100, operator_can_approve: true },
        },
        `${f.budget} NEAR`,
      ),
      "",
      `# ${f.createAgents ? 3 : 2}. Register the workforce`,
      ...agents.map((a) => call("register_agent", { company_id: companyId, account: a.account, role: a.role })),
    );
    return lines.join("\n");
  }, [f, owner, agents, companyId, operator]);

  const open = async () => {
    setChecking(true);
    setCheckMsg(null);
    try {
      const j = await (await fetch(`/api/near/state?company=${companyId}`)).json();
      if (j.company) {
        setCompany(companyId);
        navigate("/dashboard");
      } else setCheckMsg(`"${companyId}" is not in the contract yet. Run the script, wait a few seconds, then try again.`);
    } catch {
      setCheckMsg("Could not reach the contract. Try again.");
    } finally {
      setChecking(false);
    }
  };

  const blocking = step === 0 ? issues.filter((i) => /name|ID|mission/.test(i)) : step === 1 ? issues.filter((i) => /limit/.test(i)) : step === 2 ? issues.filter((i) => /Owner/.test(i)) : [];

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <header className="relative flex h-16 items-center justify-between px-5 md:px-10">
        <TLink href="/"><Logo /></TLink>
        <TLink href="/dashboard" className="text-[13px] text-muted transition-colors hover:text-fg">Cancel</TLink>
      </header>

      <div className="relative mx-auto grid max-w-5xl gap-10 px-5 pb-20 pt-8 md:grid-cols-[220px_1fr] md:px-10 md:pt-14">
        <aside>
          <div className="mb-6 text-[12px] font-medium uppercase tracking-[0.14em] text-faint">New company</div>
          <ol className="relative space-y-1">
            {steps.map((s, i) => (
              <li key={s} className="relative flex items-center gap-3 py-2">
                <span className={cx("relative flex h-6 w-6 items-center justify-center rounded-full border text-[11px] transition-colors duration-500", i < step ? "border-accent bg-accent text-bg" : i === step ? "border-fg text-fg" : "border-line-strong text-faint")}>
                  <AnimatePresence mode="wait" initial={false}>
                    {i < step ? (
                      <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check size={12} weight="bold" /></motion.span>
                    ) : (
                      <motion.span key="n" className="num" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>{i + 1}</motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className={cx("text-[13.5px] transition-colors", i === step ? "text-fg" : "text-faint")}>{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 h-px bg-line">
            <motion.div className="h-px bg-fg" animate={{ width: `${((step + 1) / steps.length) * 100}%` }} transition={{ duration: 0.6, ease: EASE }} />
          </div>
        </aside>

        <div className="min-h-[520px] min-w-0">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} initial={{ opacity: 0, x: dir * 40, filter: "blur(8px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} exit={{ opacity: 0, x: dir * -40, filter: "blur(8px)" }} transition={{ duration: 0.5, ease: EASE }}>
              {step === 0 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-[32px] font-semibold tracking-[-0.025em]">What is this company for?</h1>
                    <p className="mt-2 text-[14.5px] text-muted">The CEO agent plans from this mission. It is stored in the contract.</p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr]">
                    <Field label="Company name"><input className={input} placeholder="e.g. Northwind Research" value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
                    <Field label="Company ID" hint="on-chain key"><input className={cx(input, "num")} placeholder={slug(f.name) || "northwind-research"} value={f.id} onChange={(e) => set("id", slug(e.target.value))} /></Field>
                  </div>
                  <Field label="Mission" hint={`${f.mission.length}/280`}>
                    <textarea rows={4} maxLength={280} className={cx(input, "resize-none leading-relaxed")} placeholder="Research the market for … and produce a report that … will pay for." value={f.mission} onChange={(e) => set("mission", e.target.value)} />
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-[32px] font-semibold tracking-[-0.025em]">Set the rules of the money.</h1>
                    <p className="mt-2 text-[14.5px] text-muted">Written to the treasury contract. Agents can&apos;t change them. Only you can.</p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Initial treasury" hint="testnet"><NumField value={f.budget} onChange={(v) => set("budget", v)} unit="NEAR" /></Field>
                    <Field label="Max per payment"><NumField value={f.maxPayment} onChange={(v) => set("maxPayment", v)} unit="NEAR" /></Field>
                    <Field label="Total agent spending cap"><NumField value={f.spendingCap} onChange={(v) => set("spendingCap", v)} unit="NEAR" /></Field>
                    <Field label="Minimum product price"><NumField value={f.minimumPrice} onChange={(v) => set("minimumPrice", v)} unit="NEAR" /></Field>
                  </div>
                  <Field label="Revenue split" hint={`${f.retainedPct}% company · ${100 - f.retainedPct}% workers`}>
                    <div className="rounded-xl border border-line-strong bg-raised p-4">
                      <div className="mb-3 flex h-2 overflow-hidden rounded-full">
                        <motion.div className="bg-fg" animate={{ width: `${f.retainedPct}%` }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                        <div className="flex-1 bg-accent" />
                      </div>
                      <input type="range" min={50} max={100} step={5} value={f.retainedPct} onChange={(e) => set("retainedPct", Number(e.target.value))} className="w-full" />
                    </div>
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-[32px] font-semibold tracking-[-0.025em]">Who owns it, who gets paid.</h1>
                    <p className="mt-2 text-[14.5px] text-muted">The owner signs the creation and keeps sole control of policy and pause. The app&apos;s operator can request payouts but never change the rules.</p>
                  </div>
                  {local ? (
                    <div className="flex items-center justify-between rounded-xl border border-accent/25 bg-accent-dim px-4 py-3">
                      <div>
                        <div className="text-[12px] text-accent">Owner · signs from this machine</div>
                        <div className="num mt-0.5 text-[13.5px] text-fg">{owner}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] text-faint">Available</div>
                        <div className="num text-[13.5px]">{signer?.balance ?? "…"} NEAR</div>
                      </div>
                    </div>
                  ) : (
                    <Field label="Owner account" hint="your testnet account"><input className={cx(input, "num")} placeholder="yourname.testnet" value={f.owner} onChange={(e) => set("owner", e.target.value.trim().toLowerCase())} /></Field>
                  )}
                  <div className="rounded-2xl border border-line bg-surface">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3 text-[12.5px]">
                      <span className="text-muted">Operator (this app)</span>
                      <span className="num text-fg/90">{operator || "not configured"}</span>
                    </div>
                    {agents.map((a) => (
                      <div key={a.role} className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[12.5px] last:border-0">
                        <span className="text-muted">{ROLES[a.role].name} · {ROLES[a.role].title}</span>
                        <span className="num truncate pl-3 text-fg/90">{a.account}</span>
                      </div>
                    ))}
                  </div>
                  {!local && (
                    <label className="flex items-center gap-2.5 text-[13px] text-muted">
                      <input type="checkbox" checked={f.createAgents} onChange={(e) => set("createAgents", e.target.checked)} className="accent-[var(--accent)]" />
                      Create these agent accounts (they must exist to receive payouts)
                    </label>
                  )}
                </div>
              )}

              {step === 3 && local && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-[32px] font-semibold tracking-[-0.025em]">Create it on-chain.</h1>
                    <p className="mt-2 text-[14.5px] text-muted">Two kinds of transaction, signed by <span className="num text-fg">{owner}</span>. Takes about 20 seconds.</p>
                  </div>
                  {issues.length > 0 && (
                    <div className="rounded-xl border border-warn/25 bg-warn-dim p-4 text-[13px] text-warn">
                      {issues.map((i) => <div key={i}>• {i}</div>)}
                    </div>
                  )}
                  <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
                    {[
                      ["5 agent accounts", "Named accounts under the owner, so payouts have somewhere to land"],
                      [`create_company · ${f.budget} NEAR`, `"${companyId}" with your policy and this app as operator`],
                      ["register_agent × 5", "In the same transaction as the company"],
                    ].map(([a, b], i) => {
                      const done = progress.length > 1 || (!creating && progress.length === 1 && progress[0].txUrl);
                      return (
                        <div key={a} className="flex items-center gap-3 px-4 py-3.5">
                          <span className={cx("flex h-6 w-6 items-center justify-center rounded-full border", done ? "border-accent bg-accent text-bg" : creating ? "border-line-strong text-muted" : "border-line text-faint")}>
                            {done ? <Check size={12} weight="bold" /> : creating ? <Spinner size={12} className="animate-spin" /> : <span className="num text-[11px]">{i + 1}</span>}
                          </span>
                          <div>
                            <div className="num text-[13px] text-fg">{a}</div>
                            <div className="text-[12px] text-faint">{b}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {progress.some((p) => p.txUrl) && (
                    <div className="space-y-1.5 rounded-xl border border-accent/25 bg-accent-dim p-3 text-[12.5px]">
                      {progress.map((p) => (
                        <div key={p.label} className="flex items-center justify-between gap-3">
                          <span className="text-fg/90">{p.label}</span>
                          {p.txUrl && <a href={p.txUrl} target="_blank" rel="noreferrer" className="shrink-0 text-accent hover:underline">tx ↗</a>}
                        </div>
                      ))}
                    </div>
                  )}
                  {createError && <div className="break-all rounded-xl border border-danger/25 bg-danger-dim p-3 text-[12.5px] text-danger">{createError}</div>}
                </div>
              )}

              {step === 3 && !local && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-[32px] font-semibold tracking-[-0.025em]">Sign it into existence.</h1>
                    <p className="mt-2 text-[14.5px] text-muted">Run this as <span className="num text-fg">{owner}</span>. Your key never touches the app. Then open the company.</p>
                  </div>
                  {issues.length > 0 && (
                    <div className="rounded-xl border border-warn/25 bg-warn-dim p-4 text-[13px] text-warn">
                      {issues.map((i) => <div key={i}>• {i}</div>)}
                    </div>
                  )}
                  <div className="relative overflow-hidden rounded-2xl border border-line bg-[#0a0b0d]">
                    <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                      <span className="text-[12px] text-faint">create-{companyId}.sh</span>
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(script);
                            setCopied(true);
                          } catch {
                            setCopied(false);
                          }
                        }}
                      >
                        {copied ? <><Check size={13} weight="bold" /> Copied</> : <><Copy size={13} /> Copy script</>}
                      </Button>
                    </div>
                    <pre className="num max-h-[320px] overflow-auto whitespace-pre-wrap break-all p-4 text-[11.5px] leading-relaxed text-muted">{script}</pre>
                  </div>
                  {checkMsg && <div className="rounded-xl border border-info/25 bg-info-dim px-3 py-2.5 text-[12.5px] text-info">{checkMsg}</div>}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
            <Button variant="ghost" onClick={() => go(-1)} disabled={step === 0}><ArrowLeft size={14} /> Back</Button>
            {step < steps.length - 1 ? (
              <div className="flex items-center gap-3">
                {blocking[0] && <span className="hidden text-[12px] text-warn sm:inline">{blocking[0]}</span>}
                <Button variant="primary" onClick={() => go(1)} disabled={blocking.length > 0}>Continue <ArrowRight size={14} /></Button>
              </div>
            ) : local ? (
              <Button variant="primary" onClick={createNow} disabled={creating || issues.length > 0}>
                {creating ? <><Spinner size={13} className="animate-spin" /> Creating on testnet…</> : <>Create company <ArrowRight size={14} /></>}
              </Button>
            ) : (
              <Button variant="primary" onClick={open} disabled={checking || issues.length > 0}>
                {checking ? <><Spinner size={13} className="animate-spin" /> Checking the contract…</> : <>I&apos;ve run it, open {companyId || "company"} <ArrowRight size={14} /></>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
