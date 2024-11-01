require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Paths to the compiled contract artifacts
const NFT_ARTIFACT_PATH = path.join(__dirname, '../out/NFT.sol/NFT.json');
const MARKETPLACE_ARTIFACT_PATH = path.join(__dirname, '../out/Marketplace.sol/Marketplace.json');

// Paths where we want to copy the ABIs in the frontend
const NFT_DESTINATION = path.join(__dirname, '../../nft-marketplace/src/contracts/NFT.json');
const MARKETPLACE_DESTINATION = path.join(__dirname, '../../nft-marketplace/src/contracts/Marketplace.json');

// Read environment variables
const NFT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS;
const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_CONTRACT_ADDRESS;

function copyABI(artifactPath, destinationPath, contractAddress) {
    try {
        // Read the artifact file
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        
        // Create a new object with just the ABI and address
        const contractData = {
            address: contractAddress,
            abi: artifact.abi
        };

        // Create the destination directory if it doesn't exist
        const dir = path.dirname(destinationPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write the new JSON file
        fs.writeFileSync(
            destinationPath,
            JSON.stringify(contractData, null, 2)
        );

        console.log(`Successfully copied ABI to ${destinationPath}`);
    } catch (error) {
        console.error(`Error copying ABI: ${error.message}`);
        process.exit(1);
    }
}

// Copy both ABIs
copyABI(NFT_ARTIFACT_PATH, NFT_DESTINATION, NFT_ADDRESS);
copyABI(MARKETPLACE_ARTIFACT_PATH, MARKETPLACE_DESTINATION, MARKETPLACE_ADDRESS);

// Copy addresses to frontend .env while preserving other variables
const frontendEnvPath = path.join(__dirname, '../../nft-marketplace/.env');
let envContent = '';

// Read existing .env content if it exists
if (fs.existsSync(frontendEnvPath)) {
    const existingEnv = fs.readFileSync(frontendEnvPath, 'utf8');
    // Remove any existing contract address entries
    envContent = existingEnv
        .split('\n')
        .filter(line => !line.startsWith('REACT_APP_NFT_CONTRACT_ADDRESS') && 
                        !line.startsWith('REACT_APP_MARKETPLACE_CONTRACT_ADDRESS'))
        .join('\n');
}

// Append new contract addresses
fs.writeFileSync(frontendEnvPath, `${envContent}
REACT_APP_NFT_CONTRACT_ADDRESS=${process.env.NFT_CONTRACT_ADDRESS}
REACT_APP_MARKETPLACE_CONTRACT_ADDRESS=${process.env.MARKETPLACE_CONTRACT_ADDRESS}
`);
