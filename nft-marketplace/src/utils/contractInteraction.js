  import { ethers } from 'ethers';
  import { 
    NFT_ADDRESS, 
    NFT_ABI,
    MARKETPLACE_ADDRESS,
    MARKETPLACE_ABI 
  } from '../config/contracts';
  import { parseEther } from 'ethers';
  import { api } from '../services/api';

  const IPFS_GATEWAYS = [
    'https://gateway.pinata.cloud/ipfs/',
    'https://nftstorage.link/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://ipfs.io/ipfs/'
  ];
  

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
      
      // Add transaction count check to ensure nonce is correct
      await provider.getTransactionCount(signer.address);
      
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

  // Add these new functions to your contractInteraction.js

  export const cleanExpiredListing = async (marketItemId) => {
    try {
      const contract = await getMarketplaceContract();
      const transaction = await contract.cleanExpiredListing(marketItemId);
      await transaction.wait();
      return true;
    } catch (error) {
      console.error("Error cleaning expired listing:", error);
      throw error;
    }
  };

  // Update the fetchMarketItems function to include the endTime
  export const fetchMarketItems = async () => {
    try {
      const contract = await getMarketplaceContract();
      const items = await contract.fetchMarketItems();
      
      const processedItems = await Promise.all(items.map(async (item) => {
        try {
          const nftContract = new ethers.Contract(item.nftContract, NFT_ABI, contract.runner);
          let tokenURI = await nftContract.uri(item.tokenId);
          let metadata = {
            name: `NFT #${item.tokenId.toString()}`,
            description: 'Metadata unavailable',
            image: 'https://via.placeholder.com/150?text=No+Image'
          };

          try {
            tokenURI = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
            const response = await fetch(tokenURI);
            if (response.ok) {
              metadata = await response.json();
            }
          } catch (metadataError) {
            console.error(`Error fetching metadata for token ${item.tokenId}:`, metadataError);
          }
          
          return {
            marketItemId: item.marketItemId.toString(),
            nftContract: item.nftContract,
            tokenId: item.tokenId.toString(),
            seller: item.seller,
            price: ethers.formatEther(item.price),
            amount: item.amount.toString(),
            remainingAmount: item.remainingAmount.toString(),
            endTime: item.endTime.toString(),
            name: metadata.name,
            description: metadata.description,
            image: metadata.image?.replace('ipfs://', 'https://ipfs.io/ipfs/') || 'https://via.placeholder.com/150?text=No+Image',
          };
        } catch (error) {
          console.error(`Error processing market item ${item.marketItemId}:`, error);
          return null;
        }
      }));

      return processedItems.filter(item => item !== null);
    } catch (error) {
      console.error("Error fetching market items:", error);
      throw error;
    }
  };

  // Also add this helper function to check contract setup
  export async function checkMarketplaceSetup() {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      console.log('Network:', await provider.getNetwork());
      
      const marketplace = new ethers.Contract(
        MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        provider
      );
      
      // Try to call a view function
      const items = await marketplace.fetchMarketItems();
      console.log('Market items fetch test:', items);
      
      return {
        success: true,
        message: 'Marketplace contract is accessible'
      };
    } catch (error) {
      console.error('Marketplace setup check failed:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  export async function buyNFT(marketItemId, price, amount = 1) {
    try {
      console.log('Buying NFT with params:', { marketItemId, price, amount });
  
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
  
      const marketplace = new ethers.Contract(
        MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        signer
      );
  
      // Calculate total price in wei
      const totalValue = ethers.parseEther((Number(price) * Number(amount)).toString());
  
      console.log('Transaction value:', ethers.formatEther(totalValue), 'POL');
  
      // Create transaction with fixed gas settings for Polygon Amoy
      const tx = await marketplace.buyToken(
        marketItemId,
        amount,
        {
          from: signerAddress,
          value: totalValue,
          gasLimit: ethers.toBigInt('300000'),
          gasPrice: ethers.parseUnits('100', 'gwei')
        }
      );
  
      console.log('Transaction sent:', tx.hash);
  
      // Wait for confirmation and get receipt
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
  
      // Get the market item
      const marketItem = await marketplace.getMarketItem(marketItemId);
  
      // Log activities
      await Promise.all([
        api.createActivity({
          wallet_address: signerAddress.toLowerCase(),
          activity_type: 'BUY',
          token_id: marketItem.tokenId.toString(),
          amount: amount,
          price: price,
          transaction_hash: receipt.hash
        }),
        api.createActivity({
          wallet_address: marketItem.seller.toLowerCase(),
          activity_type: 'SELL',
          token_id: marketItem.tokenId.toString(),
          amount: amount,
          price: price,
          transaction_hash: receipt.hash
        })
      ]);
  
      // Return the receipt directly
      return receipt;
  
    } catch (error) {
      console.error('Error details:', {
        error,
        code: error.code,
        message: error.message,
        data: error.data
      });
  
      // Handle specific error cases
      if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds to complete the purchase');
      } else if (error.code === -32603) {
        throw new Error('Transaction failed. Please make sure you have enough POL for gas fees');
      } else if (error.reason) {
        throw new Error(error.reason);
      }
  
      throw error;
    }
  }

  async function fetchWithFallback(uri) {
    let lastError;
  
    // If the URI is already a full HTTP URL that's not IPFS, try it directly
    if (uri.startsWith('http') && !uri.includes('ipfs')) {
      try {
        const response = await fetch(uri);
        if (response.ok) return await response.json();
      } catch (error) {
        console.log('Failed to fetch from direct URL:', error);
        lastError = error;
      }
    }
  
    // Extract IPFS hash
    let ipfsHash = uri;
    if (uri.startsWith('ipfs://')) {
      ipfsHash = uri.replace('ipfs://', '');
    } else if (uri.includes('ipfs/')) {
      ipfsHash = uri.split('ipfs/')[1];
    }
  
    // Try each gateway
    for (const gateway of IPFS_GATEWAYS) {
      try {
        console.log('Trying gateway:', gateway);
        const url = `${gateway}${ipfsHash}`;
        const response = await fetch(url);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.log('Failed to fetch from gateway:', gateway, error);
        lastError = error;
      }
    }
  
    // If all gateways fail, return default metadata
    console.warn('All gateways failed, returning default metadata');
    return {
      name: `NFT #${ipfsHash.slice(0, 6)}`,
      description: 'Metadata unavailable',
      image: 'https://via.placeholder.com/150?text=No+Image'
    };
  }

  export async function fetchUserNFTs(account) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const nftContract = new ethers.Contract(
        NFT_ADDRESS,
        NFT_ABI,
        provider
      );
  
      // Get events
      const mintFilter = nftContract.filters.TransferSingle(null, ethers.ZeroAddress, account);
      const transferFilter = nftContract.filters.TransferSingle(null, null, account);
      
      const mintEvents = await nftContract.queryFilter(mintFilter);
      const transferEvents = await nftContract.queryFilter(transferFilter);
      
      const allEvents = [...mintEvents, ...transferEvents];
      const processedTokenIds = new Set();
      const userNFTs = [];
  
      // Get marketplace contract for active listings
      const marketplaceContract = new ethers.Contract(
        MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        provider
      );
  
      for (const event of allEvents) {
        const tokenId = event.args.id;
        if (processedTokenIds.has(tokenId.toString())) continue;
        processedTokenIds.add(tokenId.toString());
  
        try {
          // Get token info first
          const tokenInfo = await nftContract.getTokenInfo(tokenId);
          const initialSupply = Number(tokenInfo.initialSupply.toString());
  
          // Get current balance - this is what you can actually use
          const balance = await nftContract.balanceOf(account, tokenId);
          const availableBalance = Number(balance.toString());
  
          if (availableBalance === 0 && initialSupply === 0) continue;
  
          // Log the initial data
          console.log('Initial token data:', {
            tokenId: tokenId.toString(),
            initialSupply,
            currentBalance: availableBalance,
          });
  
          // Get metadata
          let metadata;
          try {
            metadata = await fetchWithFallback(tokenInfo.tokenURI);
          } catch (error) {
            console.error('Error fetching metadata:', error);
            metadata = {
              name: `NFT #${tokenId}`,
              description: 'Metadata unavailable',
              image: 'https://via.placeholder.com/150?text=No+Image'
            };
          }
  
          // Process image URL
          let imageUrl = metadata.image;
          if (imageUrl?.startsWith('ipfs://')) {
            imageUrl = imageUrl.replace('ipfs://', IPFS_GATEWAYS[0]);
          }
  
          userNFTs.push({
            id: tokenId.toString(),
            name: metadata.name || `NFT #${tokenId}`,
            description: metadata.description || 'No description available',
            image: imageUrl || 'https://via.placeholder.com/150?text=No+Image',
            available: availableBalance.toString(), // Current balance is what's available
            mintInfo: {
              originalAmount: initialSupply.toString() // Total minted amount
            }
          });
  
        } catch (error) {
          console.error('Error processing token:', tokenId.toString(), error);
          continue;
        }
      }
  
      // Log final NFT data
      console.log('Final NFTs:', userNFTs.map(nft => ({
        id: nft.id,
        name: nft.name,
        available: nft.available,
        originalAmount: nft.mintInfo.originalAmount
      })));
  
      return userNFTs;
    } catch (error) {
      console.error("Error in fetchUserNFTs:", error);
      throw error;
    }
  }

  export async function fetchListedNFTs(account) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const marketplaceContract = new ethers.Contract(
        MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        provider
      );
      
      // Get all market items
      const marketItems = await marketplaceContract.fetchMarketItems();
      
      // Filter for user's active listings
      const userListings = marketItems.filter(item => 
        item.seller.toLowerCase() === account.toLowerCase() && 
        item.active === true
      );
  
      // Get NFT details for each listing
      const listedNFTs = await Promise.all(userListings.map(async (item) => {
        const nftContract = new ethers.Contract(
          NFT_ADDRESS,
          NFT_ABI,
          provider
        );
  
        // Get token info and metadata using the token info function
        const tokenInfo = await nftContract.getTokenInfo(item.tokenId);
        let metadata;
        try {
          metadata = await fetchWithFallback(tokenInfo.tokenURI);
          console.log('Listed NFT metadata:', metadata);
        } catch (error) {
          console.error('Error fetching metadata for listed NFT:', error);
          metadata = {
            name: `NFT #${item.tokenId}`,
            description: 'Metadata unavailable',
            image: 'https://via.placeholder.com/150?text=No+Image'
          };
        }
  
        // Process image URL if it's IPFS
        let imageUrl = metadata.image;
        if (imageUrl?.startsWith('ipfs://')) {
          imageUrl = imageUrl.replace('ipfs://', IPFS_GATEWAYS[0]);
        }
  
        return {
          id: item.tokenId.toString(),
          name: metadata.name || `NFT #${item.tokenId}`,
          description: metadata.description || 'No description available',
          image: imageUrl || 'https://via.placeholder.com/150?text=No+Image',
          listing: {
            marketItemId: item.marketItemId.toString(),
            price: ethers.formatEther(item.price),
            amount: item.remainingAmount.toString(),
            endTime: new Date(Number(item.endTime) * 1000).toISOString(),
            active: item.active
          }
        };
      }));
  
      console.log('Listed NFTs:', listedNFTs);
      return listedNFTs;
    } catch (error) {
      console.error("Error fetching listed NFTs:", error);
      throw error;
    }
  }

  export const listNFTForSale = async (nftContract, tokenId, amount, price, endTime) => {
    try {
      const marketplaceContract = await getMarketplaceContract();
      const priceInWei = ethers.parseEther(price.toString());
      const endTimeInSeconds = Math.floor(new Date(endTime).getTime() / 1000);

      // First estimate the gas
      const estimatedGas = await marketplaceContract.listToken.estimateGas(
        nftContract,
        tokenId,
        amount,
        priceInWei,
        endTimeInSeconds
      );

      // Add a 20% buffer to the estimated gas
      const gasLimit = ethers.toBigInt(Math.floor(Number(estimatedGas) * 1.2));

      console.log('Estimated gas:', estimatedGas.toString());
      console.log('Gas limit with buffer:', gasLimit.toString());

      const tx = await marketplaceContract.listToken(
        nftContract,
        tokenId,
        amount,
        priceInWei,
        endTimeInSeconds,
        {
          gasLimit: Math.max(Number(gasLimit), 500000),
          gasPrice: ethers.parseUnits('100', 'gwei')
        }
      );

      await tx.wait();
      return tx;
    } catch (error) {
      console.error('Error listing NFT:', error);
      throw error;
    }
  };


  export const verifyNFTState = async (tokenId, amount) => {
    try {
      const contract = await getNFTContract();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Check balance
      const balance = await contract.balanceOf(address, tokenId);
      const hasEnough = Number(balance) >= Number(amount);

      // Check approval with explicit provider to avoid gas estimation issues
      const isApproved = await contract.isApprovedForAll(
        address,
        MARKETPLACE_ADDRESS
      );

      console.log('NFT State Check:', {
        tokenId,
        balance: balance.toString(),
        hasEnough,
        isApproved,
        userAddress: address,
        marketplaceAddress: MARKETPLACE_ADDRESS
      });

      return {
        balance: balance.toString(),
        hasEnough,
        approved: isApproved
      };
    } catch (error) {
      console.error('Error verifying NFT state:', error);
      throw new Error('Failed to verify NFT state: ' + (error.reason || error.message));
    }
  };

  // Helper function to verify NFT and marketplace contract states
  export const verifyContractStates = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, provider);
      const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

      // Check NFT contract
      const nftCode = await provider.getCode(NFT_ADDRESS);
      const marketplaceCode = await provider.getCode(MARKETPLACE_ADDRESS);

      return {
        nftContract: {
          address: NFT_ADDRESS,
          hasCode: nftCode !== '0x',
          canRead: await nftContract.supportsInterface('0xd9b67a26') // ERC1155 interface ID
        },
        marketplaceContract: {
          address: MARKETPLACE_ADDRESS,
          hasCode: marketplaceCode !== '0x'
        },
        signer: {
          address: signerAddress,
          network: await provider.getNetwork()
        }
      };
    } catch (error) {
      console.error('Contract state verification failed:', error);
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


  export async function handleExpiredListings(account) {
    try {
        const marketplaceContract = await getMarketplaceContract();
        
        // Get expired items
        const expiredItems = await marketplaceContract.fetchExpiredItems();
        console.log('Found expired items:', expiredItems);

        for (const item of expiredItems) {
            if (item.seller.toLowerCase() === account.toLowerCase()) {
                try {
                    console.log('Cleaning expired listing:', item.marketItemId.toString());
                    const tx = await marketplaceContract.cleanExpiredListing(item.marketItemId);
                    await tx.wait();
                    
                    // Log the activity
                    await api.createActivity({
                        wallet_address: account.toLowerCase(),
                        activity_type: 'EXPIRED',
                        token_id: item.tokenId.toString(),
                        amount: item.remainingAmount.toString(),
                        price: ethers.formatEther(item.price),
                        transaction_hash: tx.hash
                    });
                } catch (error) {
                    console.error('Error cleaning listing:', error);
                }
            }
        }
        
        return expiredItems.length > 0;
    } catch (error) {
        console.error('Error handling expired listings:', error);
        throw error;
    }
  }

  export async function checkExpiredListings(account, shouldClean = false) {
    try {
      const marketplaceContract = await getMarketplaceContract();
      const expiredItems = await marketplaceContract.fetchExpiredItems();
      
      // Filter items belonging to the account
      const accountExpiredItems = expiredItems.filter(item => 
        item.seller.toLowerCase() === account.toLowerCase()
      );

      if (shouldClean) {
        await handleExpiredListings(account);
      }

      return accountExpiredItems;
    } catch (error) {
      console.error('Error checking expired listings:', error);
      return [];
    }
  }

  export async function claimExpiredListing(marketItemId) {
    try {
      const marketplaceContract = await getMarketplaceContract();
      
      // Convert marketItemId to BigInt
      const marketItemIdBN = ethers.toBigInt(marketItemId);
      
      // Use fixed gas parameters instead of estimation
      const tx = await marketplaceContract.cleanExpiredListing(marketItemIdBN, {
        gasLimit: ethers.toBigInt('500000'),
        gasPrice: ethers.parseUnits('100', 'gwei')
      });
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error claiming expired listing:', error);
      throw error;
    }
  }

  export async function claimAllExpiredListings(marketItemIds) {
    try {
      const marketplaceContract = await getMarketplaceContract();
      
      // Use fixed gas parameters for batch transaction
      const tx = await marketplaceContract.cleanMultipleExpiredListings(marketItemIds, {
        gasLimit: ethers.toBigInt('500000'), // Higher gas limit for multiple operations
        gasPrice: ethers.parseUnits('100', 'gwei')
      });

      // Wait for transaction confirmation and return it
      const receipt = await tx.wait();
      return receipt;

    } catch (error) {
      console.error('Error claiming all expired listings:', error);
      throw error;
    }
  }