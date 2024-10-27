# NFT Marketplace

A decentralized NFT marketplace built on the Polygon (Amoy testnet) blockchain that allows users to mint, buy, and sell NFTs. The platform features a user-friendly interface for managing digital assets and includes user profiles with customizable information.

## Features

- **Connect Wallet**: Seamless integration with MetaMask for secure wallet connection
- **NFT Management**: 
  - Mint new NFTs with custom metadata
  - List NFTs for sale
  - Purchase NFTs from other users
- **User Profiles**:
  - Customizable username and bio
  - Profile picture upload
  - Social media links (Twitter, Instagram)
- **NFT Discovery**:
  - Browse all listed NFTs
  - View detailed NFT information
  - Track NFT ownership and history

## Project Structure

- `nft-marketplace/` - React.js frontend application & Node.js/Express backend server
- `nft-marketplace-contracts/` - Solidity smart contracts

## Technologies Used

### Frontend
- React.js
- Ethers.js
- Web3.js
- CSS3

### Backend
- Node.js
- Express
- MongoDB
- Mongoose

### Smart Contracts
- Solidity
- Foundry
- OpenZeppelin
- IPFS (Pinata)

## Setup Instructions

### Prerequisites
- Node.js
- MongoDB Atlas account
- MetaMask wallet
- Pinata account for IPFS
- Foundry

### Smart Contracts
bash
cd smart-contracts
Install dependencies and build
make install
Deploy contracts
make deploy
Copy ABI to frontend
make scripts/copy-abi

### Project Setup
bash
Install dependencies
npm install
Run only the frontend
npm start
Run only the backend
npm run server
Run both frontend and backend concurrently
npm run dev

## Environment Variables

Rename `.env.example` file to `.env` in both directories:
- `nft-marketplace-contracts`
- `nft-marketplace`


