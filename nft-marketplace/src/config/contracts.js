import NFTJson from '../contracts/NFT.json';
import MarketplaceJson from '../contracts/Marketplace.json';

// Import contract addresses from environment variables
const NFT_CONTRACT_ADDRESS = process.env.REACT_APP_NFT_CONTRACT_ADDRESS;
const MARKETPLACE_CONTRACT_ADDRESS = process.env.REACT_APP_MARKETPLACE_CONTRACT_ADDRESS;

// Export contract ABIs and addresses
export const NFT_ABI = NFTJson.abi;
export const NFT_ADDRESS = NFT_CONTRACT_ADDRESS;

export const MARKETPLACE_ABI = MarketplaceJson.abi;
export const MARKETPLACE_ADDRESS = MARKETPLACE_CONTRACT_ADDRESS;

// Add debug logs
console.log('NFT Contract JSON:', {
  abi: NFTJson.abi ? 'Present' : 'Missing',
  address: NFTJson.address,
  raw: NFTJson
});

console.log('Marketplace Contract JSON:', {
  abi: MarketplaceJson.abi ? 'Present' : 'Missing',
  address: MarketplaceJson.address,
  raw: MarketplaceJson
});

// Network IDs
export const NETWORKS = {
  POLYGON_AMOY: 80001
};

// Network Configuration
export const NETWORK_CONFIG = {
  chainId: '0x13882', // 80001 in hex
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'AMOY',
    symbol: 'AMOY',
    decimals: 18
  },
  rpcUrls: ['https://rpc-amoy.polygon.technology'],
  blockExplorerUrls: ['https://www.oklink.com/amoy']
};

// Get current network configuration
export const getCurrentNetwork = () => {
  return NETWORKS.POLYGON_AMOY;
};

// Get contract address for current network
export const getContractAddress = () => {
  const network = getCurrentNetwork();
  return NFTJson.networks[network].address;
};

// Helper function to add Amoy network to MetaMask
export const addAmoyNetwork = async () => {
  if (!window.ethereum) throw new Error('MetaMask is not installed');
  
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [NETWORK_CONFIG],
    });
  } catch (error) {
    console.error('Error adding network:', error);
    throw error;
  }
};

// Helper function to switch to Amoy network
export const switchToAmoyNetwork = async () => {
  if (!window.ethereum) throw new Error('MetaMask is not installed');

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: NETWORK_CONFIG.chainId }],
    });
  } catch (error) {
    if (error.code === 4902) {
      await addAmoyNetwork();
    } else {
      throw error;
    }
  }
};