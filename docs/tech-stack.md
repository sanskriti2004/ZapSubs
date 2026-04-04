# Technology Stack

## Frontend

- **React**: JavaScript library for building user interfaces
- **Wallet Connect**: Integration with Stellar wallets for authentication and transaction signing
- **Stellar SDK**: JavaScript library for interacting with the Stellar network and Soroban smart contracts
- **CSS Framework**: Standard CSS or a lightweight framework (e.g., Tailwind CSS) for styling
- **State Management**: React Context API or a lightweight state management solution
- **Build Tool**: Vite or Create React App for development and bundling

## Backend

- **Node.js**: JavaScript runtime for server-side logic
- **Express.js**: Web framework for creating REST APIs and handling HTTP requests
- **Stellar SDK**: For interacting with Stellar network and Soroban contracts
- **Cron Service**: Node-cron or similar for scheduled triggering of contract execution
- **Database (Optional for Indexing)**:
  - **MongoDB**: NoSQL database for storing indexed blockchain data
  - **Mongoose**: ODM for MongoDB interaction
  - **Alternative**: PostgreSQL with Sequelize or Prisma ORM if preferred
- **Environment Variables**: dotenv for configuration management
- **API Testing**: Jest or similar for backend testing

## Blockchain

- **Stellar Network**: Public blockchain for fast, low-cost transactions
- **Soroban**: Stellar's smart contract platform for deploying subscription logic
- **Smart Contract Language**: Rust (used for Soroban contract development)
- **Stellar Laboratory**: For testing and debugging transactions
- **Stellar Explorer**: For viewing transaction history and contract state

## Development Tools

- **Version Control**: Git with GitHub for source code management
- **Package Management**: npm or yarn for dependency management
- **Linting**: ESLint for code quality and consistency
- **Formatting**: Prettier for consistent code formatting
- **Testing**:
  - Frontend: React Testing Library and Jest
  - Backend: Jest or Mocha/Chai
  - Smart Contracts: Soroban-specific testing frameworks
- **Dev Environment**: VS Code or similar IDE with relevant extensions

## Deployment & Infrastructure

- **Frontend Hosting**: Vercel, Netlify, or similar static hosting
- **Backend Hosting**: Render, Railway, or traditional VPS/Docker deployment
- **Blockchain Deployment**: Stellar Testnet for development, Publicnet for production
- **CI/CD**: GitHub Actions or similar for automated testing and deployment

## Key Integration Points

1. **Frontend ↔ Wallet**: WalletConnect or direct Stellar wallet integration
2. **Frontend ↔ Backend**: REST API calls for data indexing and transaction submission
3. **Backend ↔ Blockchain**: Stellar SDK for contract interaction and transaction submission
4. **Backend ↔ Database**: ODM/ORM for storing indexed events and user preferences
5. **Blockchain Events**: Smart contract events indexed by backend for frontend display

## Rationale for Technology Choices

- **Stellar + Soroban**: Provides fast, low-cost transactions ideal for subscription payments with proven smart contract capabilities
- **React**: Mature ecosystem with excellent developer experience for building interactive UIs
- **Node.js**: Non-blocking I/O suitable for handling blockchain interactions and API services
- **Optional Database**: Allows flexibility - pure on-chain solution possible, with indexing for enhanced UX
- **Minimal Backend**: Reduces centralization risks while providing necessary triggering and indexing capabilities
