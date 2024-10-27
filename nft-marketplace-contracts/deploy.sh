#!/bin/bash

# Load environment variables
source .env

# Add 0x prefix if not present
if [[ ! $PRIVATE_KEY == 0x* ]]; then
    export PRIVATE_KEY="0x${PRIVATE_KEY}"
fi

echo "Deploying with configuration:"
echo "RPC URL: https://rpc-amoy.polygon.technology"
echo "Private Key (first 6 chars): ${PRIVATE_KEY:0:6}..."

# Deploy the contract
forge script script/DeployMarketplace.s.sol:DeployMarketplace \
    --rpc-url "https://rpc-amoy.polygon.technology" \
    --private-key "${PRIVATE_KEY}" \
    --broadcast \
    -vvvv

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo "Deployment successful!"
else
    echo "Deployment failed!"
fi