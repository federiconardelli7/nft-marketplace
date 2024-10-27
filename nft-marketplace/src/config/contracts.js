import NFTMarketplaceJSON from '../contracts/NFTMarketplace.json';

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
  return NFTMarketplaceJSON.networks[network].address;
};

// Export contract ABI and address directly
export const NFT_MARKETPLACE_ABI = NFTMarketplaceJSON.abi;
export const NFT_MARKETPLACE_ADDRESS = getContractAddress();

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