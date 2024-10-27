import React, { useState, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import ipfsService from '../services/ipfsService';
import { api } from '../services/api';

import { 
  NFT_MARKETPLACE_ADDRESS, 
  NFT_MARKETPLACE_ABI,
  switchToAmoyNetwork 
} from '../config/contracts';
import './MintNFTPage.css';

function MintNFTPage({ account }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [supply, setSupply] = useState(1);
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [traits, setTraits] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [mintingStatus, setMintingStatus] = useState(null);
  const [transactionHash, setTransactionHash] = useState(null);
  const [costInfo, setCostInfo] = useState({
    listingFee: null,
    gasPrice: null
  });
  const fileInputRef = useRef(null);
  const [maticPrice, setMaticPrice] = useState(null);

  const fetchMaticPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd');
      const data = await response.json();
      setMaticPrice(data['matic-network'].usd);
    } catch (error) {
      console.error("Error fetching MATIC price:", error);
    }
  };

  useEffect(() => {
    if (account) {
      updateCostEstimates();
      fetchMaticPrice();
    }
  }, [account]);

  const getExplorerLink = (txHash) => {
    return `https://www.oklink.com/amoy/tx/${txHash}`;
  };

  const checkSetup = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      console.log('Current Network:', {
        chainId: network.chainId,
        name: network.name
      });

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      console.log('Wallet Setup:', {
        address,
        balance: ethers.formatEther(balance),
        network: network.name
      });

      const contract = await getContract();
      const listingFee = await contract.LISTING_FEE();
      console.log('Contract Setup:', {
        address: NFT_MARKETPLACE_ADDRESS,
        listingFee: ethers.formatEther(listingFee)
      });

      return true;
    } catch (error) {
      console.error('Setup check failed:', error);
      return false;
    }
  };

  const getContract = async () => {
    try {
      if (!window.ethereum) throw new Error("Please install MetaMask");
      
      if (!account) {
        throw new Error("Please connect your wallet first");
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(
        NFT_MARKETPLACE_ADDRESS,
        NFT_MARKETPLACE_ABI,
        signer
      );

      return contract;
    } catch (error) {
      console.error("Error getting contract:", error);
      throw error;
    }
  };

  const updateCostEstimates = async () => {
    try {
      const contract = await getContract();
      const listingFee = await contract.LISTING_FEE();
      
      // Get gas price using eth_gasPrice
      const gasPrice = await window.ethereum.request({ method: 'eth_gasPrice' });
      const gasPriceDecimal = parseInt(gasPrice, 16);
      const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');
  
      // Set minimum price (0.001 MATIC) - same as in mintNFT
      const priceInWei = ethers.parseEther("0.001");
  
      // Estimate gas for minimum transaction using the same parameter order as mintNFT
      const gasEstimate = await contract.createToken.estimateGas(
        1,  // supply
        priceInWei,  // price
        "ipfs://placeholder",  // metadata URI
        { value: listingFee }  // transaction options with listing fee
      );
  
      // Calculate total gas cost in POL
      const gasCost = gasPriceDecimal * Number(gasEstimate.toString());
      const gasFeeInPol = ethers.formatEther(gasCost.toString());
      
      // Set cost info with both POL and USD values
      const listingFeeInPol = ethers.formatEther(listingFee);
      const totalInPol = (Number(listingFeeInPol) + Number(gasFeeInPol)).toFixed(8);
  
      // Calculate USD values if maticPrice is available
      const listingFeeUSD = maticPrice ? (Number(listingFeeInPol) * maticPrice).toFixed(2) : null;
      const gasFeeUSD = maticPrice ? (Number(gasFeeInPol) * maticPrice).toFixed(2) : null;
      const totalUSD = maticPrice ? (Number(totalInPol) * maticPrice).toFixed(2) : null;
  
      setCostInfo({
        listingFee: listingFeeInPol,
        listingFeeUSD,
        estimatedGasFee: gasFeeInPol,
        gasFeeUSD,
        totalCost: totalInPol,
        totalUSD,
        gasPriceGwei
      });
    } catch (error) {
      console.error("Error getting cost estimates:", error);
    }
  };

  const mintNFT = async (metadataUrl, supply) => {
    try {
      const contract = await getContract();
      
      setMintingStatus('Initiating transaction...');
      
      // Get the listing fee from the contract
      const listingFee = await contract.LISTING_FEE();
      console.log('Listing Fee:', ethers.formatEther(listingFee), 'MATIC');
      
      // Set minimum price (0.001 MATIC)
      const priceInWei = ethers.parseEther("0.001");
      console.log('Price in Wei:', priceInWei.toString(), '(MATIC in Wei)');
  
      // Get gas price using eth_gasPrice
      const gasPrice = await window.ethereum.request({ method: 'eth_gasPrice' });
      const gasPriceDecimal = parseInt(gasPrice, 16);
      console.log('Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei');
      
      // Estimate gas
      const gasEstimate = await contract.createToken.estimateGas(
        supply, 
        priceInWei,
        metadataUrl,  // Add the metadata URL parameter
        { value: listingFee }
      );
      console.log('Estimated Gas:', gasEstimate.toString(), 'units');
  
      // Create token with explicit parameters
      const transaction = await contract.createToken(
        supply, 
        priceInWei,
        metadataUrl,  // Add the metadata URL parameter
        {
          value: listingFee,
          gasPrice: gasPrice,
          gasLimit: Math.floor(Number(gasEstimate) * 1.5)
        }
      );
  
      setMintingStatus('Transaction submitted. Waiting for confirmation...');
      console.log('Transaction submitted:', transaction.hash);
      
      const receipt = await transaction.wait();
      console.log('Transaction confirmed:', receipt);
      
      const event = receipt.logs.find(log => log.eventName === 'MarketItemCreated');
      const tokenId = event ? event.args.tokenId : null;
  
      console.log('Token ID:', tokenId ? tokenId.toString() : 'Not found');
  
      return {
        success: true,
        tokenId,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error("Detailed transaction error:", {
        message: error.message,
        code: error.code,
        data: error.data,
        transaction: error.transaction,
        reason: error.reason,
        method: error.method,
        transaction: {
          to: NFT_MARKETPLACE_ADDRESS,
          value: error.transaction?.value?.toString(),
          data: error.transaction?.data,
          gasLimit: error.transaction?.gasLimit?.toString()
        }
      });
  
      if (error.code === 'INSUFFICIENT_FUNDS') {
        setMintingStatus('Failed: Insufficient funds for transaction');
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        setMintingStatus('Failed: Could not estimate gas limit');
      } else {
        setMintingStatus('Failed to mint NFT. Please check console for details.');
      }
      
      throw error;
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file');
      return;
    }

    // Validate file size (e.g., max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setImageFile(file);
    setImage(URL.createObjectURL(file));
    setUploadError(null);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const addTrait = () => {
    setTraits([...traits, { type: '', value: '' }]);
  };

  const updateTrait = (index, field, value) => {
    const newTraits = [...traits];
    newTraits[index][field] = value;
    setTraits(newTraits);
  };

  const removeTrait = (index) => {
    const newTraits = traits.filter((_, i) => i !== index);
    setTraits(newTraits);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSupply(1);
    setImage(null);
    setImageFile(null);
    setTraits([]);
    setUploadError(null);
    setUploadProgress(null);
    setMintingStatus(null);
    setTransactionHash(null);
  };

  const handleSuccessfulMint = async (mintResult, metadata) => {
    try {
      console.log('Minting successful, saving to database...');
  
      // Create or get user
      let user = await api.getUser(account);
      if (!user) {
        user = await api.createUser({
          wallet_address: account
        });
      }
  
      // Create NFT record
      await api.createNFT({
        token_id: mintResult.tokenId.toString(),
        metadata: metadata,
        creator_address: account,
        current_owner: account,
        total_supply: supply,
        available_amount: supply
      });
  
      // Log minting activity
      await api.logActivity({
        wallet_address: account,
        activity_type: 'MINT',
        token_id: mintResult.tokenId.toString(),
        amount: supply,
        transaction_hash: mintResult.transactionHash
      });
  
    } catch (error) {
      console.error('Error saving mint data:', error);
      // Don't throw the error - we still want to show success for the blockchain transaction
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!account) {
      setUploadError('Please connect your wallet first');
      return;
    }

    // Check setup first
    const isSetupOk = await checkSetup();
    if (!isSetupOk) {
      setUploadError('Network or contract setup issue. Please check console.');
      return;
    }

    if (!imageFile) {
      setUploadError('Please select an image');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress('Uploading image to IPFS...');

    try {
      // First upload the image to IPFS
      const imageUploadResult = await ipfsService.uploadFile(imageFile);
      if (!imageUploadResult.success) {
        throw new Error(imageUploadResult.message || 'Failed to upload image');
      }

      setUploadProgress('Creating metadata...');

      // Create metadata
      const metadata = {
        name,
        description,
        image: imageUploadResult.pinataUrl,
        attributes: traits.filter(trait => trait.type && trait.value).map(trait => ({
          trait_type: trait.type,
          value: trait.value
        }))
      };

      setUploadProgress('Uploading metadata to IPFS...');

      // Upload metadata to IPFS
      const metadataUploadResult = await ipfsService.uploadMetadata(metadata);
      if (!metadataUploadResult.success) {
        throw new Error(metadataUploadResult.message || 'Failed to upload metadata');
      }

      setUploadProgress('Minting NFT...');

      // Mint the NFT using the metadata URL
      const mintResult = await mintNFT(metadataUploadResult.pinataUrl, supply);

      // Save to database
      await handleSuccessfulMint(mintResult, metadata);

      // Set transaction hash for the explorer link
      setTransactionHash(mintResult.transactionHash);

      // Clear form after successful minting
      resetForm();
      setMintingStatus(`NFT minted successfully!`);

      // Log transaction details to console
      console.log('=== NFT Minting Successful ===');
      console.log('Transaction Hash:', mintResult.transactionHash);
      console.log('Block Explorer:', getExplorerLink(mintResult.transactionHash));
      console.log('IPFS Metadata URL:', metadataUploadResult.pinataUrl);
      console.log('IPFS Image URL:', imageUploadResult.pinataUrl);
      console.log('========================');

    } catch (error) {
      console.error('Error in NFT creation process:', error);
      setUploadError(error.message || 'Error creating NFT. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Show connect wallet message if not connected
  if (!account) {
    return (
      <div className="mint-nft-page">
        <div className="mint-nft-content">
          <h1>Mint New NFT</h1>
          <div className="wallet-connect-message">
            <p>Please connect your wallet to mint NFTs</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mint-nft-page">
      <div className="mint-nft-content">
        <h1>Mint New NFT</h1>
        {uploadError && <div className="error-message">{uploadError}</div>}
        {uploadProgress && <div className="progress-message">{uploadProgress}</div>}
        {mintingStatus && (
          <div className="minting-status">
            <p>{mintingStatus}</p>
            {transactionHash && (
              <a 
                href={getExplorerLink(transactionHash)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="view-transaction-button"
              >
                View Transaction
              </a>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Add cost info display */}
          {costInfo.listingFee && (
            <div className="cost-info">
                <h4>Minting Costs:</h4>
                <div className="cost-item">
                <span>Platform Fee:</span>
                <span>
                    {costInfo.listingFee} MATIC
                    {maticPrice && <span className="usd-value">
                    (${(Number(costInfo.listingFee) * maticPrice).toFixed(2)})
                    </span>}
                </span>
                </div>
                <div className="cost-item">
                <span>Estimated Gas Fee:</span>
                <span>
                    ~{costInfo.estimatedGasFee} MATIC
                    {maticPrice && <span className="usd-value">
                    (${(Number(costInfo.estimatedGasFee) * maticPrice).toFixed(2)})
                    </span>}
                </span>
                </div>
                <div className="cost-item total">
                <span>Total Estimated Cost:</span>
                <span>
                    ~{costInfo.totalCost} MATIC
                    {maticPrice && <span className="usd-value">
                    (${(Number(costInfo.totalCost) * maticPrice).toFixed(2)})
                    </span>}
                </span>
                </div>
            </div>
          )}
        
          <div 
            className={`image-upload ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
            onClick={() => fileInputRef.current.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="upload-progress">
                <span>{uploadProgress}</span>
              </div>
            ) : image ? (
              <img src={image} alt="NFT preview" />
            ) : (
              <span className="custom-file-upload">
                <i className="fa fa-cloud-upload"></i> 
                {isDragging ? 'Drop image here' : 'Choose or drag image here'}
              </span>
            )}
            <input 
              ref={fileInputRef}
              id="file-upload" 
              type="file" 
              onChange={handleImageChange}
              accept="image/*"
              hidden 
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
            />
          </div>

          <div className="form-group">
            <label htmlFor="supply">Supply</label>
            <input
              type="number"
              id="supply"
              value={supply}
              onChange={(e) => setSupply(parseInt(e.target.value))}
              min="1"
              required
            />
          </div>

          <div className="traits-section">
            <h3>Traits</h3>
            {traits.map((trait, index) => (
              <div key={index} className="trait-input">
                <input
                  type="text"
                  placeholder="Type"
                  value={trait.type}
                  onChange={(e) => updateTrait(index, 'type', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={trait.value}
                  onChange={(e) => updateTrait(index, 'value', e.target.value)}
                />
                <button type="button" onClick={() => removeTrait(index)} className="remove-trait">Remove</button>
              </div>
            ))}
            <button type="button" onClick={addTrait}>+ Add Trait</button>
          </div>

          <button 
            type="submit" 
            className="submit-button" 
            disabled={isUploading || !imageFile}
          >
            {isUploading ? 'Processing...' : 'Mint NFT'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default MintNFTPage;