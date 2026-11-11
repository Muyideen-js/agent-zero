# Agent Zero

**The autonomous company that works, earns and pays on NEAR.**

Agent Zero gives an AI workforce a company, a treasury and a set of financial rules it cannot change. A CEO agent plans the work, specialist agents research, build and sell, and every payout they ask for is checked by a NEAR smart contract before any funds move.

Built for **NEAR Hackathon 2026** · Autonomous Business track (also Agent Economy, AI Swarms, AI Security & Defense).

- Contract on testnet: [`zero.agentzero-hq-87730.testnet`](https://testnet.nearblocks.io/address/zero.agentzero-hq-87730.testnet)
- Docs: [Architecture](docs/ARCHITECTURE.md) · [Contract](docs/CONTRACT.md) · [Security](docs/SECURITY.md) · [AI workforce](docs/AI-WORKFORCE.md) · [Demo script](docs/DEMO-SCRIPT.md) · [Setup](SETUP.md)

## What it does

1. **Create a company.** Name, mission, treasury and policy (per-payment limit, spending cap, minimum price, revenue split) are written to the contract, with five registered agent accounts.
2. **The CEO plans.** Atlas reads the mission and policy from the chain, plans 4 to 6 tasks and registers each one on-chain against the right agent. Budgets are clamped to policy before anything is created.
3. **The workforce delivers.** Research, Product, Sales and Finance agents produce real deliverables. The Product agent's report becomes a downloadable product, priced at or above the contract's floor.
4. **The contract pays.** Approval and payout are on-chain transactions. `pay_agent` runs eight checks and either transfers to the task's assignee or records a rejection.
5. **Agents can't break the rules.** The security test makes the Sales agent request more than the limit; the contract rejects it on-chain and records the attempt.

There is no sample data. Balances, policy, agents, task status and the ledger are read from the contract. Plans and deliverables written by the AI are kept off-chain in the browser.

## What works today

| Area | Status |
| --- | --- |
| Treasury contract (Rust) | Companies, policy, agents, tasks, payouts, sales with revenue split, pause, withdraw, on-chain ledger. 10 unit tests pass. |
| Payment enforcement | 8 ordered checks; failures are recorded on-chain and returned; funds never move |
| AI workforce | CEO planning as structured JSON, four specialists, autopilot, products from deliverables. Any OpenAI-compatible provider. |
| Web app | Landing, company launch wizard, dashboard, workforce, task market, products, treasury & security |
| Proven on testnet | Real payouts, a rejected over-limit self-transfer, a rejection for low treasury, companies created from the browser ([evidence](docs/SECURITY.md#evidence-on-testnet)) |

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill it in, or let scripts/setup-testnet.sh write it
npm run dev
```

Open <http://localhost:3000> → **Open the app** → **Create a company**.

- To deploy your own contract and seed a company: **[SETUP.md](SETUP.md)** (one script).
- To power the agents: any OpenAI-compatible key in `AI_API_KEY` (Groq has a free tier).
- To create companies from the browser while testing: set `NEAR_OWNER_ACCOUNT_ID` and `NEAR_OWNER_PRIVATE_KEY` in `.env.local`. Without them, owner actions become NEAR CLI commands you sign yourself.

## How the money is protected

```
Owner ──policy, pause──▶ Treasury contract ◀──payout request── Operator (app server) ◀── AI agents
                              │
                              └──transfer only to the task's assignee, only if all checks pass
```

| Account | Can do |
| --- | --- |
| **Owner** (human) | Create, fund, set policy, register agents, pause, withdraw |
| **Operator** (app server) | Create and approve tasks (if policy allows), request payouts. Cannot change policy, pause or withdraw. |
| **Agents** | Receive payouts. Hold no key that moves company funds; cannot call `pay_agent`. |

`pay_agent` checks, in order: company not paused · recipient is a registered agent · task exists · task approved · within per-payment limit · within spending cap · sufficient treasury · not already paid. Full interface in [docs/CONTRACT.md](docs/CONTRACT.md).

## Tech

Next.js 15 · TypeScript · Tailwind CSS 4 · Motion · Phosphor icons · zustand · near-api-js · Rust `near-sdk` 5.30 · cargo-near · NEAR testnet · OpenAI-compatible LLM (Groq `openai/gpt-oss-120b` in development)

## Project layout

```
app/                     routes: landing, launch, (app)/dashboard|agents|tasks|products|treasury, api/agents/*, api/near/*
components/              UI primitives, sidebar, shell, ledger, payment sheet, markdown, landing sections
lib/near/                RPC reads, operator signing (server), local owner signer (server, dev), client hooks, validation
lib/ai/                  LLM client, role prompts, orchestration
lib/                     store, roles, types
contracts/agent-zero/    Rust contract + unit tests
scripts/setup-testnet.sh one-shot deploy and seed
docs/                    architecture, contract, security, AI workforce, demo script
```

## License

MIT. Testnet only, no real funds.
