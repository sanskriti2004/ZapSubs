# Project Timeline & Task Distribution

## Overview

A for Aadya
B for Sans (im dyslexic)

## Daily Task Distribution

### Day 1: Smart Contract Foundation

**Maker A:**

- Set up Soroban development environment
- Create subscription contract skeleton
- Implement subscription state storage (user, merchant, amount, interval)
- Create initialization function for new subscriptions

**Maker B:**

- Design subscription contract data structures
- Implement escrow deposit functionality
- Add fund withdrawal functions
- Create basic contract event definitions

### Day 2: Smart Contract Logic

**Maker A:**

- Implement time-gated billing logic using ledger timestamps
- Create payment validation functions (due date, amount verification)
- Add payment execution logic with escrow deduction
- Implement subscription state updates after payment

**Maker B:**

- Implement subscription control functions (pause, resume, cancel)
- Add state validation for all contract functions
- Create error handling and edge case management
- Write comprehensive unit tests for contract functions

### Day 3: Backend Development

**Maker A:**

- Set up Node.js/Express backend project
- Implement Stellar SDK integration
- Create subscription triggering service (cron-based)
- Build contract interaction layer for payment execution

**Maker B:**

- Create database schema for indexing (MongoDB/PostgreSQL)
- Implement event listener for contract payments
- Build API endpoints for subscription management
- Add notification system (email/in-app alerts)

### Day 4: Frontend Development

**Maker A:**

- Create React project with wallet connection interface
- Build subscription creation form and validation
- Implement wallet balance display and funding interface
- Design subscription overview dashboard

**Maker B:**

- Create subscription management UI (pause/resume/cancel)
- Implement payment history display with transaction verification
- Build escrow balance monitoring and funding controls
- Add responsive design and user experience improvements

### Day 5: Integration & Polish

**Maker A:**

- Integrate frontend with backend APIs
- Test end-to-end subscription creation and payment flow
- Implement error handling and loading states across application
- Perform contract deployment to Stellar Testnet

**Maker B:**

- Conduct system-wide testing and bug fixing
- Add comprehensive documentation and code comments
- Implement security reviews and gas optimization
- Prepare demo presentation and final verification

## Task Distribution Summary

### Maker A Responsibilities:

- Smart contract core logic (state, payments, time validation)
- Backend service infrastructure and triggering
- Frontend wallet integration and subscription creation
- End-to-end integration and deployment

### Maker B Responsibilities:

- Smart contract escrow and control functions
- Backend database, indexing, and APIs
- Frontend subscription management and UI/UX
- Testing, documentation, and final polish

## Collaboration Points

- Daily sync meetings to align progress
- Shared repository with feature branches
- Contract interface definitions agreed by Day 1
- API specifications finalized by Day 2
- Joint testing and bug bash sessions
- Equal code review responsibilities

## Workload Balance

Each maker has approximately:

- 2.5 days of smart contract work
- 1.5 days of backend work
- 1.5 days of frontend work
- 1 day of integration/testing/polish

This distribution ensures both makers gain full-stack experience while contributing equally to all critical path components of the ZapSubs protocol.
