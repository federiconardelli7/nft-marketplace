import { ethers } from 'ethers';
import { 
  NFT_ADDRESS, 
  NFT_ABI,
  MARKETPLACE_ADDRESS,
  MARKETPLACE_ABI 
} from '../config/contracts';
import { parseEther } from 'ethers';

export const getMarketplaceContract = async () => {
  try {
    if (!window.ethereum) throw new Error("Please install MetaMask");
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    console.log('Marketplace Contract setup:', {
      MARKETPLACE_ADDRESS,
      MARKETPLACE_ABI: MARKETPLACE_ABI ? 'Present' : 'Missing'
    });
    
    if (!MARKETPLACE_ADDRESS) {
      throw new Error("Marketplace contract address is not defined");
    }
    
    const contract = new ethers.Contract(
      MARKETPLACE_ADDRESS,
      MARKETPLACE_ABI,
      signer
    );

    return contract;
  } catch (error) {
    console.error("Error getting marketplace contract:", error);
    throw error;
  }
};

export const getNFTContract = async () => {
  try {
    if (!window.ethereum) throw new Error("Please install MetaMask");
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    if (!NFT_ADDRESS) {
      throw new Error("NFT contract address is not defined");
    }
    
    const contract = new ethers.Contract(
      NFT_ADDRESS,
      NFT_ABI,
      signer
    );

    return contract;
  } catch (error) {
    console.error("Error getting NFT contract:", error);
    throw error;
  }
};

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
  const contract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
  
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
    const contract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, provider);
    
    const items = await contract.fetchMarketItems();
    return items;
  } catch (error) {
    console.error("Error fetching market items:", error);
    throw error;
  }
}

export async function buyNFT(tokenId, price) {
  const signer = await connectWallet();
  const contract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
  
  const transaction = await contract.createMarketSale(tokenId, { value: ethers.parseEther(price.toString()) });
  await transaction.wait();
}

export async function fetchUserNFTs(account) {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, provider);
    const marketContract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

    // Get both mint and transfer events
    const mintFilter = nftContract.filters.TransferSingle(null, ethers.ZeroAddress, account);
    const transferFilter = nftContract.filters.TransferSingle(null, null, account);
    
    const mintEvents = await nftContract.queryFilter(mintFilter);
    const transferEvents = await nftContract.queryFilter(transferFilter);
    
    const allEvents = [...mintEvents, ...transferEvents];
    const processedTokenIds = new Set();
    const userNFTs = [];

    for (const event of allEvents) {
      const tokenId = event.args.id;
      const value = event.args.value;
      
      if (processedTokenIds.has(tokenId.toString())) continue;
      processedTokenIds.add(tokenId.toString());

      try {
        // Get current balance
        const balance = await nftContract.balanceOf(account, tokenId);
        if (balance.toString() === '0') continue;

        // Get token URI and metadata
        const uri = await nftContract.uri(tokenId);
        const cleanUri = uri
          .replace('ipfs://', 'https://ipfs.io/ipfs/')
          .replace(/{id}/, tokenId.toString());
        
        let metadata;
        try {
          const response = await fetch(cleanUri);
          metadata = await response.json();
        } catch (error) {
          console.error('Error fetching metadata:', error);
          metadata = {
            name: `NFT #${tokenId}`,
            description: 'Metadata unavailable',
            image: 'https://via.placeholder.com/150?text=No+Image'
          };
        }

        // Get marketplace listing
        let listing = null;
        try {
          listing = await marketContract.getTokenListing(tokenId);
        } catch (error) {
          console.log('No listing found for token:', tokenId.toString());
        }

        // Get royalty info
        let royaltyInfo = null;
        try {
          const royalty = await nftContract.royaltyInfo(tokenId, ethers.parseEther("1"));
          royaltyInfo = {
            receiver: royalty[0],
            percentage: (royalty[1] * 100n) / ethers.parseEther("1")
          };
        } catch (error) {
          console.log('No royalty info found for token:', tokenId.toString());
        }

        const imageUrl = metadata.image?.replace('ipfs://', 'https://ipfs.io/ipfs/');

        userNFTs.push({
          id: tokenId.toString(),
          name: metadata.name || `NFT #${tokenId}`,
          description: metadata.description || 'No description available',
          image: imageUrl || 'https://via.placeholder.com/150?text=No+Image',
          balance: balance.toString(),
          available: balance.toString(),
          tokenURI: cleanUri,
          attributes: metadata.attributes || [],
          royaltyInfo,
          listing: listing ? {
            price: listing.price ? ethers.formatEther(listing.price) : '0',
            amount: listing.amount?.toString() || '0',
            seller: listing.seller,
            endTime: listing.endTime ? new Date(Number(listing.endTime) * 1000).toISOString() : null
          } : null,
          mintInfo: {
            originalAmount: value.toString(),
            minter: account
          }
        });
      } catch (error) {
        console.error('Error processing token:', tokenId.toString(), error);
        continue;
      }
    }

    return userNFTs;
  } catch (error) {
    console.error("Error in fetchUserNFTs:", error);
    throw error;
  }
}

export const listNFTForSale = async (nftContract, tokenId, amount, price, endDate) => {
  try {
    console.log('Received parameters:', {
      nftContract,
      tokenId,
      amount,
      price,
      endDate
    });

    if (!nftContract || !tokenId || !amount || !price || !endDate) {
      throw new Error('Missing required parameters for listing');
    }

    const contract = await getMarketplaceContract();
    
    // Convert price from MATIC to Wei
    const priceInWei = ethers.parseEther(price.toString());
    
    // Convert endDate to Unix timestamp (seconds)
    const endTimeUnix = Math.floor(new Date(endDate).getTime() / 1000);
    
    console.log('Processed parameters:', {
      nftContract,
      tokenId: tokenId.toString(),
      amount: amount.toString(),
      priceWei: priceInWei.toString(),
      endTimeUnix: endTimeUnix.toString()
    });

    // First approve the marketplace contract if needed
    const nftContractInstance = await getNFTContract();
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();

    const isApproved = await nftContractInstance.isApprovedForAll(
      signerAddress,
      contract.target
    );

    if (!isApproved) {
      console.log('Approving marketplace...');
      const approveTx = await nftContractInstance.setApprovalForAll(contract.target, true);
      await approveTx.wait();
      console.log('Marketplace approved');
    }

    const transaction = await contract.listToken(
      nftContract,
      tokenId,
      amount,
      priceInWei,
      endTimeUnix
    );

    const receipt = await transaction.wait();
    console.log('NFT listed successfully:', receipt);
    return receipt;
  } catch (error) {
    console.error('Error listing NFT for sale:', error);
    throw error;
  }
};

export const listNFTForAuction = async (tokenId, startingPrice, endDate, amount, currency) => {
  try {
    const marketplaceContract = await getMarketplaceContract();
    const nftContract = await getNFTContract();
    
    // Convert price to wei
    const priceInWei = parseEther(startingPrice.toString());
    
    // First approve the marketplace contract
    const approvalTx = await nftContract.setApprovalForAll(
      marketplaceContract.address,
      true
    );
    await approvalTx.wait();

    // Create the auction
    const auctionTx = await marketplaceContract.createAuction(
      nftContract.address,
      tokenId,
      amount,
      priceInWei,
      Math.floor(new Date(endDate).getTime() / 1000)
    );
    
    await auctionTx.wait();
    return true;
  } catch (error) {
    console.error('Error creating auction:', error);
    throw error;
  }
};
