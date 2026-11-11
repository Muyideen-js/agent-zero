//! Agent Zero treasury contract.
//!
//! One contract hosts many companies. Each company has an owner (a human),
//! an operator (the Agent Zero server, which acts for the AI workforce),
//! a set of registered agent accounts, tasks with budgets, and a treasury
//! balance tracked inside this contract.
//!
//! Agents never hold keys that can move company funds. The operator may
//! *request* a payout for a task; this contract checks the owner's policy
//! and either transfers to the task's assignee or records a rejection.
//!
//! Policy failures do NOT panic: the attempt is written to the on-chain
//! ledger and the call returns `PaymentOutcome { ok: false, reason }`, so
//! a blocked payment is itself verifiable on the explorer. Authorization
//! failures (wrong caller) do panic.

use near_sdk::json_types::U128;
use near_sdk::store::{LookupMap, Vector};
use near_sdk::{env, near, require, AccountId, BorshStorageKey, NearToken, PanicOnDefault, Promise};

const MAX_LEDGER_PAGE: u64 = 100;
const MAX_AGENTS: usize = 16;

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
enum StorageKey {
    Companies,
    Tasks,
    Ledger,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Policy {
    /// Largest single agent payout, in yoctoNEAR.
    pub max_payment: U128,
    /// Total agent payouts allowed over the company's life, in yoctoNEAR.
    pub spending_cap: U128,
    /// Lowest accepted price for a product sale, in yoctoNEAR.
    pub minimum_price: U128,
    /// Share of each sale kept in the treasury, in basis points (8000 = 80%).
    /// The rest is split equally between registered agents.
    pub retained_bps: u16,
    /// Whether the operator may approve tasks without the owner.
    pub operator_can_approve: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Agent {
    pub account: AccountId,
    pub role: String,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Company {
    pub id: String,
    pub name: String,
    pub mission: String,
    pub owner: AccountId,
    pub operator: AccountId,
    pub paused: bool,
    pub policy: Policy,
    pub agents: Vec<Agent>,
    /// Funds available to the company, in yoctoNEAR.
    pub balance: U128,
    /// Total paid to agents for tasks, in yoctoNEAR.
    pub spent: U128,
    /// Total gross revenue from sales, in yoctoNEAR.
    pub revenue: U128,
    pub created_at_ms: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum TaskStatus {
    Open,
    Approved,
    Paid,
    Cancelled,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Task {
    pub id: String,
    pub agent: AccountId,
    pub budget: U128,
    pub status: TaskStatus,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum EventKind {
    Deposit,
    Payment,
    Rejected,
    Revenue,
    Distribution,
    Withdrawal,
    PolicyUpdated,
    Paused,
    Resumed,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct LedgerEvent {
    pub index: u64,
    pub company_id: String,
    pub kind: EventKind,
    pub amount: U128,
    pub counterparty: Option<AccountId>,
    pub task_id: Option<String>,
    pub reason: Option<String>,
    pub timestamp_ms: u64,
}

#[near(serializers = [json])]
#[derive(Debug, PartialEq)]
pub struct PaymentOutcome {
    pub ok: bool,
    /// Name of the first failed check, if any.
    pub failed_check: Option<String>,
    pub reason: Option<String>,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    companies: LookupMap<String, Company>,
    /// Keyed by "<company_id>/<task_id>".
    tasks: LookupMap<String, Task>,
    ledger: Vector<LedgerEvent>,
}

fn task_key(company_id: &str, task_id: &str) -> String {
    format!("{company_id}/{task_id}")
}

fn now_ms() -> u64 {
    env::block_timestamp_ms()
}

#[near]
impl Contract {
    #[init]
    pub fn new() -> Self {
        Self {
            companies: LookupMap::new(StorageKey::Companies),
            tasks: LookupMap::new(StorageKey::Tasks),
            ledger: Vector::new(StorageKey::Ledger),
        }
    }

    /* ───────────── Company lifecycle (owner) ───────────── */

    /// Creates a company owned by the caller. Any attached NEAR funds the treasury.
    #[payable]
    pub fn create_company(&mut self, company_id: String, name: String, mission: String, operator: AccountId, policy: Policy) {
        require!(!company_id.is_empty() && company_id.len() <= 64 && !company_id.contains('/'), "Invalid company_id");
        require!(self.companies.get(&company_id).is_none(), "Company already exists");
        Self::assert_policy(&policy);

        let deposit = env::attached_deposit().as_yoctonear();
        let owner = env::predecessor_account_id();
        let company = Company {
            id: company_id.clone(),
            name,
            mission,
            owner: owner.clone(),
            operator,
            paused: false,
            policy,
            agents: vec![],
            balance: U128(deposit),
            spent: U128(0),
            revenue: U128(0),
            created_at_ms: now_ms(),
        };
        self.companies.insert(company_id.clone(), company);
        if deposit > 0 {
            self.record(&company_id, EventKind::Deposit, deposit, Some(owner), None, None);
        }
    }

    /// Adds funds to a company treasury. Anyone may deposit.
    #[payable]
    pub fn deposit(&mut self, company_id: String) {
        let amount = env::attached_deposit().as_yoctonear();
        require!(amount > 0, "Attach NEAR to deposit");
        let mut c = self.company(&company_id);
        c.balance = U128(c.balance.0 + amount);
        self.companies.insert(company_id.clone(), c);
        self.record(&company_id, EventKind::Deposit, amount, Some(env::predecessor_account_id()), None, None);
    }

    pub fn register_agent(&mut self, company_id: String, account: AccountId, role: String) {
        let mut c = self.company(&company_id);
        Self::assert_owner(&c);
        require!(c.agents.len() < MAX_AGENTS, "Too many agents");
        require!(!c.agents.iter().any(|a| a.account == account), "Agent already registered");
        c.agents.push(Agent { account, role });
        self.companies.insert(company_id, c);
    }

    pub fn remove_agent(&mut self, company_id: String, account: AccountId) {
        let mut c = self.company(&company_id);
        Self::assert_owner(&c);
        c.agents.retain(|a| a.account != account);
        self.companies.insert(company_id, c);
    }

    pub fn set_policy(&mut self, company_id: String, policy: Policy) {
        let mut c = self.company(&company_id);
        Self::assert_owner(&c);
        Self::assert_policy(&policy);
        c.policy = policy;
        self.companies.insert(company_id.clone(), c);
        self.record(&company_id, EventKind::PolicyUpdated, 0, None, None, None);
    }

    pub fn set_operator(&mut self, company_id: String, operator: AccountId) {
        let mut c = self.company(&company_id);
        Self::assert_owner(&c);
        c.operator = operator;
        self.companies.insert(company_id, c);
    }

    pub fn pause_company(&mut self, company_id: String) {
        let mut c = self.company(&company_id);
        Self::assert_owner(&c);
        c.paused = true;
        self.companies.insert(company_id.clone(), c);
        self.record(&company_id, EventKind::Paused, 0, None, None, None);
    }

    pub fn resume_company(&mut self, company_id: String) {
        let mut c = self.company(&company_id);
        Self::assert_owner(&c);
        c.paused = false;
        self.companies.insert(company_id.clone(), c);
        self.record(&company_id, EventKind::Resumed, 0, None, None, None);
    }

    /// Owner pulls funds back out of the treasury.
    pub fn withdraw(&mut self, company_id: String, amount: U128) -> Promise {
        let mut c = self.company(&company_id);
        Self::assert_owner(&c);
        require!(amount.0 > 0 && amount.0 <= c.balance.0, "Insufficient treasury balance");
        c.balance = U128(c.balance.0 - amount.0);
        let owner = c.owner.clone();
        self.companies.insert(company_id.clone(), c);
        self.record(&company_id, EventKind::Withdrawal, amount.0, Some(owner.clone()), None, None);
        Promise::new(owner).transfer(NearToken::from_yoctonear(amount.0))
    }

    /* ───────────── Work (owner or operator) ───────────── */

    pub fn create_task(&mut self, company_id: String, task_id: String, agent: AccountId, budget: U128) {
        let c = self.company(&company_id);
        Self::assert_owner_or_operator(&c);
        require!(!task_id.is_empty() && task_id.len() <= 32, "Invalid task_id");
        let key = task_key(&company_id, &task_id);
        require!(self.tasks.get(&key).is_none(), "Task already exists");
        self.tasks.insert(key, Task { id: task_id, agent, budget, status: TaskStatus::Open });
    }

    pub fn approve_task(&mut self, company_id: String, task_id: String) {
        let c = self.company(&company_id);
        let caller = env::predecessor_account_id();
        require!(caller == c.owner || (caller == c.operator && c.policy.operator_can_approve), "Not allowed to approve tasks");
        let key = task_key(&company_id, &task_id);
        let mut t = self.tasks.get(&key).cloned().unwrap_or_else(|| env::panic_str("Task not found"));
        require!(t.status == TaskStatus::Open, "Task is not open");
        t.status = TaskStatus::Approved;
        self.tasks.insert(key, t);
    }

    pub fn cancel_task(&mut self, company_id: String, task_id: String) {
        let c = self.company(&company_id);
        Self::assert_owner(&c);
        let key = task_key(&company_id, &task_id);
        let mut t = self.tasks.get(&key).cloned().unwrap_or_else(|| env::panic_str("Task not found"));
        require!(t.status != TaskStatus::Paid, "Task already paid");
        t.status = TaskStatus::Cancelled;
        self.tasks.insert(key, t);
    }

    /// Requests a payout for a task. Funds can only go to the task's assignee.
    /// Runs eight checks in order and stops at the first failure.
    pub fn pay_agent(&mut self, company_id: String, task_id: String, amount: U128) -> PaymentOutcome {
        let mut c = self.company(&company_id);
        Self::assert_owner_or_operator(&c);

        let key = task_key(&company_id, &task_id);
        let task = self.tasks.get(&key).cloned();
        let recipient = task.as_ref().map(|t| t.agent.clone());

        let checks: [(&str, bool, String); 8] = [
            ("Company not paused", !c.paused, "Company is paused by its owner".into()),
            (
                "Recipient authorized",
                recipient.as_ref().map(|r| c.agents.iter().any(|a| &a.account == r)).unwrap_or(true),
                "Recipient is not a registered agent of this company".into(),
            ),
            ("Task exists", task.is_some(), format!("No task {task_id} in this company")),
            (
                "Task approved",
                task.as_ref().map(|t| t.status == TaskStatus::Approved || t.status == TaskStatus::Paid).unwrap_or(false),
                "Task has not been approved".into(),
            ),
            (
                "Within per-payment limit",
                amount.0 <= c.policy.max_payment.0,
                format!("Exceeds individual payment limit of {} yoctoNEAR", c.policy.max_payment.0),
            ),
            (
                "Within spending cap",
                c.spent.0.saturating_add(amount.0) <= c.policy.spending_cap.0,
                "Exceeds the company's total agent spending cap".into(),
            ),
            ("Sufficient treasury", amount.0 <= c.balance.0, "Treasury balance is too low".into()),
            (
                "Not already paid",
                task.as_ref().map(|t| t.status != TaskStatus::Paid).unwrap_or(true),
                "Task has already been paid".into(),
            ),
        ];

        if let Some((name, _, reason)) = checks.iter().find(|(_, ok, _)| !ok) {
            self.record(&company_id, EventKind::Rejected, amount.0, recipient, Some(task_id), Some(reason.clone()));
            env::log_str(&format!("REJECTED {name}: {reason}"));
            return PaymentOutcome { ok: false, failed_check: Some(name.to_string()), reason: Some(reason.clone()) };
        }
        require!(amount.0 > 0, "Amount must be positive");

        let mut task = task.unwrap();
        let to = task.agent.clone();
        task.status = TaskStatus::Paid;
        self.tasks.insert(key, task);
        c.balance = U128(c.balance.0 - amount.0);
        c.spent = U128(c.spent.0 + amount.0);
        self.companies.insert(company_id.clone(), c);
        self.record(&company_id, EventKind::Payment, amount.0, Some(to.clone()), Some(task_id), None);
        let _ = Promise::new(to).transfer(NearToken::from_yoctonear(amount.0));
        PaymentOutcome { ok: true, failed_check: None, reason: None }
    }

    /* ───────────── Sales (anyone) ───────────── */

    /// A customer buys a product. The attached deposit is the price and must
    /// meet the company's minimum. Revenue is split per policy: the retained
    /// share stays in the treasury, the rest is paid equally to registered agents.
    #[payable]
    pub fn purchase(&mut self, company_id: String, product_id: String) {
        let price = env::attached_deposit().as_yoctonear();
        let mut c = self.company(&company_id);
        require!(!c.paused, "Company is paused");
        require!(price >= c.policy.minimum_price.0, "Price is below the company's minimum");

        let worker_total = price * (10_000 - c.policy.retained_bps as u128) / 10_000;
        let n = c.agents.len() as u128;
        let share = if n > 0 { worker_total / n } else { 0 };
        let distributed = share * n;

        c.revenue = U128(c.revenue.0 + price);
        c.balance = U128(c.balance.0 + price - distributed);
        let agents: Vec<AccountId> = c.agents.iter().map(|a| a.account.clone()).collect();
        self.companies.insert(company_id.clone(), c);

        let buyer = env::predecessor_account_id();
        self.record(&company_id, EventKind::Revenue, price, Some(buyer), Some(product_id.clone()), None);
        if share > 0 {
            for a in agents {
                self.record(&company_id, EventKind::Distribution, share, Some(a.clone()), Some(product_id.clone()), None);
                let _ = Promise::new(a).transfer(NearToken::from_yoctonear(share));
            }
        }
    }

    /* ───────────── Views ───────────── */

    pub fn get_company(&self, company_id: String) -> Option<Company> {
        self.companies.get(&company_id).cloned()
    }

    pub fn get_task(&self, company_id: String, task_id: String) -> Option<Task> {
        self.tasks.get(&task_key(&company_id, &task_id)).cloned()
    }

    /// Newest-first page of a company's ledger. `before` is an exclusive global index.
    pub fn get_ledger(&self, company_id: String, before: Option<u64>, limit: Option<u64>) -> Vec<LedgerEvent> {
        let limit = limit.unwrap_or(50).min(MAX_LEDGER_PAGE) as usize;
        let mut i = before.unwrap_or(self.ledger.len() as u64).min(self.ledger.len() as u64);
        let mut out = Vec::new();
        while i > 0 && out.len() < limit {
            i -= 1;
            if let Some(e) = self.ledger.get(i as u32) {
                if e.company_id == company_id {
                    out.push(e.clone());
                }
            }
        }
        out
    }

    /* ───────────── Internals ───────────── */

    fn company(&self, company_id: &str) -> Company {
        self.companies.get(company_id).cloned().unwrap_or_else(|| env::panic_str("Company not found"))
    }

    fn assert_owner(c: &Company) {
        require!(env::predecessor_account_id() == c.owner, "Only the company owner can do this");
    }

    fn assert_owner_or_operator(c: &Company) {
        let caller = env::predecessor_account_id();
        require!(caller == c.owner || caller == c.operator, "Only the owner or operator can do this");
    }

    fn assert_policy(p: &Policy) {
        require!(p.retained_bps <= 10_000, "retained_bps must be at most 10000");
        require!(p.max_payment.0 <= p.spending_cap.0, "max_payment cannot exceed spending_cap");
    }

    fn record(&mut self, company_id: &str, kind: EventKind, amount: u128, counterparty: Option<AccountId>, task_id: Option<String>, reason: Option<String>) {
        let index = self.ledger.len() as u64;
        let ev = LedgerEvent { index, company_id: company_id.to_string(), kind, amount: U128(amount), counterparty, task_id, reason, timestamp_ms: now_ms() };
        env::log_str(&format!(
            "EVENT_JSON:{{\"standard\":\"agent-zero\",\"version\":\"1.0.0\",\"event\":\"{:?}\",\"data\":{}}}",
            ev.kind,
            near_sdk::serde_json::to_string(&ev).unwrap_or_default()
        ));
        self.ledger.push(ev);
    }
}

/* ───────────────────────── Tests ───────────────────────── */

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    const NEAR: u128 = 10u128.pow(24);

    fn ctx(caller: AccountId, deposit: u128) {
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(caller)
            .attached_deposit(NearToken::from_yoctonear(deposit))
            .build());
    }

    fn policy() -> Policy {
        Policy {
            max_payment: U128(3 * NEAR),
            spending_cap: U128(10 * NEAR),
            minimum_price: U128(5 * NEAR),
            retained_bps: 8000,
            operator_can_approve: true,
        }
    }

    /// owner = accounts(0), operator = accounts(1), agent = accounts(2)
    fn setup() -> Contract {
        ctx(accounts(0), 20 * NEAR);
        let mut c = Contract::new();
        c.create_company("co".into(), "InsightForge AI".into(), "Sell research".into(), accounts(1), policy());
        ctx(accounts(0), 0);
        c.register_agent("co".into(), accounts(2), "sales".into());
        ctx(accounts(1), 0);
        c.create_task("co".into(), "T-1".into(), accounts(2), U128(2 * NEAR));
        c
    }

    #[test]
    fn pays_an_approved_task() {
        let mut c = setup();
        ctx(accounts(1), 0);
        c.approve_task("co".into(), "T-1".into());
        let out = c.pay_agent("co".into(), "T-1".into(), U128(2 * NEAR));
        assert!(out.ok);
        let co = c.get_company("co".into()).unwrap();
        assert_eq!(co.balance.0, 18 * NEAR);
        assert_eq!(co.spent.0, 2 * NEAR);
    }

    #[test]
    fn rejects_over_the_individual_limit_and_records_it() {
        let mut c = setup();
        ctx(accounts(1), 0);
        c.approve_task("co".into(), "T-1".into());
        let out = c.pay_agent("co".into(), "T-1".into(), U128(5 * NEAR));
        assert!(!out.ok);
        assert_eq!(out.failed_check.as_deref(), Some("Within per-payment limit"));
        assert_eq!(c.get_company("co".into()).unwrap().balance.0, 20 * NEAR);
        let ledger = c.get_ledger("co".into(), None, None);
        assert_eq!(ledger[0].kind, EventKind::Rejected);
    }

    #[test]
    fn rejects_unapproved_tasks() {
        let mut c = setup();
        ctx(accounts(1), 0);
        let out = c.pay_agent("co".into(), "T-1".into(), U128(NEAR));
        assert_eq!(out.failed_check.as_deref(), Some("Task approved"));
    }

    #[test]
    fn rejects_everything_while_paused() {
        let mut c = setup();
        ctx(accounts(1), 0);
        c.approve_task("co".into(), "T-1".into());
        ctx(accounts(0), 0);
        c.pause_company("co".into());
        ctx(accounts(1), 0);
        let out = c.pay_agent("co".into(), "T-1".into(), U128(NEAR));
        assert_eq!(out.failed_check.as_deref(), Some("Company not paused"));
    }

    #[test]
    fn rejects_double_payment() {
        let mut c = setup();
        ctx(accounts(1), 0);
        c.approve_task("co".into(), "T-1".into());
        assert!(c.pay_agent("co".into(), "T-1".into(), U128(NEAR)).ok);
        let out = c.pay_agent("co".into(), "T-1".into(), U128(NEAR));
        assert_eq!(out.failed_check.as_deref(), Some("Not already paid"));
    }

    #[test]
    fn rejects_removed_agents() {
        let mut c = setup();
        ctx(accounts(1), 0);
        c.approve_task("co".into(), "T-1".into());
        ctx(accounts(0), 0);
        c.remove_agent("co".into(), accounts(2));
        ctx(accounts(1), 0);
        let out = c.pay_agent("co".into(), "T-1".into(), U128(NEAR));
        assert_eq!(out.failed_check.as_deref(), Some("Recipient authorized"));
    }

    #[test]
    #[should_panic(expected = "Only the owner or operator")]
    fn agents_cannot_request_payouts_directly() {
        let mut c = setup();
        ctx(accounts(2), 0);
        c.pay_agent("co".into(), "T-1".into(), U128(NEAR));
    }

    #[test]
    #[should_panic(expected = "Only the company owner")]
    fn operator_cannot_change_policy() {
        let mut c = setup();
        ctx(accounts(1), 0);
        c.set_policy("co".into(), policy());
    }

    #[test]
    fn sale_splits_revenue() {
        let mut c = setup();
        ctx(accounts(3), 10 * NEAR);
        c.purchase("co".into(), "P-1".into());
        let co = c.get_company("co".into()).unwrap();
        assert_eq!(co.revenue.0, 10 * NEAR);
        // 80% retained + 20% to the single agent
        assert_eq!(co.balance.0, 28 * NEAR);
    }

    #[test]
    #[should_panic(expected = "below the company's minimum")]
    fn sale_below_minimum_price_fails() {
        let mut c = setup();
        ctx(accounts(3), NEAR);
        c.purchase("co".into(), "P-1".into());
    }
}
