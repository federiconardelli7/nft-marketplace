import React, { useState, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import { uploadFile, uploadMetadata, verifyCredentials } from '../services/ipfsService';
import { api } from '../services/api';

import { 
  // NFT_MARKETPLACE_ADDRESS, 
  // NFT_MARKETPLACE_ABI,
  NFT_ADDRESS, 
  NFT_ABI,
  switchToAmoyNetwork 
} from '../config/contracts';
import './MintNFTPage.css';
import { NFT } from '../schemas';

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
  const [creatorRoyalty, setCreatorRoyalty] = useState(5); // Default 5%

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
      verifyCredentials().then(valid => {
        if (!valid) {
          console.error('Pinata credentials are not valid');
        }
      });
    }
  }, [account]);

  const getExplorerLink = (txHash) => {
    return `https://amoy.polygonscan.com/tx/${txHash}`;
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
      console.log('Contract Setup:', {
        address: NFT_ADDRESS,
        contract: contract ? 'Connected' : 'Not Connected'
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
      
      console.log('Contract setup:', {
        NFT_ADDRESS,
        NFT_ABI: NFT_ABI ? 'Present' : 'Missing',
        account
      });
      
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
      console.error("Error getting contract:", error);
      throw error;
    }
  };

  const updateCostEstimates = async () => {
    try {
      const gasPrice = await window.ethereum.request({ 
        method: 'eth_gasPrice' 
      });
      
      // Convert hex gasPrice to decimal using ethers
      const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');
      
      // Estimate gas for minting (typical gas limit for ERC1155 mint)
      const estimatedGas = 150000; // Conservative estimate for ERC1155 mint
      const gasCostEther = ethers.formatEther(
        ethers.parseUnits(gasPriceGwei, 'gwei') * estimatedGas
      );
      
      setCostInfo({
        gasPrice: gasPriceGwei,
        estimatedGasFee: gasCostEther,
        totalCost: gasCostEther // Total is just gas fee since minting is free
      });

    } catch (error) {
      console.error('Error estimating gas costs:', error);
      setCostInfo({
        gasPrice: '0',
        estimatedGasFee: '0',
        totalCost: '0'
      });
    }
  };

  const mintNFT = async (metadataUrl, supply) => {
    try {
      const contract = await getContract();
      const royaltyBasisPoints = creatorRoyalty * 100;
      
      const transaction = await contract.mint(
        supply,
        metadataUrl,
        royaltyBasisPoints
      );

      const receipt = await transaction.wait();
      setTransactionHash(receipt.hash);

      return {
        tokenId: receipt.logs[0].args[3], // Adjust based on your event structure
        transactionHash: receipt.hash
      };
    } catch (error) {
      throw new Error('Transaction failed. Please try again.');
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

  const handleSuccessfulMint = async (mintResult, urls) => {
    try {
      console.log('Mint result:', mintResult);
      
      const nftData = {
        token_id: mintResult.tokenId.toString(),
        metadata: {
          name,
          description,
          image: urls.imageUrl,
          attributes: traits.filter(trait => trait.type && trait.value).map(trait => ({
            trait_type: trait.type,
            value: trait.value
          }))
        },
        creator_address: account.toLowerCase(),
        current_owner: account.toLowerCase(),
        total_supply: supply,
        available_amount: supply
      };

      console.log('Saving NFT data:', nftData);
      await api.createNFT(nftData);

      // Create mint activity record
      const activityData = {
        wallet_address: account.toLowerCase(),
        activity_type: 'MINT',
        token_id: mintResult.tokenId.toString(),
        amount: supply,
        transaction_hash: mintResult.transactionHash
      };

      await api.createActivity(activityData);
      
      resetForm();
      setMintingStatus('success');
    } catch (error) {
      console.error('Error saving NFT data:', error);
      setMintingStatus('warning');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsUploading(true);
    setUploadError(null);
    setMintingStatus('Starting minting process...');

    try {
      if (!imageFile) {
        throw new Error('Please select an image');
      }

      setMintingStatus('Uploading image to IPFS...');
      const imageUploadResult = await uploadFile(imageFile);
      if (!imageUploadResult.success) {
        throw new Error('Failed to upload image to IPFS');
      }

      setMintingStatus('Creating metadata...');
      const metadata = {
        name: name,
        description: description,
        image: imageUploadResult.pinataUrl,
        attributes: traits.filter(trait => trait.type && trait.value).map(trait => ({
          trait_type: trait.type,
          value: trait.value
        }))
      };

      setMintingStatus('Uploading metadata to IPFS...');
      const metadataUploadResult = await uploadMetadata(metadata);
      if (!metadataUploadResult.success) {
        throw new Error('Failed to upload metadata to IPFS');
      }

      setMintingStatus('Confirming transaction...');
      const mintResult = await mintNFT(
        metadataUploadResult.pinataUrl,
        supply
      );

      setMintingStatus('NFT minted successfully!');
      handleSuccessfulMint(mintResult, {
        imageUrl: imageUploadResult.pinataUrl,
        metadataUrl: metadataUploadResult.pinataUrl
      });

      // Clear minting status after 15 seconds
      setTimeout(() => {
        setMintingStatus(null);
        resetForm();
      }, 15000);

    } catch (error) {
      console.error('Minting failed:', error);
      setUploadError(error.message || 'Error creating NFT. Please try again.');
    } finally {
      setIsUploading(false);
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

          <div className="form-group supply-group">
            <label htmlFor="supply">Supply</label>
            <div className="supply-input-container">
              <button 
                type="button" 
                className="supply-btn minus"
                onClick={() => setSupply(prev => Math.max(1, prev - 1))}
                disabled={supply <= 1}
              >
                -
              </button>
              <input
                type="number"
                id="supply"
                value={supply}
                onChange={(e) => setSupply(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                required
              />
              <button 
                type="button" 
                className="supply-btn plus"
                onClick={() => setSupply(prev => prev + 1)}
              >
                +
              </button>
            </div>
          </div>

          <div className="royalties-section">
            <h4>Royalties</h4>
            <div className="royalties-container">
              <div className="royalty-item">
                <label htmlFor="creatorRoyalty">Creator</label>
                <select 
                  id="creatorRoyalty"
                  value={creatorRoyalty}
                  onChange={(e) => setCreatorRoyalty(parseInt(e.target.value))}
                  className="royalty-input"
                >
                  {[...Array(5)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}%
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="royalty-item">
                <label>Marketplace</label>
                <div className="royalty-input disabled">1%</div>
              </div>
            </div>
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