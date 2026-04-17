#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol,
};

const SUB_KEY: Symbol = symbol_short!("SUB");

#[contracttype]
#[derive(Clone)]
pub struct DepositedEvent {
    pub subscriber: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct WithdrawnEvent {
    pub subscriber: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct PaymentExecutedEvent {
    pub subscriber: Address,
    pub merchant: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct PausedEvent {
    pub subscriber: Address,
}

#[contracttype]
#[derive(Clone)]
pub struct ResumedEvent {
    pub subscriber: Address,
}

#[contracttype]
#[derive(Clone)]
pub struct CancelledEvent {
    pub subscriber: Address,
}

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
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
    pub escrow_balance: i128,
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
            escrow_balance: 0,
        };

        env.storage().instance().set(&SUB_KEY, &subscription);

        subscription
    }

    // Get current subscription state
    pub fn get_subscription(env: Env) -> Subscription {
        env.storage()
            .instance()
            .get(&SUB_KEY)
            .expect("No subscription found")
    }

    // Deposit funds into escrow
    pub fn deposit(env: Env, from: Address, amount: i128) {
        from.require_auth();

        let mut subscription = Self::get_subscription(env.clone());

        // Only subscriber can deposit
        if from != subscription.subscriber {
            panic!("Only subscriber can deposit funds");
        }

        // Transfer tokens from subscriber to contract
        let token_client = token::Client::new(&env, &env.current_contract_address());
        token_client.transfer(&from, &env.current_contract_address(), &amount);

        // Update escrow balance
        subscription.escrow_balance += amount;
        env.storage().instance().set(&SUB_KEY, &subscription);

        // Emit deposit event
        env.events().publish(
            (),
            DepositedEvent {
                subscriber: from,
                amount,
            },
        );
    }

    // Withdraw funds from escrow
    pub fn withdraw(env: Env, to: Address, amount: i128) {
        to.require_auth();

        let mut subscription = Self::get_subscription(env.clone());

        // Only subscriber can withdraw
        if to != subscription.subscriber {
            panic!("Only subscriber can withdraw funds");
        }

        // Check sufficient balance
        if amount > subscription.escrow_balance {
            panic!("Insufficient escrow balance");
        }

        // Transfer tokens from contract to subscriber
        let token_client = token::Client::new(&env, &env.current_contract_address());
        token_client.transfer(&env.current_contract_address(), &to, &amount);

        // Update escrow balance
        subscription.escrow_balance -= amount;
        env.storage().instance().set(&SUB_KEY, &subscription);

        // Emit withdrawal event
        env.events().publish(
            (),
            WithdrawnEvent {
                subscriber: to,
                amount,
            },
        );
    }

    // Execute payment deduction from escrow
    pub fn execute_payment(env: Env) {
        let mut subscription = Self::get_subscription(env.clone());

        // Check if subscription is active
        if subscription.status != SubscriptionStatus::Active {
            panic!("Subscription is not active");
        }

        // Check if payment is due
        let current_time = env.ledger().timestamp();
        if current_time < subscription.next_payment {
            panic!("Payment is not due yet");
        }

        // Check sufficient escrow balance
        if subscription.escrow_balance < subscription.amount {
            panic!("Insufficient escrow balance for payment");
        }

        // Deduct payment from escrow
        subscription.escrow_balance -= subscription.amount;

        // Update next payment timestamp
        subscription.next_payment = current_time + subscription.interval;

        // Save updated subscription
        env.storage().instance().set(&SUB_KEY, &subscription);

        // Transfer payment to merchant
        let token_client = token::Client::new(&env, &env.current_contract_address());
        token_client.transfer(
            &env.current_contract_address(),
            &subscription.merchant,
            &subscription.amount,
        );

        // Emit payment execution event
        env.events().publish(
            (),
            PaymentExecutedEvent {
                subscriber: subscription.subscriber,
                merchant: subscription.merchant,
                amount: subscription.amount,
            },
        );
    }

    // Pause subscription
    pub fn pause(env: Env, caller: Address) {
        caller.require_auth();

        let mut subscription = Self::get_subscription(env.clone());

        // Only subscriber can pause
        if caller != subscription.subscriber {
            panic!("Only subscriber can pause subscription");
        }

        // Check if already paused
        if subscription.status == SubscriptionStatus::Paused {
            panic!("Subscription is already paused");
        }

        subscription.status = SubscriptionStatus::Paused;
        env.storage().instance().set(&SUB_KEY, &subscription);

        // Emit pause event
        env.events().publish((), PausedEvent { subscriber: caller });
    }

    // Resume subscription
    pub fn resume(env: Env, caller: Address) {
        caller.require_auth();

        let mut subscription = Self::get_subscription(env.clone());

        // Only subscriber can resume
        if caller != subscription.subscriber {
            panic!("Only subscriber can resume subscription");
        }

        // Check if already active
        if subscription.status == SubscriptionStatus::Active {
            panic!("Subscription is already active");
        }

        // Check if cancelled
        if subscription.status == SubscriptionStatus::Cancelled {
            panic!("Cannot resume cancelled subscription");
        }

        subscription.status = SubscriptionStatus::Active;
        env.storage().instance().set(&SUB_KEY, &subscription);

        // Emit resume event
        env.events()
            .publish((), ResumedEvent { subscriber: caller });
    }

    // Cancel subscription
    pub fn cancel(env: Env, caller: Address) {
        caller.require_auth();

        let mut subscription = Self::get_subscription(env.clone());

        // Only subscriber can cancel
        if caller != subscription.subscriber {
            panic!("Only subscriber can cancel subscription");
        }

        // Check if already cancelled
        if subscription.status == SubscriptionStatus::Cancelled {
            panic!("Subscription is already cancelled");
        }

        subscription.status = SubscriptionStatus::Cancelled;
        env.storage().instance().set(&SUB_KEY, &subscription);

        // Return remaining escrow to subscriber
        if subscription.escrow_balance > 0 {
            let token_client = token::Client::new(&env, &env.current_contract_address());
            token_client.transfer(
                &env.current_contract_address(),
                &subscription.subscriber,
                &subscription.escrow_balance,
            );
        }

        // Emit cancel event
        env.events()
            .publish((), CancelledEvent { subscriber: caller });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::SubscriptionContractClient;
    use soroban_sdk::testutils::{Address as _, Ledger, MockAuth};
    use soroban_sdk::{token, vec};

    #[test]
    fn test_deposit() {
        let env = Env::default();
        let contract_id = env.register(SubscriptionContract, ());
        let client = SubscriptionContractClient::new(&env, &contract_id);

        let subscriber = Address::generate(&env);
        let merchant = Address::generate(&env);
        let token_admin = Address::generate(&env);

        // Create and mint test token
        let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_address = token_contract.address();
        let token_client = token::Client::new(&env, &token_address);
        let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

        token_admin_client
            .mock_auths(&[MockAuth {
                address: token_admin.clone(),
                nonce: None,
            }])
            .mint(&subscriber, &1000);

        // Initialize subscription
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .initialize(&subscriber, &merchant, &100, &86400); // 100 tokens, daily

        // Deposit funds
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .deposit(&subscriber, &500);

        let subscription = client.get_subscription();
        assert_eq!(subscription.escrow_balance, 500);
    }

    #[test]
    fn test_withdraw() {
        let env = Env::default();
        let contract_id = env.register(SubscriptionContract, ());
        let client = SubscriptionContractClient::new(&env, &contract_id);

        let subscriber = Address::generate(&env);
        let merchant = Address::generate(&env);
        let token_admin = Address::generate(&env);

        // Create and mint test token
        let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_address = token_contract.address();
        let token_client = token::Client::new(&env, &token_address);
        let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

        token_admin_client
            .mock_auths(&[MockAuth {
                address: token_admin.clone(),
                nonce: None,
            }])
            .mint(&subscriber, &1000);

        // Initialize subscription
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .initialize(&subscriber, &merchant, &100, &86400);

        // Deposit funds
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .deposit(&subscriber, &500);

        // Withdraw funds
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .withdraw(&subscriber, &200);

        let subscription = client.get_subscription();
        assert_eq!(subscription.escrow_balance, 300);
    }

    #[test]
    fn test_pause_subscription() {
        let env = Env::default();
        let contract_id = env.register(SubscriptionContract, ());
        let client = SubscriptionContractClient::new(&env, &contract_id);

        let subscriber = Address::generate(&env);
        let merchant = Address::generate(&env);

        // Initialize subscription
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .initialize(&subscriber, &merchant, &100, &86400);

        // Pause subscription
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .pause(&subscriber);

        let subscription = client.get_subscription();
        assert_eq!(subscription.status, SubscriptionStatus::Paused);
    }

    #[test]
    fn test_resume_subscription() {
        let env = Env::default();
        let contract_id = env.register(SubscriptionContract, ());
        let client = SubscriptionContractClient::new(&env, &contract_id);

        let subscriber = Address::generate(&env);
        let merchant = Address::generate(&env);

        // Initialize subscription
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .initialize(&subscriber, &merchant, &100, &86400);

        // Pause first
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .pause(&subscriber);

        // Resume subscription
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .resume(&subscriber);

        let subscription = client.get_subscription();
        assert_eq!(subscription.status, SubscriptionStatus::Active);
    }

    #[test]
    fn test_cancel_subscription() {
        let env = Env::default();
        let contract_id = env.register(SubscriptionContract, ());
        let client = SubscriptionContractClient::new(&env, &contract_id);

        let subscriber = Address::generate(&env);
        let merchant = Address::generate(&env);
        let token_admin = Address::generate(&env);

        // Create and mint test token
        let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_address = token_contract.address();
        let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

        token_admin_client
            .mock_auths(&[MockAuth {
                address: token_admin.clone(),
                nonce: None,
            }])
            .mint(&subscriber, &1000);

        // Initialize subscription
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .initialize(&subscriber, &merchant, &100, &86400);

        // Deposit funds
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .deposit(&subscriber, &500);

        // Cancel subscription
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .cancel(&subscriber);

        let subscription = client.get_subscription();
        assert_eq!(subscription.status, SubscriptionStatus::Cancelled);
        assert_eq!(subscription.escrow_balance, 0); // Funds should be returned
    }

    #[test]
    fn test_execute_payment() {
        let env = Env::default();
        let contract_id = env.register(SubscriptionContract, ());
        let client = SubscriptionContractClient::new(&env, &contract_id);

        let subscriber = Address::generate(&env);
        let merchant = Address::generate(&env);
        let token_admin = Address::generate(&env);

        // Create and mint test token
        let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_address = token_contract.address();
        let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

        token_admin_client
            .mock_auths(&[MockAuth {
                address: token_admin.clone(),
                nonce: None,
            }])
            .mint(&subscriber, &1000);

        // Initialize subscription
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .initialize(&subscriber, &merchant, &100, &86400);

        // Deposit funds
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .deposit(&subscriber, &500);

        // Fast forward time to make payment due
        env.ledger().set_timestamp(86401); // 1 second past interval

        // Execute payment
        client.execute_payment();

        let subscription = client.get_subscription();
        assert_eq!(subscription.escrow_balance, 400); // 500 - 100
        assert_eq!(subscription.next_payment, 86401 + 86400); // Updated next payment
    }

    #[test]
    #[should_panic(expected = "Payment is not due yet")]
    fn test_execute_payment_too_early() {
        let env = Env::default();
        let contract_id = env.register(SubscriptionContract, ());
        let client = SubscriptionContractClient::new(&env, &contract_id);

        let subscriber = Address::generate(&env);
        let merchant = Address::generate(&env);
        let token_admin = Address::generate(&env);

        // Create and mint test token
        let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_address = token_contract.address();
        let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

        token_admin_client
            .mock_auths(&[MockAuth {
                address: token_admin.clone(),
                nonce: None,
            }])
            .mint(&subscriber, &1000);

        // Initialize subscription
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .initialize(&subscriber, &merchant, &100, &86400);

        // Deposit funds
        client
            .mock_auths(&[MockAuth {
                address: &subscriber,
                invoke: &contract_id,
            }])
            .deposit(&subscriber, &500);

        // Try to execute payment too early (should panic)
        client.execute_payment();
    }
}
