# Treasury contract

Source: [`contracts/agent-zero/src/lib.rs`](../contracts/agent-zero/src/lib.rs) · Rust · `near-sdk` 5.30 · deployed on testnet at `zero.agentzero-hq-87730.testnet`.

One contract hosts many companies. All amounts are yoctoNEAR strings (`1 NEAR = 10^24`).

## State

```rust
companies: LookupMap<String, Company>      // company_id → Company
tasks:     LookupMap<String, Task>         // "<company_id>/<task_id>" → Task
ledger:    Vector<LedgerEvent>             // append-only, all companies
```

`Company` holds name, mission, owner, operator, `paused`, `policy`, `agents`, `balance`, `spent`, `revenue`.

`Policy`:

| Field | Meaning |
| --- | --- |
| `max_payment` | Largest single payout |
| `spending_cap` | Total payouts allowed over the company's life |
| `minimum_price` | Lowest accepted sale price |
| `retained_bps` | Share of each sale kept in the treasury (8000 = 80%) |
| `operator_can_approve` | Whether the operator may approve tasks |

## Methods

### Owner
| Method | Notes |
| --- | --- |
| `create_company(company_id, name, mission, operator, policy)` | Payable; the deposit funds the treasury. Caller becomes owner. |
| `register_agent(company_id, account, role)` / `remove_agent` | Up to 16 agents |
| `set_policy(company_id, policy)` | Validated: `retained_bps ≤ 10000`, `max_payment ≤ spending_cap` |
| `set_operator(company_id, operator)` | |
| `pause_company` / `resume_company` | Pause blocks every payout and sale |
| `withdraw(company_id, amount)` | Back to the owner |
| `cancel_task(company_id, task_id)` | Not after payment |

### Owner or operator
| Method | Notes |
| --- | --- |
| `create_task(company_id, task_id, agent, budget)` | |
| `approve_task(company_id, task_id)` | Operator only if `operator_can_approve` |
| `pay_agent(company_id, task_id, amount) → PaymentOutcome` | See below |

### Anyone
| Method | Notes |
| --- | --- |
| `deposit(company_id)` | Payable |
| `purchase(company_id, product_id)` | Payable; price ≥ `minimum_price`; splits revenue |

### Views
`get_company(company_id)`, `get_task(company_id, task_id)`, `get_ledger(company_id, before?, limit?)` (newest first, max 100).

## `pay_agent`: eight checks, in order

1. Company not paused
2. Recipient authorized (task assignee is a registered agent)
3. Task exists
4. Task approved
5. Within per-payment limit
6. Within spending cap
7. Sufficient treasury
8. Not already paid

The recipient is always the task's assignee; a caller cannot redirect funds.

**A failed check does not panic.** The attempt is appended to the ledger as `Rejected` with a reason, logged as `REJECTED <check>: <reason>`, and the call returns:

```json
{ "ok": false, "failed_check": "Within per-payment limit", "reason": "Exceeds individual payment limit of 3000000000000000000000000 yoctoNEAR" }
```

So a blocked payment is itself a verifiable transaction. Calls from the wrong account **do** panic (`Only the owner or operator can do this`).

## `purchase`: revenue split

`worker_total = price × (10000 − retained_bps) / 10000`, divided equally between registered agents and transferred in the same call. The rest stays in the treasury. Both the `Revenue` and each `Distribution` are recorded.

## Events

Every ledger entry is also emitted as a log line:

```
EVENT_JSON:{"standard":"agent-zero","version":"1.0.0","event":"Payment","data":{...}}
```

## Tests

```bash
cd contracts/agent-zero && cargo test
```

10 unit tests: pays an approved task; rejects over the individual limit and records it; rejects unapproved tasks; rejects while paused; rejects double payment; rejects removed agents; agents cannot call `pay_agent`; operator cannot change policy; sale splits revenue; sale below minimum fails.

## Build and deploy

```bash
cargo near build non-reproducible-wasm --no-abi
near contract deploy <account> use-file target/near/agent_zero.wasm with-init-call new json-args '{}' prepaid-gas '30.0 Tgas' attached-deposit '0 NEAR' network-config testnet sign-with-legacy-keychain send
```

`--no-abi` avoids ABI generation, which links a native library and fails on the Windows GNU toolchain. `scripts/setup-testnet.sh` does all of this plus seeding.
