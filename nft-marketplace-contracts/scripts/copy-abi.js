const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

async function copyABI() {
    try {
        // Paths
        const outDir = path.join(__dirname, '../out');
        const frontendDir = path.join(__dirname, '../../nft-marketplace/src/contracts');

        // Ensure the frontend contracts directory exists
        await fs.ensureDir(frontendDir);

        // Get the NFTMarketplace artifact
        const artifactPath = path.join(outDir, 'NFTMarketplace.sol/NFTMarketplace.json');
        
        if (!fs.existsSync(artifactPath)) {
            console.error('Contract artifact not found. Please run forge build first.');
            process.exit(1);
        }

        const artifact = require(artifactPath);

        // Create frontend contract file
        const frontendContract = {
            abi: artifact.abi,
            networks: {
                80001: { // Polygon Amoy testnet
                    address: process.env.CONTRACT_ADDRESS
                }
            }
        };

        // Write to frontend project
        await fs.writeJSON(
            path.join(frontendDir, 'NFTMarketplace.json'),
            frontendContract,
            { spaces: 2 }
        );

        console.log('✅ ABI copied successfully to frontend project!');
        console.log('Contract address:', process.env.CONTRACT_ADDRESS);
    } catch (error) {
        console.error('Error copying ABI:', error);
        process.exit(1);
    }
}

copyABI();