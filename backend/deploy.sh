#!/bin/bash

# Deploy script for Soroban contract

# Build the contract
cd ../contracts/subscription
cargo build --target wasm32-unknown-unknown --release

# Deploy to testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/subscription.wasm \
  --source your_source_account_secret \
  --network testnet

# Note: Replace with actual source account and network details
# Save the contract ID to .env or output it