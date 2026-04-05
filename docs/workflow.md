# System Workflow

## High-Level Overview
ZapSubs operates as a decentralized subscription protocol where subscription logic is enforced on-chain via Soroban smart contracts, while execution is triggered externally (by user or backend) to maintain trustlessness and avoid centralization risks.

## Detailed Workflow

### 1. User Onboarding & Wallet Connection
- User visits the ZapSubs frontend application
- Connects their Stellar wallet (e.g., Freighter, Lobstr, or WalletConnect-compatible wallet)
- Frontend retrieves user's public key for identification
- No account creation needed - wallet address serves as user identifier

### 2. Subscription Creation
- User navigates to "Create Subscription" section
- Enters merchant details (merchant wallet address or selects from registered merchants)
- Sets subscription parameters:
  * Amount to be paid per cycle
  * Billing interval (daily, weekly, monthly, custom)
  * Asset type (XLM or custom Stellar token)
  * Initial deposit amount (optional but recommended)
- User reviews and confirms subscription terms
- Frontend interacts with Soroban subscription contract to:
  * Create new subscription instance
  * Store subscription state (user, merchant, amount, interval, start time)
  * Initialize escrow balance if deposit provided

### 3. Funding the Escrow
- User transfers funds to the subscription contract address
- For XLM: Direct transfer to contract address
- For custom tokens: Trustline creation followed by transfer
- Contract verifies receipt and updates escrow balance
- User can add funds at any time via "Add Funds" function
- Contract maintains transparent record of all deposits and deductions

### 4. Subscription Activation
- Once funded, subscription becomes active
- Contract records:
  * Subscription ID
  * User and merchant addresses
  * Billing parameters
  * Last payment timestamp (set to start time)
  * Current escrow balance
- Subscription status set to "active" in contract state

### 5. Payment Execution Cycle
Payments occur through externally triggered contract calls:

#### Trigger Initiation
- Either:
  * User manually triggers via "Pay Now" button in frontend
  * Backend service triggers via scheduled cron job (checking for due subscriptions)

#### Contract Validation
When triggered, the subscription contract performs:
1. **Time Check**: Verifies if sufficient time has elapsed since last payment based on billing interval
2. **Amount Check**: Confirms requested payment amount matches subscription terms
3. **Balance Check**: Ensures escrow balance covers payment amount
4. **Status Check**: Verifies subscription is active (not paused/cancelled)

#### Payment Processing
If all validations pass:
- Contract deducts payment amount from escrow balance
- Updates last payment timestamp to current ledger time
- Emits PaymentSuccess event with transaction details
- Returns success response to caller

If validation fails:
- Contract returns appropriate error (e.g., "Payment not due", "Insufficient funds")
- No state changes occur

### 6. Notification & Indexing
- Backend service listens for PaymentSuccess events from subscription contracts
- Upon receiving event:
  * Indexes transaction data in database (optional)
  * Sends notification to user (email or in-app)
  * Updates frontend with latest payment status via polling or websocket
- Frontend displays:
  * Transaction hash
  * Links to Stellar explorer for verification
  * Payment history with timestamps
  * Current escrow balance
  * Next payment due date

### 7. Subscription Management
Users can modify their subscriptions through contract calls:

#### Pause Subscription
- User initiates pause via frontend
- Contract sets status to "paused"
- Prevents payment deductions while paused
- Escrow funds remain secured in contract

#### Resume Subscription
- User initiates resume via frontend
- Contract verifies subscription exists and is paused
- Sets status back to "active"
- Last payment timestamp unchanged (maintains original billing cycle)

#### Cancel Subscription
- User initiates cancellation via frontend
- Contract sets status to "cancelled"
- Transfers remaining escrow balance back to user
- Subscription cannot be reactivated (would require new creation)

### 8. Multi-Asset Support
- For XLM payments: Direct balance checks and transfers in native token
- For custom tokens:
  * Contract verifies user has established trustline
  * Checks token balance in contract
  * Processes transfers using Stellar's token contract standards
  * Price feeds could be integrated for dynamic fiat-crypto conversion (future enhancement)

### 9. Security & Trustlessness
- **Non-Custodial**: Funds never leave user's control without contract execution
- **Transparent Logic**: All subscription rules visible on-chain
- **Immutable Records**: Payment history permanently stored on blockchain
- **Limited Backend Role**: Backend only triggers execution and indexes data - cannot access or move funds
- **User Control**: Users can withdraw funds or cancel subscription at any time

## Data Flow Summary
```
User Action → Frontend → Contract Call → Soroban Validation → State Change → Event Emission
                                                              ↓
                                                      Backend Listening → Indexing/Notification
                                                              ↓
                                                      Frontend Update → User Notification
```

## Key Characteristics
- **Trust-Minimized**: No party can unilaterally access funds
- **Programmable**: Subscription terms fully customizable via smart contract
- **Verifiable**: Every action provable on-chain
- **Global**: Accessible to anyone with Stellar wallet
- **Crypto-Native**: Built for seamless Web3 integration