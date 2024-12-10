import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { fetchUserNFTs, fetchListedNFTs, listNFTForSale, listNFTForAuction, verifyNFTState, handleExpiredListings, checkExpiredListings, claimExpiredListing, claimAllExpiredListings, getMarketplaceContract } from '../utils/contractInteraction';
import { 
  NFT_ABI,
  NFT_ADDRESS,
  MARKETPLACE_ADDRESS, 
  MARKETPLACE_ABI 
} from '../config/contracts';
import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import './ProfilePage.css';
import { toast } from 'react-toastify';

function ProfilePage({ account, showProfileSection = true }) {
  const [userNFTs, setUserNFTs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('owned'); 
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState("https://via.placeholder.com/100");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [profileInfo, setProfileInfo] = useState({
    username: 'CryptoUser',
    bio: 'NFT enthusiast and digital art collector',
    twitter: '@cryptouser',
    instagram: '@cryptouser'
  });
  const [error, setError] = useState(null);

  const bioTextareaRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  // New state variables for NFT selling
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [saleType, setSaleType] = useState('fixed');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('POL');
  const [duration, setDuration] = useState('1 day');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState(1);
  const [stateCheckPassed, setStateCheckPassed] = useState(false);
  const [listedNFTs, setListedNFTs] = useState([]);
  const [selectedListedNFT, setSelectedListedNFT] = useState(null);
  const [showListedModal, setShowListedModal] = useState(false);

  const [isListing, setIsListing] = useState(false);
  const [listingError, setListingError] = useState(null);
  const [listingStatus, setListingStatus] = useState(null);
  const [listingTxHash, setListingTxHash] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(null);
  const [removeStatus, setRemoveStatus] = useState(null);
  const [removeTxHash, setRemoveTxHash] = useState(null);
  const [needsApproval, setNeedsApproval] = useState(false);

  const [nftContract, setNftContract] = useState(null);

  const [expiredListings, setExpiredListings] = useState([]);
  const [claimingStatus, setClaimingStatus] = useState({});

  const [hasExpiredNFTs, setHasExpiredNFTs] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  const [signer, setSigner] = useState(null);

  const [isClaimingAll, setIsClaimingAll] = useState(false);

  useEffect(() => {
    const setupSigner = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const newSigner = await provider.getSigner();
        setSigner(newSigner);
      }
    };
    setupSigner();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userData = await api.getUser(account);
        if (userData) {
          setProfileInfo({
            username: userData.username,
            bio: userData.bio,
            twitter: userData.social_links?.twitter,
            instagram: userData.social_links?.instagram
          });
          if (userData.profile_image && 
              (userData.profile_image.startsWith('data:image') || 
               userData.profile_image.startsWith('http'))) {
            setProfileImage(userData.profile_image);
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    if (account) {
      fetchUserProfile();
    }
  }, [account]);

  useEffect(() => {
    updateEndDate(duration);
  }, [duration]);

  useEffect(() => {
    setPrice(currency === 'POL' ? '0.001' : '1');
  }, [currency]);

  useEffect(() => {
    if (account) {
      checkForExpiredNFTs();
    }
  }, [account]);
// useEffect(() => {
//   const checkExpiredListings = async () => {
//     if (!account) return;
    
//     try {
//       const hadExpiredListings = await handleExpiredListings(account);
//       if (hadExpiredListings) {
//         // Refresh NFTs and listed items
//         const [updatedNFTs, updatedListedNFTs] = await Promise.all([
//           fetchUserNFTs(account),
//           fetchListedNFTs(account)
//         ]);
//         setUserNFTs(updatedNFTs);
//         setListedNFTs(updatedListedNFTs);
//       }
//     } catch (error) {
//       console.error('Error checking expired listings:', error);
//     }
//   };

//   // Check immediately and then every minute
//   checkExpiredListings();
//   const interval = setInterval(checkExpiredListings, 60 * 1000);

//   return () => clearInterval(interval);
// }, [account]);

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      if (profileImage && !checkFileSize(profileImage)) {
        alert('Profile image is too large. Please choose a smaller image.');
        return;
      }

      const updatedProfile = {
        username: profileInfo.username,
        bio: profileInfo.bio,
        profile_image: profileImage,
        social_links: {
          twitter: profileInfo.twitter,
          instagram: profileInfo.instagram
        }
      };

      console.log('Saving profile with image size:', 
        profileImage ? Math.round(profileImage.length / 1024) + 'KB' : 'No image');
      
      const result = await api.updateUserProfile(account, updatedProfile);
      console.log('Profile updated successfully:', result);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again with a smaller image.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileInfo(prevInfo => ({
      ...prevInfo,
      [name]: value
    }));

    if (name === 'bio') {
      adjustTextareaHeight();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = bioTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (isEditing) {
      adjustTextareaHeight();
    }
  }, [isEditing]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(URL.createObjectURL(file));
    }
  };

  const checkApprovalStatus = async (tokenId) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      
      console.log('Checking approval status for:', {
        owner: signerAddress,
        operator: MARKETPLACE_ADDRESS,
        NFT_ADDRESS
      });
      
      const contract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
      
      const isApproved = await contract.isApprovedForAll(
        signerAddress,
        MARKETPLACE_ADDRESS
      );
      
      console.log('Approval status:', isApproved);
      
      setStateCheckPassed(isApproved);
      setNeedsApproval(!isApproved);
      setNftContract(contract);
      
      return isApproved;
    } catch (error) {
      console.error('Error checking approval status:', error);
      setError(error.message);
      return false;
    }
  };

  const handleApproval = async () => {
    if (!selectedNFT) return;
    
    try {
      setError(null);
      setListingStatus('Approving marketplace...');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
      
      console.log('Sending approval transaction...');
      const tx = await contract.setApprovalForAll(
        MARKETPLACE_ADDRESS,
        true,
        {
          gasLimit: ethers.toBigInt('150000'), //300000
          gasPrice: ethers.parseUnits('100', 'gwei')
        }
      );
      
      setListingStatus('Waiting for approval confirmation...');
      console.log('Approval transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Approval confirmed:', receipt);
      
      // Verify approval after transaction
      const isApproved = await checkApprovalStatus(selectedNFT.id);
      if (isApproved) {
        setStateCheckPassed(true);
        setNeedsApproval(false);
        setListingStatus('Marketplace approved successfully!');
        
        // Clear status after delay
        setTimeout(() => {
          setListingStatus(null);
        }, 3000);
      } else {
        throw new Error('Approval verification failed');
      }
      
    } catch (error) {
      console.error('Error during approval:', error);
      setError(error.message || 'Failed to approve marketplace');
      setStateCheckPassed(false);
    }
  };

  useEffect(() => {
    const verifyApproval = async () => {
      if (account && selectedNFT) {
        const isApproved = await checkApprovalStatus(selectedNFT.id);
        setStateCheckPassed(isApproved);
        setNeedsApproval(!isApproved);
      }
    };
  
    verifyApproval();
  }, [account, selectedNFT]);
  
  const handleApprovalSuccess = async () => {
    setStateCheckPassed(true);
    setNeedsApproval(false);
    
    // Refresh NFT data after approval
    if (account) {
      const [updatedNFTs, updatedListedNFTs] = await Promise.all([
        fetchUserNFTs(account),
        fetchListedNFTs(account),
      ]);
      setUserNFTs(updatedNFTs);
      setListedNFTs(updatedListedNFTs);
    }
  };

  // NFT Selling Modal Functions
  const handleNFTClick = async (nft) => {
    setSelectedNFT(nft);
    setShowSellModal(true);
    setPrice('0.001');
    setDuration('1 day');
    updateEndDate('1 day');
    setAmount(1);
    setError(null);
    setListingError(null);
    setListingStatus(null);
  
    try {
      console.log('Checking NFT approval status...');
      const isApproved = await checkApprovalStatus(nft.id);
      console.log('NFT approval status:', isApproved);
      
      if (!isApproved) {
        setNeedsApproval(true);
        setStateCheckPassed(false);
      } else {
        setNeedsApproval(false);
        setStateCheckPassed(true);
      }
    } catch (err) {
      console.error('Error during NFT click handling:', err);
      setError(err.message);
    }
  };

  const handleCloseSellModal = () => {
    setShowSellModal(false);
    setSelectedNFT(null);
    setPrice('');
    setAmount(1);
    setEndDate('');
    setListingError(null);
    setListingStatus(null);
    setListingTxHash(null);
  };

  const handleAmountChange = (e) => {
    const newAmount = parseInt(e.target.value, 10);
    if (!isNaN(newAmount) && newAmount >= 1 && newAmount <= parseInt(selectedNFT.available)) {
      setAmount(newAmount);
    }
  };

  const incrementAmount = () => {
    if (amount < selectedNFT.available) {
      setAmount(prevAmount => prevAmount + 1);
    }
  };

  const decrementAmount = () => {
    if (amount > 1) {
      setAmount(prevAmount => prevAmount - 1);
    }
  };

  const updateEndDate = (selectedDuration) => {
    const now = new Date();
    let endDateTime = new Date(now);

    switch (selectedDuration) {
      case '1 day':
        endDateTime.setDate(now.getDate() + 1);
        break;
      case '1 week':
        endDateTime.setDate(now.getDate() + 7);
        break;
      case '1 month':
        endDateTime.setMonth(now.getMonth() + 1);
        break;
      case '3 months':
        endDateTime.setMonth(now.getMonth() + 3);
        break;
      case '12 months':
        endDateTime.setFullYear(now.getFullYear() + 1);
        break;
      default:
        break;
    }

    setEndDate(endDateTime.toISOString().slice(0, 16));
  };

  const handleDurationChange = (e) => {
    setDuration(e.target.value);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
  };

  const handlePriceChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,4}$/.test(value)) {
      setPrice(value);
    }
  };

  const incrementPrice = () => {
    setPrice(prev => {
      const increment = currency === 'POL' ? 0.001 : 1;
      const newPrice = parseFloat(prev || 0) + increment;
      return currency === 'POL' ? newPrice.toFixed(4) : newPrice.toString();
    });
  };

  const decrementPrice = () => {
    setPrice(prev => {
      const decrement = currency === 'POL' ? 0.001 : 1;
      const newPrice = Math.max(0, parseFloat(prev || 0) - decrement);
      return currency === 'POL' ? newPrice.toFixed(4) : newPrice.toString();
    });
  };

  const handleCurrencyChange = (e) => {
    setCurrency(e.target.value);
  };

  const handleListedNFTClick = (nft) => {
    setSelectedListedNFT(nft);
    setShowListedModal(true);
  };
  
  const handleCloseListedModal = () => {
    setShowListedModal(false);
    setSelectedListedNFT(null);
    setAmount(1);
  };
  
  const handleRemoveListing = async (nft, amountToRemove) => {
    if (isRemoving) return;
    
    try {
      setIsRemoving(true);
      setRemoveError(null);
      setRemoveStatus('Starting remove process...');
      setRemoveTxHash(null);
  
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const marketplaceContract = new ethers.Contract(
        MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        signer
      );
  
      setRemoveStatus('Processing transaction...');
  
      // Pass both marketItemId and amountToRemove
      const transaction = await marketplaceContract.cancelListing(
        nft.listing.marketItemId,
        amountToRemove,
        { 
          gasLimit: ethers.toBigInt('150000'),
          gasPrice: ethers.parseUnits('100', 'gwei')
        }
      );
  
      setRemoveTxHash(transaction.hash);
      setRemoveStatus('Waiting for confirmation...');
      
      const receipt = await transaction.wait();
      console.log('Transaction confirmed:', receipt);
  
      // Log activity
      await api.createActivity({
        wallet_address: account.toLowerCase(),
        activity_type: 'UNLIST',
        token_id: nft.id,
        amount: amountToRemove,
        price: nft.listing.price,
        transaction_hash: transaction.hash
      });
  
      setRemoveStatus('Successfully removed from listing!');
  
      // Refresh data
      const [updatedListedNFTs, updatedUserNFTs, updatedActivities] = await Promise.all([
        fetchListedNFTs(account),
        fetchUserNFTs(account),
        api.getUserActivities(account)
      ]);
  
      setListedNFTs(updatedListedNFTs);
      setUserNFTs(updatedUserNFTs);
      setActivities(updatedActivities);
  
      // Close modal after delay
      setTimeout(() => {
        handleCloseListedModal();
        setRemoveStatus(null);
        setRemoveTxHash(null);
      }, 2000);
  
    } catch (error) {
      console.error('Error removing from listing:', error);
      setRemoveError(error.message || 'Error removing from listing. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleListNFT = async () => {
    if (!selectedNFT || !price || amount <= 0 || !endDate) return;
  
    setIsListing(true);
    setListingError(null);
    setListingStatus('Starting listing process...');
    setListingTxHash(null);
  
    try {
      // Check NFT state before listing
      const state = await verifyNFTState(selectedNFT.id, amount);
      if (!state.hasEnough) {
        throw new Error(`Insufficient balance. You have ${state.balance} but trying to list ${amount}`);
      }
      if (!state.approved) {
        throw new Error('Please approve the marketplace to handle your NFTs first');
      }
  
      setListingStatus('Processing transaction...');
  
      // Call the listNFTForSale function
      const response = await listNFTForSale(
        NFT_ADDRESS,
        selectedNFT.id,
        amount,
        price,
        endDate
      );
  
      // Check if response is a transaction or transaction response
      const tx = response.wait ? response : await response;
      setListingTxHash(tx.hash);
      setListingStatus('Waiting for confirmation...');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Create activity record
      await api.createActivity({
        wallet_address: account.toLowerCase(),
        activity_type: 'LIST',
        token_id: selectedNFT.id,
        amount: amount,
        transaction_hash: tx.hash,
        price: price
      });
  
      setListingStatus('NFT listed successfully!');
  
      // Refresh all data
      const [updatedNFTs, updatedListedNFTs, updatedActivities] = await Promise.all([
        fetchUserNFTs(account),
        fetchListedNFTs(account),
        api.getUserActivities(account)
      ]);
  
      setUserNFTs(updatedNFTs);
      setListedNFTs(updatedListedNFTs);
      setActivities(updatedActivities);
  
      // Close modal after 2 seconds
      setTimeout(() => {
        handleCloseSellModal();
        setListingStatus(null);
        setListingTxHash(null);
      }, 2000);
  
    } catch (error) {
      console.error('Error listing NFT:', error);
      setListingError(error.message || 'Error listing NFT. Please try again.');
    } finally {
      setIsListing(false);
    }
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
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const compressedImage = await compressImage(file);
        if (!checkFileSize(compressedImage)) {
          alert('Image is too large. Please try a smaller image.');
          return;
        }
        setProfileImage(compressedImage);
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Error processing image. Please try again.');
      }
    }
  };

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.5);
          resolve(base64);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const checkFileSize = (base64String) => {
    const sizeInBytes = Math.ceil((base64String.length * 3) / 4);
    const sizeInMB = sizeInBytes / (1024 * 1024);
    console.log('File size:', sizeInMB.toFixed(2), 'MB');
    return sizeInMB < 10;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const compressedImage = await compressImage(file);
        if (!checkFileSize(compressedImage)) {
          alert('Image is too large. Please try a smaller image.');
          return;
        }
        setProfileImage(compressedImage);
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Error processing image. Please try again.');
      }
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        // Fetch all user's NFTs
        const userNFTsData = await fetchUserNFTs(account);
        setUserNFTs(userNFTsData);
  
        // Fetch listed NFTs
        const listedNFTsData = await fetchListedNFTs(account);
        setListedNFTs(listedNFTsData);
  
        // Fetch activities
        const userActivities = await api.getUserActivities(account);
        setActivities(userActivities);

      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchUserData();
  }, [account]);
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleClaimExpired = async (marketItemId) => {
    try {
      setClaimingStatus(prev => ({ ...prev, [marketItemId]: 'claiming' }));
      
      // Show loading toast
      toast.info('Claiming your NFT...', { autoClose: false, toastId: 'claiming' });
      
      await claimExpiredListing(marketItemId);
      
      // Refresh all data
      const [expired, updatedNFTs, updatedListedNFTs, updatedActivities] = await Promise.all([
        checkExpiredListings(account),
        fetchUserNFTs(account),
        fetchListedNFTs(account),
        api.getUserActivities(account)
      ]);
      
      setExpiredListings(expired);
      setUserNFTs(updatedNFTs);
      setListedNFTs(updatedListedNFTs);
      setActivities(updatedActivities);
      
      setClaimingStatus(prev => ({ ...prev, [marketItemId]: 'claimed' }));
      
      // Update success toast
      toast.dismiss('claiming');
      toast.success('NFT claimed successfully!');
      
      // Clear claimed status after animation
      setTimeout(() => {
        setClaimingStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[marketItemId];
          return newStatus;
        });
      }, 2000);
      
    } catch (error) {
      console.error('Error claiming:', error);
      setClaimingStatus(prev => ({ ...prev, [marketItemId]: 'error' }));
      toast.dismiss('claiming');
      toast.error('Failed to claim NFT. Please try again.');
    }
  };

  // const renderExpiredListings = () => {
  //   if (expiredListings.length === 0) return null;

  //   return (
  //     <div className="expired-listings-section">
  //       <h3 className="section-title">
  //         Expired Listings Available to Claim 
  //         <span className="expired-badge">{expiredListings.length}</span>
  //       </h3>
  //       <div className="expired-listings-grid">
  //         {expiredListings.map((item) => (
  //           <div key={item.marketItemId.toString()} className="expired-item">
  //             <div className="expired-item-image">
  //               {item.metadata?.image && (
  //                 <img 
  //                   src={item.metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} 
  //                   alt={item.metadata.name || `NFT ${item.tokenId}`}
  //                   onError={(e) => {
  //                     e.target.onerror = null;
  //                     e.target.src = '/placeholder-nft.png';
  //                   }}
  //                 />
  //               )}
  //             </div>
  //             <div className="expired-item-info">
  //               <h4>{item.metadata?.name || `NFT #${item.tokenId}`}</h4>
  //               <p className="token-id">Token ID: {item.tokenId.toString()}</p>
  //               <p className="amount">Amount: {item.remainingAmount.toString()}</p>
  //               <p className="expiry">Expired: {formatDate(item.endTime * 1000)}</p>
  //             </div>
  //             <button 
  //               className={`claim-button ${claimingStatus[item.marketItemId] || ''}`}
  //               onClick={() => handleClaimExpired(item.marketItemId)}
  //               disabled={claimingStatus[item.marketItemId] === 'claiming'}
  //             >
  //               {claimingStatus[item.marketItemId] === 'claiming' ? (
  //                 <>
  //                   <span className="spinner"></span>
  //                   Claiming...
  //                 </>
  //               ) : claimingStatus[item.marketItemId] === 'claimed' ? (
  //                 <>
  //                   <span className="check-icon">✓</span>
  //                   Claimed!
  //                 </>
  //               ) : (
  //                 'Claim Back'
  //               )}
  //             </button>
  //           </div>
  //         ))}
  //       </div>
  //     </div>
  //   );
  // };


  // const handleCheckExpired = async () => {
  //   await checkForExpiredNFTs();
  //   if (expiredListings.length > 0) {
  //       setShowSellModal(true); // Or create a new modal for expired NFTs
  //   }
  // };

  // Add this function to check for expired NFTs without cleaning them
  const checkForExpiredNFTs = async () => {
    if (!account) return;
    try {
      const expired = await checkExpiredListings(account, false); // Add a 'false' parameter to your checkExpiredListings function
      setHasExpiredNFTs(expired.length > 0);
      setExpiredListings(expired);
    } catch (error) {
      console.error('Error checking expired NFTs:', error);
    }
  };

  // Only check once when component mounts
  useEffect(() => {
    checkForExpiredNFTs();
  }, [account]);

  const ExpiredNFTsModal = () => {
    const [nftMetadata, setNftMetadata] = useState({});

    useEffect(() => {
      const fetchMetadata = async () => {
        const metadata = {};
        for (const item of expiredListings) {
          try {
            const nftContract = new ethers.Contract(
              NFT_ADDRESS,
              NFT_ABI,  // Use the full NFT_ABI instead of minimal interface
              signer
            );
            
            // Get token URI
            const tokenURI = await nftContract.uri(item.tokenId);
            console.log('TokenURI:', tokenURI); // Debug log
            
            // Convert IPFS URI to HTTP URL and fetch metadata
            const url = tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
            const response = await fetch(url);
            const data = await response.json();
            console.log('Metadata:', data); // Debug log
            
            metadata[item.tokenId.toString()] = {
              image: data.image?.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/'),
              name: data.name
            };
          } catch (error) {
            console.error('Error fetching metadata for token:', item.tokenId.toString(), error);
          }
        }
        setNftMetadata(metadata);
      };

      if (expiredListings.length > 0 && signer) {
        fetchMetadata();
      }
    }, [expiredListings, signer]);

    return (
      <div className="modal">
        <div className="modal-content">
          <button 
            onClick={() => setShowExpiredModal(false)}
            className="modal-close-x"
          >
            ×
          </button>
          
          <h2>Expired NFTs</h2>
          
          <div className="expired-listings-grid">
            {expiredListings.map((item) => {
              const metadata = nftMetadata[item.tokenId.toString()] || {};
              return (
                <div key={item.marketItemId.toString()} className="expired-item">
                  <img 
                    src={metadata.image || '/placeholder-nft.png'}
                    alt={metadata.name || `NFT #${item.tokenId.toString()}`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-nft.png';
                    }}
                  />
                  <div className="expired-item-info">
                    <h4>{metadata.name || `NFT #${item.tokenId.toString()}`}</h4>
                    {/* <p>Token ID: {item.tokenId.toString()}</p> */}
                    <p>Amount: {item.remainingAmount.toString()}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {expiredListings.length > 0 && (
            <button 
              className="claim-all-button"
              onClick={handleClaimAllExpired}
              disabled={isClaimingAll}
            >
              {isClaimingAll ? (
                <>
                  <span className="spinner"></span>
                  Claiming All...
                </>
              ) : 'Claim All NFTs'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const handleClaimAllExpired = async () => {
    try {
      setIsClaimingAll(true);
      toast.info('Claiming all expired NFTs...', { autoClose: false, toastId: 'claiming-all' });
      
      const marketItemIds = expiredListings.map(item => item.marketItemId);
      
      // Call contract method and wait for the receipt
      const receipt = await claimAllExpiredListings(marketItemIds);
      console.log('Claim receipt:', receipt); // Let's see what we get in the receipt
  
      // Get the transaction hash from the receipt (ethers v6 uses .hash)
      const transactionHash = receipt.hash || receipt.transactionHash;
      
      if (!transactionHash) {
        console.error('No transaction hash in receipt:', receipt);
        throw new Error('Failed to get transaction hash from receipt');
      }
  
      // Create activity records for each claimed NFT
      await Promise.all(expiredListings.map(item => 
        api.createActivity({
          wallet_address: account.toLowerCase(),
          activity_type: 'CLAIM_EXPIRED',
          token_id: item.tokenId.toString(),
          amount: item.remainingAmount.toString(),
          transaction_hash: transactionHash // Use the extracted hash
        })
      ));
      
      // Rest of your code...
      const [expired, updatedNFTs, updatedListedNFTs, updatedActivities] = await Promise.all([
        checkExpiredListings(account),
        fetchUserNFTs(account),
        fetchListedNFTs(account),
        api.getUserActivities(account)
      ]);
      
      setExpiredListings(expired);
      setUserNFTs(updatedNFTs);
      setListedNFTs(updatedListedNFTs);
      setActivities(updatedActivities);
      
      toast.dismiss('claiming-all');
      toast.success('All NFTs claimed successfully!');
      
      setTimeout(() => {
        setShowExpiredModal(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error claiming all:', error);
      toast.dismiss('claiming-all');
      toast.error('Failed to claim all NFTs. Please try again.');
    } finally {
      setIsClaimingAll(false);
    }
  };

  
  ///// I CAN'T HANDLE THE EXPIRED ITEMS WITHOUT AN INTERACTION (SO THE USER HAS TO PAY FOR THE TRANSACTION) AND IS NOT WORTH IT. SO I'LL KEEP THE CLAIM_EXPIRED AS AN EVENT.
  // useEffect(() => {
  //   const checkAndRecordExpiredListings = async () => {
  //     if (!account) return;
      
  //     const now = Math.floor(Date.now() / 1000);
  //     const processedNFTs = new Set();
      
  //     const newlyExpiredNFTs = listedNFTs.filter(nft => {
  //       const nftKey = `${nft.id}-${nft.listing.endTime}`;
  //       if (processedNFTs.has(nftKey)) {
  //         return false;
  //       }
  
  //       // Convert ISO string to Unix timestamp
  //       const endTime = Math.floor(new Date(nft.listing.endTime).getTime() / 1000);
        
  //       console.log('Checking NFT expiration:', {
  //         id: nft.id,
  //         endTime,
  //         endTimeDate: new Date(endTime * 1000).toISOString(),
  //         now,
  //         nowDate: new Date(now * 1000).toISOString(),
  //         originalEndTime: nft.listing.endTime
  //       });
  
  //       if (now > endTime && !nft.isMarkedExpired) {
  //         processedNFTs.add(nftKey);
  //         return true;
  //       }
  //       return false;
  //     });
  
  //     for (const nft of newlyExpiredNFTs) {
  //       try {
  //         // Convert ISO string to Unix timestamp properly
  //         const endTimeUnix = Math.floor(new Date(nft.listing.endTime).getTime() / 1000);
  //         const endTimeMs = endTimeUnix * 1000;
  //         const expirationDate = new Date(endTimeMs);
  
  //         console.log('Creating expired activity with dates:', {
  //           endTimeUnix,
  //           endTimeMs,
  //           expirationDate,
  //           isoString: expirationDate.toISOString(),
  //           originalEndTime: nft.listing.endTime
  //         });
  
  //         await api.createActivity({
  //           wallet_address: account.toLowerCase(),
  //           activity_type: 'EXPIRED',
  //           token_id: nft.id,
  //           amount: nft.listing.amount,
  //           price: nft.listing.price,
  //           transaction_hash: null,
  //           // Use the original ISO string directly since it's already in the correct format
  //           created_at: nft.listing.endTime
  //         });
  
  //         setListedNFTs(prev => prev.map(prevNft => 
  //           prevNft.id === nft.id 
  //             ? { ...prevNft, isMarkedExpired: true }
  //             : prevNft
  //         ));
  
  //         const updatedActivities = await api.getUserActivities(account);
  //         setActivities(updatedActivities);
  
  //       } catch (error) {
  //         console.error('Error recording expired NFT activity:', error, {
  //           nft,
  //           endTime: nft.listing.endTime
  //         });
  //       }
  //     }
  //   };
  
  //   console.log('Current listedNFTs:', listedNFTs.map(nft => ({
  //     id: nft.id,
  //     endTime: nft.listing.endTime,
  //     date: new Date(nft.listing.endTime).toISOString()
  //   })));
  
  //   const interval = setInterval(checkAndRecordExpiredListings, 60 * 1000);
  //   checkAndRecordExpiredListings();
  
  //   return () => clearInterval(interval);
  // }, [account, listedNFTs]);

  return (
    <div className="profile-page-wrapper">
      <div className="profile-page">
        {!account && (
          <div className="no-wallet-message">
            Please connect your wallet to access this feature
          </div>
        )}
        
        {showProfileSection && account && (
          <div className="profile-header">
            {isEditing ? (
              <div 
                className={`profile-image-upload ${isDragging ? 'dragging' : ''}`}
                onClick={() => fileInputRef.current.click()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <img
                  src={profileImage || "https://via.placeholder.com/100"}
                  alt="Profile"
                  className="profile-picture"
                />
                <span className="upload-text">
                  {isDragging ? 'Drop image here' : 'Click or drag to upload'}
                </span>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  onChange={handleImageChange} 
                  accept="image/*"
                  hidden 
                />
              </div>
            ) : (
              <img
                src={profileImage || "https://via.placeholder.com/100"}
                alt="Profile"
                className="profile-picture"
                style={{ cursor: 'default' }}
              />
            )}
            {isEditing ? (
              <div className="edit-field">
                <label htmlFor="username">Name:</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={profileInfo.username}
                  onChange={handleInputChange}
                  className="edit-input"
                />
              </div>
            ) : (
              <h1>{profileInfo.username}</h1>
            )}
            {!isEditing && <p className="wallet-address">{account}</p>}
            {isEditing ? (
              <div className="edit-field">
                <label htmlFor="bio">Bio:</label>
                <textarea
                  ref={bioTextareaRef}
                  id="bio"
                  name="bio"
                  value={profileInfo.bio}
                  onChange={handleInputChange}
                  className="edit-input auto-resize"
                />
              </div>
            ) : (
              <p className="bio">{profileInfo.bio}</p>
            )}
            <div className="social-links">
              {!isEditing ? (
                <>
                  {profileInfo.twitter ? (
                    <a href={`https://x.com/${profileInfo.twitter.replace('@', '')}`} 
                       target="_blank"
                       rel="noopener noreferrer" 
                       className="active-link" 
                       aria-label="Twitter">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  ) : (
                    <span className="inactive-link" aria-label="Twitter not set">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </span>
                  )}
                  {profileInfo.instagram ? (
                    <a href={`https://instagram.com/${profileInfo.instagram.replace('@', '')}`} 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       className="active-link" 
                       aria-label="Instagram">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                  ) : (
                    <span className="inactive-link" aria-label="Instagram not set">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </span>
                  )}
                </>
              ) : (
                <div className="social-links-edit">
                  <div className="edit-field">
                    <label>Twitter:</label>
                    <input
                      type="text"
                      name="twitter"
                      value={profileInfo.twitter}
                      onChange={handleInputChange}
                      className="edit-input"
                      placeholder="@username"
                    />
                  </div>
                  <div className="edit-field">
                    <label>Instagram:</label>
                    <input
                      type="text"
                      name="instagram"
                      value={profileInfo.instagram}
                      onChange={handleInputChange}
                      className="edit-input"
                      placeholder="@username"
                    />
                  </div>
                </div>
              )}
            </div>
            {isEditing ? (
              <button onClick={handleSaveProfile} className="edit-profile-btn">Save Profile</button>
            ) : (
              <button onClick={handleEditProfile} className="edit-profile-btn">Edit Profile</button>
            )}
          </div>
        )}

        {account && (
          <div className="profile-content">
            <div className="tabs">
              <button 
                className={activeTab === 'owned' ? 'active' : ''}
                onClick={() => setActiveTab('owned')}
              >
                NFT Owned
              </button>
              <button 
                className={activeTab === 'listed' ? 'active' : ''}
                onClick={() => setActiveTab('listed')}
              >
                NFT Listed
              </button>
              {/* <button onClick={() => handleExpiredListings(account)}>Clean Expired Listings</button> */}

              {hasExpiredNFTs && (
                <button 
                  className="claim-expired-button"
                  onClick={() => setShowExpiredModal(true)}
                >
                  Claim Expired NFTs ({expiredListings.length})
                </button>
              )}

              <button 
                className={activeTab === 'activity' ? 'active' : ''}
                onClick={() => setActiveTab('activity')}
              >
                Activity
              </button>
            </div>

            {isLoading ? (
              <div className="loading">Loading...</div>
            ) : (
              <>
                {activeTab === 'owned' && (
                  <div className="nft-grid">
                    {userNFTs.length > 0 ? (
                      userNFTs.map((nft) => (
                        <div key={nft.id} className="nft-item" onClick={() => handleNFTClick(nft)}>
                          <img 
                            src={nft.image} 
                            alt={nft.name} 
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/400?text=NFT+Image+Not+Found';
                            }}
                          />
                          <div className="nft-info">
                            <h3>{nft.name}</h3>
                            <p className="nft-amount">
                              Available: {nft.available} of {nft.mintInfo.originalAmount}
                            </p>
                            {nft.listing && (
                              <p>Listed: {nft.listing.amount} for {nft.listing.price} POL</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-items">No NFTs found</div>
                    )}
                  </div>
                )}

                {activeTab === 'listed' && (
                  <div className="nft-grid">
                    {listedNFTs.length > 0 ? (
                      listedNFTs.map((nft) => (
                        <div key={nft.id} className="nft-item" onClick={() => handleListedNFTClick(nft)}>
                          <img 
                            src={nft.image} 
                            alt={nft.name} 
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/400?text=NFT+Image+Not+Found';
                            }}
                          />
                          <div className="nft-info">
                            <h3>{nft.name}</h3>
                            <div className="listing-details">
                              <p>Price: {nft.listing.price} POL</p>
                              <p>Amount Listed: {nft.listing.amount}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-items">No NFTs currently listed</div>
                    )}
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="activity-table">
                    {activities.length > 0 ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Action</th>
                            <th>NFT</th>
                            <th>Amount</th>
                            <th>Price/Item</th>
                            <th>Transaction</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activities.map((activity) => {
                            const relatedNFT = userNFTs.find(nft => nft.id === activity.token_id);
                            const nftName = relatedNFT ? relatedNFT.name : `NFT #${activity.token_id}`;
                  
                            return (
                              <tr key={`${activity.transaction_hash || 'no-tx'}-${activity.token_id}-${activity.activity_type}`}>
                                <td>
                                  <span className={`activity-type ${activity.activity_type.toLowerCase()}`}>
                                    {activity.activity_type}
                                  </span>
                                </td>
                                <td>
                                  <div className="nft-info-cell">
                                    <span className="nft-name">{nftName}</span>
                                    <span className="token-id">ID: {activity.token_id}</span>
                                  </div>
                                </td>
                                <td>{activity.amount}</td>
                                <td className="price-cell">
                                  {activity.price && `${activity.price} POL`}
                                </td>
                                <td>
                                  {activity.transaction_hash ? (
                                    <a 
                                      href={`https://amoy.polygonscan.com/tx/${activity.transaction_hash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="tx-link"
                                    >
                                      {activity.transaction_hash.slice(0, 6)}...{activity.transaction_hash.slice(-4)}
                                    </a>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td>{formatDate(activity.created_at)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="no-items">No activities found</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Sell Modal */}
        {showSellModal && selectedNFT && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>List {selectedNFT.name} for Sale</h2>
              
              <img 
                src={selectedNFT.image || "https://via.placeholder.com/150"} 
                alt={selectedNFT.name} 
                className="modal-nft-image" 
              />

              <p className="nft-description">{selectedNFT.description}</p>
              <p className="nft-quantity">
                Available quantity: {selectedNFT.available} of {selectedNFT.mintInfo.originalAmount}
              </p>

              {needsApproval && (
                <div className="approval-section">
                  <div className="approval-message">
                    <p>
                      Please approve the marketplace to handle your NFTs before listing.
                    </p>
                  </div>
                  
                  <button 
                    className="approve-button" 
                    onClick={handleApproval}
                    disabled={isListing}
                  >
                    {isListing ? 'Processing...' : 'Approve Marketplace'}
                  </button>
                </div>
              )}

              <div className="sale-options">
                <div className="sale-type">
                  <button
                    className={saleType === 'fixed' ? 'active' : ''}
                    onClick={() => setSaleType('fixed')}
                  >
                    Fixed Price
                  </button>
                  <button 
                    className="timed-auction-btn"
                    onClick={(e) => e.preventDefault()}
                  >
                    Timed Auction
                  </button>
                </div>

                <div className="price-input">
                  <label htmlFor="price">
                    {saleType === 'fixed' ? 'Price per item' : 'Starting price per item'}
                  </label>
                  <div className="price-input-container">
                    <select
                      value={currency}
                      onChange={handleCurrencyChange}
                      className="currency-select"
                    >
                      <option value="POL">POL</option>
                    </select>
                    <button className="price-adjust" onClick={decrementPrice}>-</button>
                    <input
                      type="number"
                      id="price"
                      value={price}
                      onChange={handlePriceChange}
                      placeholder="0.0000"
                      step="0.001"
                      min="0"
                    />
                    <button className="price-adjust" onClick={incrementPrice}>+</button>
                  </div>
                </div>

                <div className="amount-input">
                  <label htmlFor="amount">Amount to sell</label>
                  <div className="amount-input-container">
                    <button 
                      className="amount-adjust" 
                      onClick={decrementAmount}
                      disabled={amount <= 1}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      id="amount"
                      value={amount}
                      onChange={handleAmountChange}
                      min="1"
                      max={selectedNFT.available}
                    />
                    <button 
                      className="amount-adjust" 
                      onClick={incrementAmount}
                      disabled={amount >= selectedNFT.available}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="duration-input">
                  <div className="duration-select">
                    <label htmlFor="duration">Duration</label>
                    <select
                      id="duration"
                      value={duration}
                      onChange={handleDurationChange}
                    >
                      <option value="1 day">1 day</option>
                      <option value="1 week">1 week</option>
                      <option value="1 month">1 month</option>
                      {saleType === 'fixed' && (
                        <>
                          <option value="3 months">3 months</option>
                          <option value="12 months">12 months</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="end-date-input">
                    <label htmlFor="endDate">End Date</label>
                    <input
                      type="datetime-local"
                      id="endDate"
                      value={endDate}
                      onChange={handleEndDateChange}
                    />
                  </div>
                </div>

                <button 
                  className="list-button" 
                  onClick={handleListNFT} 
                  disabled={!stateCheckPassed || isListing}
                >
                  {isListing ? (
                    <>
                      <span className="loading-spinner"></span>
                      {/* Processing... */}
                    </>
                  ) : (
                    'List for Sale'
                  )}
                </button>
                
                {listingError && (
                  <div className="error-message">
                    <p>{listingError}</p>
                    <p className="error-hint">
                      {listingError.includes('gas') ? 
                        'Try increasing gas limit or waiting for network congestion to decrease.' : 
                      listingError.includes('rejected') ? 
                        'Transaction was rejected. Please try again.' : 
                        'Please try again or contact support if the issue persists.'}
                    </p>
                  </div>
                )}

                {listingStatus && (
                  <div className="transaction-info">
                    <p>{listingStatus}</p>
                    {listingTxHash && (
                      <a 
                        href={`https://amoy.polygonscan.com/tx/${listingTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transaction-link"
                      >
                        View on Explorer
                      </a>
                    )}
                  </div>
                )}
              </div>
              <button className="close-modal" onClick={handleCloseSellModal}></button>
            </div>
          </div>
        )}
        {showListedModal && selectedListedNFT && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>{selectedListedNFT.name}</h2>
              <img 
                src={selectedListedNFT.image} 
                alt={selectedListedNFT.name}
                className="modal-nft-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/400?text=NFT+Image+Not+Found';
                }}
              />
              
              <div className="listing-details">
                <h3>Listing Details</h3>
                <div className="detail-row">
                  <span>Price:</span>
                  <span>{selectedListedNFT.listing.price} POL</span>
                </div>
                <div className="detail-row">
                  <span>Amount Listed:</span>
                  <span>{selectedListedNFT.listing.amount}</span>
                </div>
                <div className="detail-row">
                  <span>End Date:</span>
                  <span>{new Date(selectedListedNFT.listing.endTime).toLocaleString()}</span>
                </div>
              </div>

              {removeError && (
                <div className="error-message">
                  <p>{removeError}</p>
                  <p className="error-hint">
                    {removeError.includes('gas') ? 'Try increasing gas limit or waiting for network congestion to decrease.' : 
                    removeError.includes('rejected') ? 'Transaction was rejected. Please try again.' : 
                    'Please try again or contact support if the issue persists.'}
                  </p>
                </div>
              )}

              {removeStatus && (
                <div className="transaction-info">
                  <p>{removeStatus}</p>
                  {removeTxHash && (
                    <a 
                      href={`https://amoy.polygonscan.com/tx/${removeTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transaction-link"
                    >
                      View on Explorer
                    </a>
                  )}
                </div>
              )}

              <div className="cancel-amount-section">
                <label htmlFor="cancel-amount">Amount to Remove:</label>
                <div className="amount-input-container">
                  <button 
                    className="amount-adjust" 
                    onClick={() => setAmount(prev => Math.max(1, prev - 1))}
                    disabled={amount <= 1 || isRemoving}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    id="cancel-amount"
                    value={amount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 1 && val <= parseInt(selectedListedNFT.listing.amount)) {
                        setAmount(val);
                      }
                    }}
                    min="1"
                    max={selectedListedNFT.listing.amount}
                    disabled={isRemoving}
                  />
                  <button 
                    className="amount-adjust" 
                    onClick={() => setAmount(prev => Math.min(parseInt(selectedListedNFT.listing.amount), prev + 1))}
                    disabled={amount >= parseInt(selectedListedNFT.listing.amount) || isRemoving}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="remove-listing-button"
                  onClick={() => handleRemoveListing(selectedListedNFT, amount)}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <>
                      <span className="loading-spinner"></span>
                      Processing...
                    </>
                  ) : (
                    `Remove ${amount} from Marketplace`
                  )}
                </button>
                <button 
                  className="close-modal-button"
                  onClick={handleCloseListedModal}
                  disabled={isRemoving}
                >
                  Close
                </button>
              </div>

              <button 
                className="close-modal" 
                onClick={handleCloseListedModal}
                disabled={isRemoving}
              />
            </div>
          </div>
        )}
        {showExpiredModal && (
          <ExpiredNFTsModal />
        )}
      </div>
    </div>
  );
}

export default ProfilePage;