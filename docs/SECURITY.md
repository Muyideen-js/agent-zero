# Security model

The model is never trusted to police itself. Financial rules are enforced by the contract; the app only relays requests.

## Threats and controls

| Threat | Control | Where |
| --- | --- | --- |
| Payment to an unauthorized account | Recipient is the task assignee, who must be a registered agent | `pay_agent` check 2 |
| Oversized payment | Per-payment limit | `pay_agent` check 5 |
| Runaway spending | Lifetime spending cap | `pay_agent` check 6 |
| Paying for unapproved work | Task must be `Approved` | `pay_agent` check 4 |
| Duplicate payout | Task moves to `Paid`; second request rejected | `pay_agent` check 8 |
| Live incident | Owner pause blocks every payout and sale | `pay_agent` check 1, `purchase` |
| Agent calling the treasury directly | Only owner or operator may call `pay_agent` | `assert_owner_or_operator` |
| Operator changing the rules | Policy, pause, agents, withdraw are owner-only | `assert_owner` |
| Model overspending in its plan | Server clamps every budget to policy before tasks are created | `app/api/agents/plan` |
| Model under-pricing a product | Server enforces the minimum price on the Sales agent's output | `app/api/agents/run` |
| Key exposure to the model | Keys live only in server env; prompts contain mission, task text and public ledger data | `lib/near/operator.ts`, `lib/ai/*` |
| Key exposure to the browser | Signing happens in server routes marked `server-only` | `lib/near/operator.ts`, `lib/near/owner.ts` |
| Fake confirmations | Every money figure is read from contract state; payouts return the real transaction hash | `/api/near/state`, `/api/near/pay` |
| Malformed input to routes | Company, task and account ids validated by regex; amounts bounded | `lib/near/validate.ts` |

## Evidence on testnet

Contract `zero.agentzero-hq-87730.testnet`:

- Rejected 5 NEAR self-transfer (over the 3 NEAR limit): `BN5VKKxKF8u6DiWN3GKCqoGqm7nwVBnwzUoerKw2zPhF`
- Paid 0.5 NEAR for an approved task: `7H1zXZXDGTapxArT5jXsQb1kSKPW4bMM5twtkNNTrVKq`
- Paid 2.5 NEAR to the Research agent for AI-produced work: `7S9SLmg9kon72zeBSzoBDGcknVbcmgZSKkCC6a9DKoS1`
- Rejected a 2.5 NEAR payout because the treasury was too low (visible in `get_ledger`)

View any of them at `https://testnet.nearblocks.io/txns/<hash>`.

## Known limits

- The operator key is hot on the server. A compromised server can request payouts, but only within the owner's policy: approved tasks, registered agents, under the limits and cap. It cannot change policy, pause, or withdraw.
- The local owner signer holds the owner key in `.env.local` for development. It must not be configured on a public deployment.
- AI deliverables are stored in the browser. They are work product, not financial records.
- Testnet only. No real funds.
