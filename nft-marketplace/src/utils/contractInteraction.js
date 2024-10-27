import { ethers } from 'ethers';
import ipfsService from '../services/ipfsService';

import { 
  NFT_MARKETPLACE_ADDRESS, 
  NFT_MARKETPLACE_ABI
} from '../config/contracts';

export async function connectWallet() {
  if (!window.ethereum) {
    console.log('Please install MetaMask!');
    return null;
  }

  try {
    // Cancel any pending requests
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }]
    }).catch(() => {});

    // Check if already connected
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      return await provider.getSigner();
    }

    // Request new connection
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    return await provider.getSigner();
  } catch (error) {
    console.error("Error connecting to wallet:", error.message);
    return null;
  }
}

export async function createToken(tokenURI, price) {
  const signer = await connectWallet();
  const contract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS, NFT_MARKETPLACE_ABI, signer);
  
  const transaction = await contract.createToken(tokenURI, ethers.parseEther(price.toString()));
  await transaction.wait();
}

export async function fetchMarketItems() {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum, {
      // Disable ENS
      name: "Polygon Amoy",
      ensAddress: null
    });
    const contract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS, NFT_MARKETPLACE_ABI, provider);
    
    const items = await contract.fetchMarketItems();
    return items;
  } catch (error) {
    console.error("Error fetching market items:", error);
    throw error;
  }
}

export async function buyNFT(tokenId, price) {
  const signer = await connectWallet();
  const contract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS, NFT_MARKETPLACE_ABI, signer);
  
  const transaction = await contract.createMarketSale(tokenId, { value: ethers.parseEther(price.toString()) });
  await transaction.wait();
}

// export async function fetchUserNFTs(account) {
//   // Implement the logic to fetch user's NFTs
//   // This is a placeholder implementation
//   console.log('Fetching NFTs for account:', account);
//   return [
//     { id: 1, name: 'NFT 1', image: 'https://via.placeholder.com/150', description: 'Description 1', amount: 3 },
//     { id: 2, name: 'NFT 2', image: 'https://via.placeholder.com/150', description: 'Description 2', amount: 1 },
//     { id: 3, name: 'NFT 3', image: 'https://via.placeholder.com/150', description: 'Description 3', amount: 5 },
//     { id: 4, name: 'NFT 4', image: 'https://via.placeholder.com/150', description: 'Description 4', amount: 2 },
//     { id: 5, name: 'NFT 5', image: 'https://via.placeholder.com/150', description: 'Description 5', amount: 1 },
//     { id: 6, name: 'NFT 6', image: 'https://via.placeholder.com/150', description: 'Description 6', amount: 4 },
//     { id: 7, name: 'NFT 7', image: 'https://via.placeholder.com/150', description: 'Description 7', amount: 2 },
//   ];
// }

export const fetchUserNFTs = async (account) => {
  try {
    if (!account) throw new Error("No account connected");
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      NFT_MARKETPLACE_ADDRESS,
      NFT_MARKETPLACE_ABI,
      provider
    );

    console.log('Fetching NFTs for account:', account);

    // Fetch market items first
    const marketItems = await contract.fetchMarketItems();
    console.log('Market items:', marketItems);

    const userNFTs = [];
    
    for (const item of marketItems) {
      try {
        // Check ERC1155 balance for this token
        const balance = await contract.balanceOf(account, item.tokenId);
        
        // Process if user has balance or is creator/seller
        if (balance > 0 || 
            item.creator.toLowerCase() === account.toLowerCase() ||
            item.seller.toLowerCase() === account.toLowerCase()) {
          
          console.log('Processing token:', item.tokenId.toString(), 'Balance:', balance.toString());
          
          try {
            // Get the token URI directly for this token
            const tokenURI = await contract.uri(item.tokenId);
            console.log('Token URI from contract:', tokenURI);

            if (!tokenURI) {
              console.log('No URI found for token:', item.tokenId.toString());
              continue;
            }

            // Fetch metadata
            let metadata;
            try {
              const response = await fetch(tokenURI);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              metadata = await response.json();
              console.log('Fetched metadata:', metadata);

            } catch (error) {
              console.error('Error fetching metadata for token:', item.tokenId, error);
              metadata = {
                name: `NFT #${item.tokenId}`,
                description: 'Metadata unavailable',
                image: 'https://via.placeholder.com/150?text=No+Image'
              };
            }

            userNFTs.push({
              id: item.tokenId.toString(),
              name: metadata.name || `NFT #${item.tokenId}`,
              description: metadata.description || 'No description available',
              image: metadata.image || 'https://via.placeholder.com/150?text=No+Image',
              balance: balance.toString(),
              amount: item.remainingSupply.toString(),
              price: ethers.formatEther(item.price),
              seller: item.seller,
              creator: item.creator,
              supply: item.supply.toString(),
              tokenURI,
              attributes: metadata.attributes || []
            });

          } catch (error) {
            console.error('Error processing token URI:', error);
            continue;
          }
        }
      } catch (error) {
        console.error('Error processing market item:', error);
        continue;
      }
    }

    console.log('Processed user NFTs:', userNFTs);
    return userNFTs;

  } catch (error) {
    console.error("Error in fetchUserNFTs:", error);
    throw error;
  }
};

export const listNFTForSale = async (tokenId, price, amount, endDate, currency) => {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      NFT_MARKETPLACE_ADDRESS,
      NFT_MARKETPLACE_ABI,
      signer
    );

    const priceInWei = ethers.parseEther(price.toString());
    
    // Update this according to your contract's listing function
    const transaction = await contract.listToken(
      tokenId,
      amount,
      priceInWei,
      Math.floor(new Date(endDate).getTime() / 1000), // Convert to Unix timestamp
      { value: 0 } // Any listing fee if required
    );

    await transaction.wait();
    return transaction;
  } catch (error) {
    console.error("Error listing NFT for sale:", error);
    throw error;
  }
};

export async function listNFTForAuction(nftId, startingPrice, endDate) {
  // Implement the logic to list an NFT for auction
  console.log(`Listing NFT ${nftId} for auction starting at ${startingPrice} until ${endDate}`);
  // Add your contract interaction code here
}
