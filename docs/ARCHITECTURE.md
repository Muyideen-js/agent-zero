# Architecture

Agent Zero splits an AI-run business into three layers with a hard boundary between them: the AI decides what to do, the contract decides what can be paid for, and the ledger records what happened.

```
┌──────────────────────────── Browser (Next.js app) ────────────────────────────┐
│  Landing · Launch wizard · Dashboard · Workforce · Task market · Products ·   │
│  Treasury & security                                                           │
│  zustand store (off-chain work: plans, deliverables, products, activity)       │
└──────────────┬───────────────────────────────┬────────────────────────────────┘
               │ /api/agents/*                  │ /api/near/*
┌──────────────▼──────────────┐   ┌─────────────▼───────────────────────────────┐
│ AI layer (server routes)    │   │ NEAR layer (server routes)                   │
│ CEO plan · specialist runs  │   │ state: JSON-RPC views (no keys)              │
│ OpenAI-compatible provider  │   │ tasks/approve/pay: operator key signs        │
│ budgets clamped to policy   │   │ owner: local-only owner signer (dev)         │
└─────────────────────────────┘   └─────────────┬───────────────────────────────┘
                                                │ function calls
                                  ┌─────────────▼───────────────────────────────┐
                                  │ agent-zero contract (Rust, NEAR testnet)     │
                                  │ companies · policy · agents · tasks ·        │
                                  │ treasury balances · ledger · pause           │
                                  └──────────────────────────────────────────────┘
```

## What lives where

| Data | Location | Why |
| --- | --- | --- |
| Treasury balance, spend, revenue | Contract | Money must be authoritative and verifiable |
| Policy (limits, cap, floor, split) | Contract | Only the owner may change it |
| Registered agents | Contract | Payouts can only go to them |
| Task id, assignee, budget, status | Contract | Payment checks need them |
| Ledger (deposits, payouts, rejections, sales) | Contract | Rejected attempts are evidence too |
| Mission and company name | Contract | The CEO plans from on-chain truth |
| Plans, deliverables, reports, activity | Browser (zustand + localStorage) | Text does not belong on-chain |

The app never derives a balance from local data. Every money figure on screen comes from `get_company` / `get_ledger`.

## Accounts and keys

| Account | Holds a key in the app? | Can do |
| --- | --- | --- |
| Owner (human) | No (except the local dev signer, see below) | Create company, deposit, set policy, register agents, pause/resume, withdraw |
| Operator (app server) | Yes, server env only | Create tasks, approve tasks (if policy allows), request payouts |
| Agents | Never | Receive payouts |
| Customer | No | `purchase` a product with an attached deposit |

The operator key is read only in server routes (`lib/near/operator.ts`, guarded by `server-only`). It is never sent to the browser or to a model prompt.

### Local owner signer

For testing on your own machine, `NEAR_OWNER_ACCOUNT_ID` / `NEAR_OWNER_PRIVATE_KEY` in `.env.local` let the app sign owner actions (create company, pause, resume, deposit, set policy) from the browser. When those variables are absent, as on any public deployment, every owner action becomes a copy-paste NEAR CLI command the owner signs themselves.

## Request flows

### Plan and work
1. Browser calls `/api/agents/plan` with the on-chain mission and policy.
2. The model returns a JSON plan; the server clamps every budget to `max_payment` and the remaining cap.
3. Browser assigns each task to the agent account registered for that role and calls `/api/near/tasks`, which signs one `create_task` per task as the operator.
4. For each task in dependency order, the browser calls `/api/agents/run` with the deliverables it depends on. Results are stored off-chain.

### Approve and pay
1. `/api/near/approve` → `approve_task` (operator, only if `operator_can_approve`).
2. `/api/near/pay` → `pay_agent(company_id, task_id, amount)`. The contract runs eight checks and either transfers to the task's assignee or records a rejection. The response includes the transaction hash and a NearBlocks link.

### Read
`/api/near/state?company=<id>&tasks=<ids>` makes JSON-RPC view calls (`get_company`, `get_ledger`, `get_task`). The client polls it every 8 seconds through `ChainProvider`.

## Code map

```
app/
  page.tsx                 landing
  launch/                  company creation wizard
  (app)/                   dashboard, agents, tasks, products, treasury (+ shell)
  api/agents/              plan, run, status
  api/near/                state, tasks, approve, pay, owner
components/                ui primitives, sidebar, shell, ledger, payment sheet, markdown, landing sections
lib/near/                  config, rpc, operator (server), owner (server, dev), client hooks, validation
lib/ai/                    llm client, prompts, orchestration
lib/                       store, roles, types
contracts/agent-zero/      Rust contract + unit tests
scripts/setup-testnet.sh   one-shot deploy and seed
```
