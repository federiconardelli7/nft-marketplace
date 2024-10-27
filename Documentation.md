# IPMarketplace Project Documentation

## Project Overview
IPMarketplace is a decentralized NFT marketplace built on the Amoy testnet, enabling users to create, buy, sell, and collect NFTs. The project consists of three main components:

1. **Frontend (React)**
   - Modern, responsive user interface
   - Web3 wallet integration
   - Real-time price updates
   - Interactive NFT creation and management

2. **Backend (MongoDB + IPFS Pinata)**
   - Secure metadata storage
   - User profile management
   - Transaction history
   - NFT indexing and search

3. **Smart Contracts (Foundry)**
   - Secure NFT minting and trading
   - Gas-optimized operations
   - Event-driven updates
   - Automated testing

## Project Structure

IPMarketplace/
├── nft-marketplace/ # Frontend & Backend
│ ├── src/ # React source code
│ ├── server/ # Express server
│ └── public/ # Static assets
│
└── nft-marketplace-contracts/ # Smart Contracts
├── src/ # Contract source files
├── script/ # Deployment scripts
├── test/ # Contract tests
└── broadcast/ # Deployment artifacts


## 1. Frontend Application (nft-marketplace/)

### Core Structure

nft-marketplace/
├── src/
│ ├── components/ # React components
│ │ ├── MintNFTPage/
│ │ ├── MarketplacePage/
│ │ ├── ProfilePage/
│ │ └── SellNFTPage/
│ │
│ ├── config/ # Configuration files
│ │ ├── contracts.js # Contract addresses & ABIs
│ │ └── networks.js # Network configurations
│ │
│ ├── services/ # Service integrations
│ │ ├── api.js # Backend API calls
│ │ ├── ipfsService.js # Pinata IPFS integration
│ │ └── database.js # MongoDB interactions
│ │
│ ├── utils/ # Utility functions
│ │ └── contractInteraction.js
│ │
│ ├── App.js # Main React component
│ └── index.js # Entry point
│
├── server/ # Backend server
│ ├── index.js # Express server setup
│ ├── models/ # MongoDB schemas
│ │ ├── User.js
│ │ ├── NFT.js
│ │ └── Transaction.js
│ │
│ └── routes/ # API routes
│ ├── users.js
│ ├── nfts.js
│ └── transactions.js
│
└── package.json # Project dependencies


### Key Components

#### 1. MintNFTPage
**Purpose**: NFT creation and minting interface

javascript
// Key features
Image upload with drag & drop
IPFS metadata creation
Cost estimation (POL + USD)
Minting transaction handling


#### 2. MarketplacePage
**Purpose**: NFT browsing and trading

javascript
// Key features
NFT grid display
Filtering and sorting
Purchase functionality
Price history


#### 3. Backend Integration
**Database Schema**:

javascript
// User Schema
{
wallet_address: String,
created_at: Date,
nfts_owned: [{ type: Schema.Types.ObjectId, ref: 'NFT' }],
nfts_created: [{ type: Schema.Types.ObjectId, ref: 'NFT' }]
}
// NFT Schema
{
token_id: Number,
creator: String,
owner: String,
metadata: {
name: String,
description: String,
image: String,
traits: Array
},
price_history: [{
price: Number,
timestamp: Date
}],
listing_status: String
}


#### 4. IPFS Integration

javascript
// Pinata service configuration
const pinataService = {
pinFile: async (file) => {
// File upload to IPFS
},
pinJSON: async (metadata) => {
// Metadata upload to IPFS
}
};


## 2. Smart Contracts (nft-marketplace-contracts/)

### Project Structure

nft-marketplace-contracts/
├── src/
│ ├── NFTMarketplace.sol # Main marketplace contract
│ └── interfaces/ # Contract interfaces
│
├── script/
│ ├── Deploy.s.sol # Deployment script
│ └── Helper.s.sol # Helper functions
│
├── test/
│ └── NFTMarketplace.t.sol # Contract tests
│
└── foundry.toml # Foundry configuration


### Contract Features

solidity
// NFTMarketplace.sol
contract NFTMarketplace is ERC721URIStorage {
// Core functionality
function createToken() // Mint new NFT
function listToken() // List NFT for sale
function buyToken() // Purchase NFT
function cancelListing() // Remove from sale
// Events
event TokenCreated
event TokenListed
event TokenSold
event ListingCanceled
}
