# Putting Agent Zero on NEAR testnet

Commands are for Windows with **Git Bash** unless marked PowerShell.

## 1. Tools (once)

| Tool | How it was installed on the dev machine |
| --- | --- |
| Rust (stable, GNU host) | `rustup-init.exe -y --default-host x86_64-pc-windows-gnu` from rustup.rs, then `rustup target add wasm32-unknown-unknown` |
| MinGW (linker tools for the GNU host) | PowerShell: `winget install BrechtSanders.WinLibs.POSIX.UCRT` |
| cargo-near | Release `cargo-near-x86_64-pc-windows-msvc.tar.gz` from github.com/near/cargo-near, `cargo-near.exe` copied to `~/.cargo/bin` |
| NEAR CLI | Release `near-cli-rs-x86_64-pc-windows-msvc.tar.gz` from github.com/near/near-cli-rs, `near.exe` copied to `~/.cargo/bin` |

If you already have Visual Studio C++ Build Tools, the default MSVC Rust host works too and MinGW is not needed.

## 2. Owner account (free, from the faucet)

```bash
near account create-account sponsor-by-faucet-service YOURNAME.testnet autogenerate-new-keypair save-to-legacy-keychain network-config testnet create
```

## 3. Deploy and seed everything

```bash
OWNER=YOURNAME.testnet bash scripts/setup-testnet.sh
```

This creates `zero.YOURNAME.testnet` (contract), `ops.YOURNAME.testnet` (the app's operator) and five agent accounts, deploys the contract, creates **InsightForge AI** with a 5 NEAR treasury and the demo policy (3 NEAR per payment, 10 NEAR cap, 5 NEAR minimum price, 80/20 split), registers the agents, creates tasks T-100 to T-105, approves T-100 to T-103, and writes `.env.local`.

## 4. Turn on the AI workforce

Add a key for any OpenAI-compatible provider to `.env.local`. Groq has a free tier (console.groq.com, no card):

```bash
AI_API_KEY=gsk_...
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=openai/gpt-oss-120b
```

NEAR AI Cloud works the same way (`AI_BASE_URL=https://cloud-api.near.ai/v1`). Free tiers limit tokens per minute; the app waits and retries automatically.

## 5. Run

```bash
npm run dev
```

- **Treasury** (`/treasury`): balance, policy and ledger come from the contract. *Run attack on-chain* sends a real 5 NEAR request that the contract rejects and records.
- **Task market**: *Ask the CEO for a plan* or *Run autopilot* to have the agents plan and produce real deliverables. *Request payout* on an approved task sends a real payout.
- **Products**: the Product agent's report appears here and downloads as Markdown.
- **Pause**: copy the owner command from the Emergency card and run it. The app never holds the owner key.

## Contract tests

```bash
cd contracts/agent-zero && cargo test
```

## Optional: a testnet sale

From a second faucet account with at least 5 NEAR:

```bash
near contract call-function as-transaction zero.YOURNAME.testnet purchase json-args '{"company_id":"insightforge","product_id":"P-1"}' prepaid-gas '100.0 Tgas' attached-deposit '7 NEAR' sign-as BUYER.testnet network-config testnet sign-with-legacy-keychain send
```

## Troubleshooting

- **Not enough balance**: the owner needs about 9 NEAR. Use `TREASURY=3` to fund less.
- **Re-running after a deploy**: `REDEPLOY=1` skips re-initialising; use `COMPANY=insightforge2` if the company already exists and update `.env.local`.
