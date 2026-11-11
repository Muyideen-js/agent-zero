#!/usr/bin/env bash
# One-shot NEAR testnet setup for Agent Zero.
#
#   OWNER=yourname.testnet ./scripts/setup-testnet.sh
#
# Requires: near (near-cli-rs), cargo-near, Rust, Node.
# OWNER must already exist and be in your legacy keychain (~/.near-credentials).
# Creates sub-accounts of OWNER, deploys the contract, creates the InsightForge
# company with its policy, registers five agents, creates and approves tasks,
# and writes .env.local for the Next.js app.
set -euo pipefail

: "${OWNER:?Set OWNER, e.g. OWNER=yourname.testnet ./scripts/setup-testnet.sh}"
NET=testnet
CONTRACT="${CONTRACT:-zero.$OWNER}"
OPERATOR="${OPERATOR:-ops.$OWNER}"
COMPANY="${COMPANY:-insightforge}"
TREASURY="${TREASURY:-5}"          # NEAR funded into the company treasury
CONTRACT_FUNDING="${CONTRACT_FUNDING:-3}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Make cargo, near and (on Windows) the MinGW linker tools available
export PATH="$HOME/.cargo/bin:$PATH"
for d in "${LOCALAPPDATA:-}"/Microsoft/WinGet/Packages/BrechtSanders.WinLibs*/mingw64/bin; do [ -d "$d" ] && export PATH="$d:$PATH"; done

yocto() { node -e "console.log((BigInt(Math.round($1*1e6))*10n**18n).toString())"; }

say() { printf '\n\033[1;32m▸ %s\033[0m\n' "$*"; }

exists() { near account view-account-summary "$1" network-config "$NET" now >/dev/null 2>&1; }

create_sub() { # <account> <NEAR>
  if exists "$1"; then echo "  ✓ $1 already exists"; return; fi
  near account create-account fund-myself "$1" "$2 NEAR" autogenerate-new-keypair save-to-legacy-keychain \
    sign-as "$OWNER" network-config "$NET" sign-with-legacy-keychain send
}

call() { # <method> <json> [deposit] [signer]
  near contract call-function as-transaction "$CONTRACT" "$1" json-args "$2" \
    prepaid-gas '100.0 Tgas' attached-deposit "${3:-0 NEAR}" \
    sign-as "${4:-$OWNER}" network-config "$NET" sign-with-legacy-keychain send
}

say "Checking tools"
command -v near >/dev/null || { echo "near CLI not found. See SETUP.md step 1."; exit 1; }
command -v cargo >/dev/null || { echo "Rust/cargo not found. See SETUP.md step 1."; exit 1; }
cargo near --version >/dev/null 2>&1 || { echo "cargo-near not found. See SETUP.md step 1."; exit 1; }
exists "$OWNER" || { echo "$OWNER does not exist on $NET. See SETUP.md step 2."; exit 1; }

say "Creating accounts under $OWNER"
create_sub "$CONTRACT" "$CONTRACT_FUNDING"
create_sub "$OPERATOR" 0.5
AGENTS=(atlas:ceo meridian:research forge:product halcyon:sales ledger:finance)
for pair in "${AGENTS[@]}"; do create_sub "${pair%%:*}.$OWNER" 0.1; done

say "Building and deploying the contract to $CONTRACT"
cd "$ROOT/contracts/agent-zero"
# --no-abi: ABI generation links a native library, which fails on the Windows GNU host.
cargo near build non-reproducible-wasm --no-abi
WASM="$ROOT/contracts/agent-zero/target/near/agent_zero.wasm"
[ -f "$WASM" ] || { echo "Build did not produce $WASM"; exit 1; }
if [ "${REDEPLOY:-0}" = "1" ]; then
  near contract deploy "$CONTRACT" use-file "$WASM" without-init-call network-config "$NET" sign-with-legacy-keychain send
else
  near contract deploy "$CONTRACT" use-file "$WASM" with-init-call new json-args '{}' \
    prepaid-gas '30.0 Tgas' attached-deposit '0 NEAR' network-config "$NET" sign-with-legacy-keychain send
fi
cd "$ROOT"

say "Creating company '$COMPANY' with a $TREASURY NEAR treasury"
POLICY="{\"max_payment\":\"$(yocto 3)\",\"spending_cap\":\"$(yocto 10)\",\"minimum_price\":\"$(yocto 5)\",\"retained_bps\":8000,\"operator_can_approve\":true}"
call create_company "{\"company_id\":\"$COMPANY\",\"name\":\"InsightForge AI\",\"mission\":\"Research an emerging market and produce a professional market intelligence report that customers will pay for.\",\"operator\":\"$OPERATOR\",\"policy\":$POLICY}" "$TREASURY NEAR"

say "Registering the workforce"
for pair in "${AGENTS[@]}"; do
  call register_agent "{\"company_id\":\"$COMPANY\",\"account\":\"${pair%%:*}.$OWNER\",\"role\":\"${pair##*:}\"}"
done

say "Creating tasks"
task() { call create_task "{\"company_id\":\"$COMPANY\",\"task_id\":\"$1\",\"agent\":\"$2.$OWNER\",\"budget\":\"$(yocto "$3")\"}"; }
task T-100 halcyon 0.5
task T-101 meridian 2.5
task T-102 meridian 1.5
task T-103 forge 3
task T-104 halcyon 2
task T-105 ledger 1

say "Approving finished work (T-100 to T-103)"
for t in T-100 T-101 T-102 T-103; do call approve_task "{\"company_id\":\"$COMPANY\",\"task_id\":\"$t\"}"; done

say "Writing .env.local"
KEYFILE="$HOME/.near-credentials/$NET/$OPERATOR.json"
OP_KEY="$(node -e 'console.log(require(process.argv[1]).private_key)' "$KEYFILE")"
KEEP_AI="$(grep -E "^#? ?AI_" "$ROOT/.env.local" 2>/dev/null || true)"
cat > "$ROOT/.env.local" <<EOF
NEXT_PUBLIC_NEAR_NETWORK=$NET
NEXT_PUBLIC_NEAR_CONTRACT_ID=$CONTRACT
NEXT_PUBLIC_NEAR_COMPANY_ID=$COMPANY
NEAR_OPERATOR_ACCOUNT_ID=$OPERATOR
NEAR_OPERATOR_PRIVATE_KEY=$OP_KEY
EOF
if [ -n "$KEEP_AI" ]; then printf '\n%s\n' "$KEEP_AI" >> "$ROOT/.env.local"; fi

say "Done"
cat <<EOF

  Contract:  https://testnet.nearblocks.io/address/$CONTRACT
  Company:   $COMPANY  (owner $OWNER, operator $OPERATOR)

  Next: restart the app (npm run dev) and open http://localhost:3000/treasury
  Press "Run attack on-chain" to watch the contract reject a 5 NEAR self-transfer.
EOF
