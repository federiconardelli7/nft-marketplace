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

      // Get gas estimate first
      const gasEstimate = await marketplace.buyToken.estimateGas(
        marketItemId,
        amount,
        { value: ethers.parseEther(price.toString()) }
      );

      console.log('Gas estimate:', gasEstimate.toString());

      // Add 20% buffer to gas estimate
      const gasLimit = (gasEstimate * ethers.toBigInt(120)) / ethers.toBigInt(100);

      const tx = {
        from: signerAddress,
        value: ethers.parseEther(price.toString()),
        gasLimit
      };

      console.log('Transaction parameters:', {
        marketItemId,
        amount,
        ...tx,
        value: tx.value.toString(),
        gasLimit: tx.gasLimit.toString()
      });

      const transaction = await marketplace.buyToken(marketItemId, amount, tx);
      console.log('Transaction submitted:', transaction.hash);

      const receipt = await transaction.wait();
      console.log('Transaction confirmed:', receipt);

      // Get the market item
      const marketItem = await marketplace.getMarketItem(marketItemId);

      // Log activities
      await api.createActivity({
        wallet_address: signerAddress.toLowerCase(),
        activity_type: 'BUY',
        token_id: marketItem.tokenId.toString(),
        amount: amount,
        price: price,
        transaction_hash: receipt.hash
      });

      await api.createActivity({
        wallet_address: marketItem.seller.toLowerCase(),
        activity_type: 'SELL',
        token_id: marketItem.tokenId.toString(),
        amount: amount,
        price: price,
        transaction_hash: receipt.hash
      });

      return receipt;
    } catch (error) {
      console.error('Error buying NFT:', error);
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

  export const listNFTForSale = async (nftContract, tokenId, amount, price, endDate) => {
    try {
      console.log('Starting listing process with params:', {
        nftContract,
        tokenId: tokenId.toString(),
        amount: amount.toString(),
        price,
        endDate
      });
  
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      
      console.log('Connected wallet:', signerAddress);
      
      // Initialize marketplace contract
      const marketplaceContract = new ethers.Contract(
        MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        signer
      );
  
      // Format parameters
      const priceInWei = ethers.parseEther(price.toString());
      const endTimeUnix = Math.floor(new Date(endDate).getTime() / 1000);
      const tokenIdBN = ethers.getBigInt(tokenId);
      const amountBN = ethers.getBigInt(amount);
  
      console.log('Formatted parameters:', {
        nftAddress: NFT_ADDRESS,
        tokenId: tokenIdBN.toString(),
        amount: amountBN.toString(),
        priceWei: priceInWei.toString(),
        endTimeUnix: endTimeUnix.toString()
      });
  
      // Get fee data
      const feeData = await provider.getFeeData();
      console.log('Fee data:', {
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
      });
  
      // Prepare transaction
      const tx = await marketplaceContract.listToken(
        NFT_ADDRESS,
        tokenIdBN,
        amountBN,
        priceInWei,
        endTimeUnix,
        {
          gasLimit: ethers.toBigInt('500000'),
          gasPrice: ethers.parseUnits('100', 'gwei')
        }
      );
  
      console.log('Transaction submitted:', tx.hash);
      return tx;
  
    } catch (error) {
      console.error('Listing error details:', {
        message: error.message,
        code: error.code,
        data: error.data,
        transaction: error.transaction
      });
  
      throw new Error(error.message || 'Failed to list NFT');
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
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const marketplaceContract = new ethers.Contract(
      MARKETPLACE_ADDRESS,
      MARKETPLACE_ABI,
      signer
    );

    // Get all market items
    const rawItems = await marketplaceContract.fetchMarketItems();
    const now = Math.floor(Date.now() / 1000);

    console.log('Current time:', new Date(now * 1000).toISOString());

    // Process items
    const marketItems = rawItems.map(item => ({
      marketItemId: item.marketItemId.toString(),
      tokenId: item.tokenId.toString(),
      seller: item.seller.toLowerCase(),
      price: ethers.formatEther(item.price),
      amount: item.remainingAmount.toString(),
      endTime: Number(item.endTime),
      active: item.active
    }));

    // Filter expired items
    const expiredItems = marketItems.filter(item => {
      const isExpired = item.endTime < now;
      const belongsToUser = item.seller.toLowerCase() === account.toLowerCase();
      return belongsToUser && item.active && isExpired;
    });

    console.log('Found expired items:', expiredItems);

    if (expiredItems.length > 0) {
      const nftContract = new ethers.Contract(
        NFT_ADDRESS,
        NFT_ABI,
        provider
      );

      for (const item of expiredItems) {
        try {
          // Get initial balance
          const initialBalance = await nftContract.balanceOf(account, item.tokenId);
          console.log('Initial balance:', initialBalance.toString());

          // Clean the listing
          const tx = await marketplaceContract.cleanExpiredListing(
            item.marketItemId,
            { 
              gasLimit: ethers.toBigInt('500000'),
              gasPrice: ethers.parseUnits('100', 'gwei')
            }
          );
          
          console.log('Clean transaction sent:', tx.hash);
          await tx.wait();

          // Verify NFT return
          const newBalance = await nftContract.balanceOf(account, item.tokenId);
          console.log('New balance:', newBalance.toString());

          // Compare balances using ethers
          const initialBalanceNum = Number(ethers.formatUnits(initialBalance, 0));
          const newBalanceNum = Number(ethers.formatUnits(newBalance, 0));
          const amountNum = Number(item.amount);

          if (newBalanceNum >= initialBalanceNum + amountNum) {
            console.log('NFT successfully returned to seller');
            
            // Log the expiration
            await api.createActivity({
              wallet_address: account.toLowerCase(),
              activity_type: 'EXPIRED',
              token_id: item.tokenId,
              amount: item.amount,
              price: item.price,
              transaction_hash: tx.hash
            });

            return true;
          } else {
            console.error('NFT not properly returned:', {
              initialBalance: initialBalanceNum,
              newBalance: newBalanceNum,
              expectedBalance: initialBalanceNum + amountNum,
              amount: amountNum
            });
          }
        } catch (error) {
          console.error('Error cleaning listing:', {
            marketItemId: item.marketItemId,
            error: error.message
          });
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error in handleExpiredListings:', error);
    return false;
  }
}