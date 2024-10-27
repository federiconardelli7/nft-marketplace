#!/bin/bash

# Create base directories
mkdir -p IPMarketplace/nft-marketplace/src/{components,services,contracts,config}
mkdir -p IPMarketplace/nft-marketplace-contracts/scripts

# Create necessary files
touch IPMarketplace/nft-marketplace/.env
touch IPMarketplace/nft-marketplace/src/config/contracts.js
touch IPMarketplace/nft-marketplace-contracts/scripts/copy-abi.js

# Add .env to .gitignore
echo ".env" >> IPMarketplace/nft-marketplace/.gitignore
echo "node_modules" >> IPMarketplace/nft-marketplace/.gitignore

# Add foundry specific ignores
echo ".env" >> IPMarketplace/nft-marketplace-contracts/.gitignore
echo "node_modules" >> IPMarketplace/nft-marketplace-contracts/.gitignore
echo "cache" >> IPMarketplace/nft-marketplace-contracts/.gitignore
echo "out" >> IPMarketplace/nft-marketplace-contracts/.gitignore

echo "Project structure setup complete!"