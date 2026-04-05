# Project Timeline & Task Distribution

## Overview

A for Aadya  
B for Sans

**Rebalancing rationale:** The original plan concentrated all core contract logic, Stellar SDK integration, and deployment on Maker A. This version redistributes so neither person owns "the spine" of the project alone. Blockchain-heavy tasks are split across both people across both days to account for unfamiliarity with Stellar on Maker B's side being a learning curve, not a shortcut.

---

## Daily Task Distribution

### Day 1: Smart Contract Foundation

**Maker A:**
- Set up Soroban development environment (shared setup, but A leads)
- Create subscription contract skeleton
- Implement subscription state storage (user, merchant, amount, interval)
- Create initialization function for new subscriptions

**Maker B:**
- Design and finalize subscription contract data structures
- Implement escrow deposit functionality
- Add fund withdrawal functions
- Create basic contract event definitions

Environment setup has a learning curve but state storage and init are straightforward. Escrow deposit/withdraw is contract logic of equivalent weight.

---

### Day 2: Smart Contract Logic

**Maker A:**
- Implement time-gated billing logic using ledger timestamps
- Create payment validation functions (due date, amount verification)
- Write unit tests for billing and payment logic

**Maker B:**
- Implement payment execution logic with escrow deduction
- Implement subscription state updates after payment
- Implement subscription control functions (pause, resume, cancel)
- Write unit tests for control and state functions

This version splits the two hard pieces (time-gated billing AND payment execution) one each, and both people write tests for their own work.

---

### Day 3: Backend Development

**Maker A:**
- Set up Node.js/Express backend project structure
- Create database schema (MongoDB/PostgreSQL)
- Build API endpoints for subscription management
- Add notification system (email/in-app alerts)

**Maker B:**
- Stellar SDK setup and configuration
- Build contract interaction layer for payment execution
- Implement event listener for contract payments
- Create subscription triggering service (cron-based)


---

### Day 4: Frontend Development

**Maker A:**
- Create React project with wallet connection interface
- Build subscription creation form and validation
- Implement wallet balance display and funding interface

**Maker B:**
- Create subscription management UI (pause/resume/cancel)
- Implement payment history display with transaction verification
- Build escrow balance monitoring and funding controls

**Both:**
- Responsive design and cross-feature UX consistency pass at end of day

Both own complete features end-to-end. Responsive pass is shared.

---

### Day 5: Integration & Polish

**Maker A:**
- Integrate frontend with backend APIs
- Test end-to-end subscription creation and payment flow
- Implement error handling and loading states across application

**Maker B:**
- Backend ↔ Contract integration testing
- Cron/trigger reliability verification
- Contract deployment to Stellar Testnet

**Both:**
- System-wide bug bash
- Demo preparation and final verification
- Code documentation pass (each person documents their own modules)

---

## Task Distribution Summary

### Maker A Responsibilities:
- Smart contract: state, initialization, time-gated billing, payment validation
- Backend: Express setup, database schema, REST APIs, notifications
- Frontend: wallet connection, subscription creation flow
- Integration: frontend ↔ backend wiring, end-to-end flow testing

### Maker B Responsibilities:
- Smart contract: escrow, payment execution, state updates, subscription control
- Backend: Stellar SDK, contract interaction layer, event listener, cron trigger
- Frontend: subscription management, payment history, escrow monitoring
- Integration: backend ↔ contract wiring, deployment to Stellar Testnet

---

## Collaboration Points

- Daily sync meetings to align progress
- Shared repository with feature branches
- Contract interface definitions agreed by end of Day 1
- API specifications finalized by end of Day 2
- Joint bug bash on Day 5
- Each person reviews the other's PRs

---

## Workload Balance

| Area | Maker A | Maker B |
|---|---|---|
| Smart contract | State + billing + validation + tests | Escrow + execution + control + tests |
| Backend | Express + DB + APIs + notifications | Stellar SDK + contract layer + cron + events |
| Frontend | Wallet + creation flow | Management + history + escrow UI |
| Integration | Frontend ↔ Backend | Backend ↔ Contract + Deployment |

Both makers own hard and straightforward tasks in every layer of the stack. Neither person is the "core logic" owner or the "support" owner.