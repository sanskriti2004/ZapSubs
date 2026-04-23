# Dayananda Sagar College of Engineering - Decentralized Subscription Payment System

A blockchain-based subscription payment system built on Stellar blockchain using Soroban smart contracts for the Computer Science (IoT and Cybersecurity including Blockchain) branch.

## Overview

ZapSubs enables users to create and manage recurring subscription payments through smart contracts on the Stellar network. Users deposit funds into escrow, and payments are executed automatically based on predefined billing intervals. The system maintains non-custodial control while providing transparent, on-chain subscription management.

### College Details

- **Institution**: Dayananda Sagar College of Engineering
- **Location**: Kumaraswamy Layout, Bangalore
- **Department**: Computer Science (IoT and Cybersecurity including Blockchain)

### Key Characteristics

- Decentralized escrow-based payments
- Time-gated billing enforcement
- On-chain subscription state management
- Multi-asset support (XLM and Stellar tokens)
- Trustless execution with external triggering

## Technology Stack

- **Blockchain**: Stellar Testnet with Soroban Smart Contracts
- **Backend**: Node.js + Express
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: MongoDB with Mongoose
- **Wallet**: Freighter Wallet
- **Scheduling**: Node-cron
- **Notifications**: NodeMailer

## Architecture

### Technology Components

1. **Smart Contract (Soroban)**
   - Manages subscription state and escrow
   - Enforces time-gated payment logic
   - Handles deposit, withdrawal, and payment execution
   - Events: DepositedEvent, WithdrawnEvent, PaymentExecutedEvent, etc.

2. **Backend API**
   - Stellar SDK integration for contract interactions
   - Cron service for scheduled payment triggering
   - Event indexing and notification system
   - REST API for frontend communication
   - MongoDB for optional data indexing

3. **Frontend Application**
   - Wallet connection via Freighter API
   - Subscription creation and management interface
   - Escrow balance monitoring
   - Payment history display
   - Responsive React application with Tailwind CSS

## Project Structure

```
ZapSubs/
├── contracts/                     # Soroban smart contracts
│   └── subscription/
│       ├── src/
│       │   └── lib.rs
│       ├── Cargo.toml
│       └── test_snapshots/
├── backend/                       # Node.js backend
│   ├── src/
│   │   ├── config/               # Configuration files
│   │   ├── controllers/          # API controllers
│   │   ├── models/               # MongoDB models
│   │   ├── routes/               # API routes
│   │   ├── services/             # Business logic services
│   │   │   ├── stellar.service.js
│   │   │   ├── subscription.service.js
│   │   │   └── notification.service.js
│   │   ├── middleware/           # Authentication & validation
│   │   ├── utils/                # Helper utilities
│   │   └── server.js
│   ├── uploads/                  # Temporary file storage
│   ├── .env
│   └── package.json
├── frontend/                      # React frontend
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── pages/                # Page components
│   │   ├── services/             # API and wallet services
│   │   ├── hooks/                # Custom React hooks
│   │   ├── utils/                # Helper functions
│   │   └── App.jsx
│   ├── public/                   # Static assets
│   ├── .env
│   └── package.json
├── docs/                         # Documentation
│   ├── features.md
│   ├── tech-stack.md
│   ├── timeline.md
│   └── workflow.md
├── .github/                      # GitHub workflows
│   └── workflows/
│       └── ci.yml
├── Cargo.toml                    # Workspace configuration
├── Cargo.lock                    # Workspace dependencies
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Rust and Cargo
- Stellar CLI (`stellar`)
- Freighter Wallet browser extension
- MongoDB Atlas account (optional for indexing)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd ZapSubs
```

2. **Install Backend Dependencies**

```bash
cd backend
npm install
```

3. **Install Frontend Dependencies**

```bash
cd frontend
npm install
```

4. **Build Smart Contract**

```bash
cd contracts/subscription
cargo build --target wasm32-unknown-unknown --release
```

5. **Configure Environment Variables**

Backend `.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ZapSubs
STELLAR_NETWORK=TESTNET
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
CONTRACT_ID=<deployed_contract_id>
FRONTEND_URL=http://localhost:5173
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<your_email>
EMAIL_PASSWORD=<your_app_password>
```

Frontend `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### Running the Application

1. **Deploy Smart Contract**

```bash
cd contracts/subscription
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/subscription.wasm --network testnet
```

2. **Start Backend**

```bash
cd backend
npm run dev
```

3. **Start Frontend**

```bash
cd frontend
npm run dev
```

4. **Access the Application**

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Features

### Core Subscription Management

- **On-Chain Subscription Contracts**: Each subscription stored as smart contract state with user, merchant, billing interval, and escrow balance
- **Escrow-Based Payments**: Users deposit funds into contract escrow, released only for due payments
- **Time-Gated Billing**: Contract enforces payment schedules using Stellar ledger timestamps
- **Stateful Control**: Subscriptions can be paused, resumed, or cancelled with on-chain state updates

### Payment System

- **Contract-Enforced Payments**: Payments validated on-chain for due dates, amounts, and escrow balance
- **Multi-Asset Support**: Accepts XLM and custom Stellar tokens
- **Deposit + Deduction Model**: Upfront deposits with automatic deductions per billing cycle
- **On-Chain Payment Proof**: Every payment generates verifiable blockchain transactions

### User Experience

- **Wallet Integration**: Seamless connection with Stellar wallets (Freighter)
- **Transparent Monitoring**: Real-time escrow balance and payment history
- **External Triggering**: Payments can be user-triggered or scheduled via backend
- **Notification System**: Email alerts for payment events

### Security & Trust

- **Non-Custodial**: Funds controlled by smart contract, not centralized entities
- **Immutable Records**: All subscription activity permanently stored on-chain
- **Transparent Logic**: Subscription rules and payments visible to all parties
- **Limited Backend Role**: Backend only triggers execution and indexes data

## Smart Contract Functions

```rust
// Initialize a new subscription
pub fn initialize(
    env: Env,
    subscriber: Address,
    merchant: Address,
    amount: i128,
    interval: u64,
) -> Subscription

// Deposit funds into escrow
pub fn deposit(env: Env, amount: i128)

// Withdraw funds from escrow
pub fn withdraw(env: Env, amount: i128)

// Execute payment when due
pub fn execute_payment(env: Env) -> Result<(), Error>

// Pause subscription
pub fn pause(env: Env)

// Resume subscription
pub fn resume(env: Env)

// Cancel subscription and return funds
pub fn cancel(env: Env)

// Get subscription details
pub fn get_subscription(env: Env) -> Subscription

// Get escrow balance
pub fn get_balance(env: Env) -> i128
```

## API Endpoints

```
POST   /api/subscriptions/create
GET    /api/subscriptions/:address
PUT    /api/subscriptions/:address/pause
PUT    /api/subscriptions/:address/resume
DELETE /api/subscriptions/:address/cancel

POST   /api/payments/deposit
POST   /api/payments/withdraw
POST   /api/payments/execute
GET    /api/payments/history/:address

GET    /api/wallet/connect
POST   /api/wallet/disconnect
```

## Data Storage

### On-Chain (Stellar Blockchain)

- Subscription state (subscriber, merchant, amount, interval, next_payment, status)
- Escrow balance
- Payment transaction history
- Contract events for indexing

### Off-Chain (MongoDB)

- Indexed payment events
- User preferences
- Notification history
- Analytics data

## Development

### Smart Contract Testing

```bash
cd contracts/subscription
cargo test
```

### Backend Testing

```bash
cd backend
npm test
```

### Frontend Linting

```bash
cd frontend
npm run lint
```

## License

This project is developed for Dayananda Sagar College of Engineering.

## Contributors

- **Department**: Computer Science (IoT and Cybersecurity including Blockchain)
- **Institution**: Dayananda Sagar College of Engineering, Bangalore

## Support

For issues or questions, contact the Computer Science Department.
