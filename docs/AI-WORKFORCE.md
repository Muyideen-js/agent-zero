# AI workforce

Five roles, each with a fixed prompt and a narrow job. Prompts are in [`lib/ai/prompts.ts`](../lib/ai/prompts.ts).

| Agent | Role | Output |
| --- | --- | --- |
| Atlas | CEO | JSON plan: 4 to 6 tasks with id, title, description, role, budget, dependencies |
| Meridian | Research | Markdown research brief: overview, players, buyer needs, opportunities, risks, assumptions, sources |
| Forge | Product | Markdown market intelligence report for paying customers; published as a product |
| Halcyon | Sales | JSON listing: title, tagline, description, price, price rationale, launch posts |
| Ledger | Finance | Markdown financial report from the on-chain ledger |

## Guardrails

- **Budgets.** The CEO's budgets are clamped server-side to the per-payment limit and the remaining spending cap read from the contract.
- **Price floor.** The Sales agent's price is raised to the contract's minimum if the model proposes less.
- **Sources.** The Research agent has no live web access; it is told to list only sources it is confident exist, mark them "verify before publishing", and label estimates. The UI shows an "AI-generated, not independently verified" notice on every deliverable.
- **Numbers.** The Finance agent receives only on-chain figures and is told never to invent transactions or use non-NEAR currencies.
- **No keys.** Prompts never contain keys or signing material.

## Orchestration

[`lib/ai/client.ts`](../lib/ai/client.ts):

- `runCEO(chain)`: plan → map roles to registered agent accounts → register tasks on-chain → store.
- `runTask(chain, id)`: gather deliverables of dependencies (or the on-chain ledger for Finance) → run the role → store. Product output becomes a product; Sales output updates its price and description.
- `runAutopilot(chain)`: plan if nothing is outstanding, then run every task without a deliverable in dependency order.

Approval and payment are deliberately not automatic: they are on-chain actions taken from the Task market.

## Provider

Any OpenAI-compatible chat endpoint ([`lib/ai/llm.ts`](../lib/ai/llm.ts)):

```bash
AI_API_KEY=...
AI_BASE_URL=https://api.groq.com/openai/v1   # default: https://cloud-api.near.ai/v1
AI_MODEL=openai/gpt-oss-120b
```

Free tiers limit tokens per minute. The client honours `retry-after` / "try again in Ns" and retries up to five times, uses low reasoning effort for reasoning models, and caps context and output tokens.
