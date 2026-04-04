# Project Features

## 1. On-Chain Subscription Contracts
Each subscription is stored as a smart contract state on the Soroban blockchain. The contract includes essential details such as:
- User identifier (wallet address)
- Merchant identifier (wallet address)
- Billing interval (e.g., daily, weekly, monthly)
- Last payment timestamp
- Subscription status (active, paused, cancelled)

## 2. Contract-Enforced Payments
Payments are executed through direct calls to the subscription smart contract. The contract validates:
- Whether the payment is due based on the billing interval and last payment timestamp
- That the correct amount is being paid
- That the user has sufficient funds in escrow

## 3. Time-Gated Billing Logic
The contract uses the Stellar ledger timestamp to enforce billing schedules. This prevents:
- Early charges before the billing interval has elapsed
- Invalid payments outside the agreed schedule
- Ensures payments can only be processed when due

## 4. Escrow-Based Subscription Model
Users deposit funds into the subscription contract, which acts as an escrow. Funds are released only when:
- The time condition is met (payment is due)
- Or service confirmation is received (in extended implementations)
This ensures merchants cannot access funds arbitrarily and users retain control.

## 5. Stateful Subscription Control
Subscriptions can be paused, resumed, or cancelled through contract calls. The state is stored on-chain and automatically enforced:
- Paused subscriptions skip payment deductions until resumed
- Cancelled subscriptions terminate the agreement and return remaining funds
- All state changes are transparent and verifiable on the blockchain

## 6. On-Chain Payment Proof
Every payment generates a blockchain transaction that serves as immutable proof. The frontend displays:
- Transaction hash for each payment
- Links to verify transactions on Stellar explorer
- Payment history with timestamps and amounts

## 7. Multi-Asset Billing
The system supports:
- Stellar's native token (XLM)
- Custom Stellar tokens (issued via Stellar's token standard)
- Dynamic pricing in different assets (with oracle integration planned)
Users can subscribe and pay in their preferred asset.

## 8. Deposit + Deduction Model
Instead of requiring continuous wallet approvals:
- Users deposit funds into the contract upfront
- The contract automatically deducts the subscription amount per billing cycle (when triggered)
- Provides a near "auto-pay" experience while maintaining non-custodial control
- Users can withdraw remaining funds at any time

## Key Design Constraints (Honest Implementation)
- No fully autonomous recurring execution (avoids centralization risks)
- Requires either:
  * User-triggered execution (manual payment confirmation)
  * Backend-triggered execution (via minimal cron service)
- Logic is enforced on-chain, execution is externally triggered
- This maintains trustlessness while acknowledging current blockchain limitations

## Benefits
- **Transparency**: All subscription logic and payments are visible on-chain
- **Trustlessness**: No intermediaries control user funds
- **Programmability**: Subscription terms can be customized via smart contracts
- **Global Access**: Works for anyone with a Stellar wallet, regardless of location
- **Crypto-Native**: Designed for seamless integration with Web3 wallets and dApps