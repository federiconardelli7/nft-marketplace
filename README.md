# NFT Marketplace

A decentralized NFT marketplace built on the Polygon (Amoy testnet) blockchain. This platform enables users to mint, buy, and sell NFTs while managing their digital assets through an intuitive interface. The system includes comprehensive user profiles and activity tracking for all NFT-related transactions.

## Project Overview

The NFT Marketplace consists of two main components working together to provide a complete NFT trading experience:

- The frontend application, built with React.js, provides the user interface and handles blockchain interactions through Ethers.js. Users can connect their MetaMask wallets, manage their profiles, mint new NFTs, list them for sale, and purchase NFTs from other users.
- The backend server, powered by Node.js and Express, manages user data and NFT activities through MongoDB, maintaining a record of all transactions and user profiles.

## Core Features

The platform offers comprehensive NFT management capabilities:

The system enables users to connect their MetaMask wallets and perform the following actions:

- Mint new NFTs with customizable metadata and royalty settings
- List NFTs for sale with specified prices and durations
- Purchase NFTs from other users
- Track and claim expired NFT listings
- View complete transaction history

Users can manage their profiles by:

- Setting custom usernames and bios
- Uploading profile pictures
- Adding social media links
- Monitoring their NFT activities

## Technical Architecture

### Frontend Application (nft-marketplace/)
- React.js for the user interface
- Ethers.js for blockchain communication
- Web3 integration with MetaMask
- CSS3 for styling components

### Backend Server (nft-marketplace/)
- Node.js and Express server
- MongoDB database integration
- API endpoints for user and activity management

### Smart Contracts (nft-marketplace-contracts/)
- Solidity smart contracts
- OpenZeppelin contract implementations
- IPFS integration through Pinata
- Foundry for contract deployment and testing

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- MetaMask wallet
- Pinata account for IPFS storage
- Foundry development framework

### Environment Configuration
1. Clone the repository to your local machine
2. Create and configure environment files:
```bash
# For smart contracts
cd nft-marketplace-contracts
cp .env.example .env

# For application
cd ../nft-marketplace
cp .env.example .env
```

### Smart Contract Deployment
Open a bash terminal and execute:
```bash
cd nft-marketplace-contracts

# Deploy contracts and clean database
make deploy-clean-db

# Or deploy contracts only
make deploy
```

The deployment process:
- Compiles and deploys contracts to Polygon Amoy testnet
- Updates contract addresses in environment files
- Copies contract ABIs to the frontend directory
- Optionally cleans the MongoDB collections

### Application Launch
Open PowerShell and navigate to the application directory:
```powershell
cd nft-marketplace

# Install required dependencies
npm install

# Launch options
npm run start    # Frontend only
npm run server   # Backend only
npm run dev      # Full application (frontend + backend)
```

## Usage Guidelines

### Initial Setup
1. Configure MetaMask for the Polygon Amoy testnet
2. Connect your wallet through the application interface
3. Complete your user profile setup
4. Ensure your wallet contains sufficient POL tokens for transactions

### NFT Management

#### Minting NFTs
1. Click "Mint NFT" in the navigation menu
2. Upload your NFT image
3. Set metadata including name, description, and supply
4. Configure royalty percentages
5. Confirm the transaction in MetaMask

#### Listing NFTs
1. Navigate to your profile/selling page
2. Select an NFT to list
3. Set price and listing duration
4. Approve marketplace contract if first time listing
5. Confirm the listing transaction

#### Purchasing NFTs
1. Browse the marketplace section
2. Select an NFT to purchase
3. Specify purchase quantity
4. Confirm the purchase transaction

#### Managing Expired Listings
1. Monitor expiration times in your profile
2. Claim expired NFTs through the "Claim Expired NFTs" button
3. Confirm the claim transaction

## Database Management
To reset the MongoDB collections:
```bash
cd nft-marketplace-contracts
make clean-db
```
This command removes all user information and activity records while preserving contract data on the blockchain.

## Troubleshooting Guide

### Transaction Failures
- Verify POL token balance
- Check MetaMask network settings
- Review transaction parameters
- Confirm gas price settings

### Database Issues
- Verify MongoDB connection string
- Check database access permissions
- Ensure proper collection names
- Monitor connection logs

### Frontend Problems
- Clear browser cache
- Reset MetaMask connection
- Check console for error messages
- Verify contract addresses in environment files

### Contract Interaction Issues
- Confirm wallet connection
- Review contract approval status
- Check transaction history
- Verify network stability
