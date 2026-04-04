#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

const SUB_KEY: Symbol = symbol_short!("SUB");

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum SubscriptionStatus {
    Active,
    Paused,
    Cancelled,
}

#[contracttype]
#[derive(Clone)]
pub struct Subscription {
    pub subscriber: Address,
    pub merchant: Address,
    pub amount: i128,
    pub interval: u64,
    pub next_payment: u64,
    pub status: SubscriptionStatus,
}

#[contract]
pub struct SubscriptionContract;

#[contractimpl]
impl SubscriptionContract {
    // Initialize a new subscription
    pub fn initialize(
        env: Env,
        subscriber: Address,
        merchant: Address,
        amount: i128,
        interval: u64,
    ) -> Subscription {
        // Subscriber must authorize this
        subscriber.require_auth();

        let next_payment = env.ledger().timestamp() + interval;

        let subscription = Subscription {
            subscriber,
            merchant,
            amount,
            interval,
            next_payment,
            status: SubscriptionStatus::Active,
        };

        env.storage()
            .instance()
            .set(&SUB_KEY, &subscription);

        subscription
    }

    // Get current subscription state
    pub fn get_subscription(env: Env) -> Subscription {
        env.storage()
            .instance()
            .get(&SUB_KEY)
            .expect("No subscription found")
    }
}