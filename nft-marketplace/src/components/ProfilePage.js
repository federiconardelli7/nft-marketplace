import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { fetchUserNFTs, listNFTForSale, listNFTForAuction} from '../utils/contractInteraction';
import { Link } from 'react-router-dom';
import './ProfilePage.css';

function ProfilePage({ account }) {
  const [userNFTs, setUserNFTs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('nfts');
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
  const bioTextareaRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  // New state variables for NFT selling
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [saleType, setSaleType] = useState('fixed');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('MATIC');
  const [duration, setDuration] = useState('1 day');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState(1);

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
    setPrice(currency === 'MATIC' ? '0.001' : '1');
  }, [currency]);

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

  // NFT Selling Modal Functions
  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
    setShowSellModal(true);
    setPrice('0.001');
    setDuration('1 day');
    updateEndDate('1 day');
    setAmount(1);
  };

  const handleCloseSellModal = () => {
    setShowSellModal(false);
    setSelectedNFT(null);
    setPrice('');
    setAmount(1);
  };

  const handleAmountChange = (e) => {
    const newAmount = parseInt(e.target.value, 10);
    if (!isNaN(newAmount) && newAmount >= 1 && newAmount <= selectedNFT.amount) {
      setAmount(newAmount);
    }
  };

  const incrementAmount = () => {
    if (amount < selectedNFT.amount) {
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
      const increment = currency === 'MATIC' ? 0.001 : 1;
      const newPrice = parseFloat(prev || 0) + increment;
      return currency === 'MATIC' ? newPrice.toFixed(4) : newPrice.toString();
    });
  };

  const decrementPrice = () => {
    setPrice(prev => {
      const decrement = currency === 'MATIC' ? 0.001 : 1;
      const newPrice = Math.max(0, parseFloat(prev || 0) - decrement);
      return currency === 'MATIC' ? newPrice.toFixed(4) : newPrice.toString();
    });
  };

  const handleCurrencyChange = (e) => {
    setCurrency(e.target.value);
  };

  const handleListNFT = async () => {
    if (!selectedNFT || !price || amount <= 0 || !endDate) return;

    try {
      if (saleType === 'fixed') {
        await listNFTForSale(selectedNFT.id, price, amount, endDate, currency);
      } else {
        await listNFTForAuction(selectedNFT.id, price, endDate, amount, currency);
      }
      alert('NFT listed successfully');
      handleCloseSellModal();
    } catch (error) {
      console.error('Error listing NFT:', error);
      alert('Error listing NFT. Please try again.');
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
      if (!account) return;
      
      setIsLoading(true);
      try {
        const userNFTsData = await fetchUserNFTs(account);
        setUserNFTs(userNFTsData);

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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="profile-page-wrapper">
      <div className="profile-page">
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
                onClick={() => !isEditing && setIsEditing(true)}
                style={{ cursor: isEditing ? 'pointer' : 'default' }}
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
              onClick={() => !isEditing && setIsEditing(true)}
              style={{ cursor: isEditing ? 'pointer' : 'default' }}
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

        <div className="profile-content">
          <div className="tabs">
            <button 
              className={activeTab === 'nfts' ? 'active' : ''}
              onClick={() => setActiveTab('nfts')}
            >
              NFTs
            </button>
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
              {activeTab === 'nfts' && (
                <div className="nft-grid">
                  {userNFTs.length > 0 ? (
                    userNFTs.map((nft) => (
                      <div key={nft.tokenId} className="nft-item" onClick={() => handleNFTClick(nft)}>
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
                          <p className="nft-amount">Available: {nft.amount}/{nft.supply}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-items">No NFTs found</div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="activity-table">
                  {activities.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Token ID</th>
                          <th>Amount</th>
                          <th>Transaction</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activities.map((activity, index) => (
                          <tr key={index}>
                            <td>
                              <span className={`activity-type ${activity.activity_type.toLowerCase()}`}>
                                {activity.activity_type}
                              </span>
                            </td>
                            <td>{activity.token_id}</td>
                            <td>{activity.amount}</td>
                            <td>
                              <a 
                                href={`https://amoy.polygonscan.com/tx/${activity.transaction_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tx-link"
                              >
                                {activity.transaction_hash.slice(0, 6)}...{activity.transaction_hash.slice(-4)}
                              </a>
                            </td>
                            <td>{formatDate(activity.created_at)}</td>
                          </tr>
                        ))}
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

        {/* Sell Modal */}
        {showSellModal && selectedNFT && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>List {selectedNFT.name} for Sale</h2>
              <img src={selectedNFT.image || "https://via.placeholder.com/150"} alt={selectedNFT.name} />
              <p className="nft-description">{selectedNFT.description}</p>
              <p className="nft-quantity">Available quantity: {selectedNFT.amount}</p>
              <div className="sale-options">
                <div className="sale-type">
                  <button
                    className={saleType === 'fixed' ? 'active' : ''}
                    onClick={() => setSaleType('fixed')}
                  >
                    Fixed Price
                  </button>
                  <button
                    className={saleType === 'auction' ? 'active' : ''}
                    onClick={() => setSaleType('auction')}
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
                      <option value="MATIC">MATIC</option>
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
                      max={selectedNFT.amount}
                    />
                    <button 
                      className="amount-adjust" 
                      onClick={incrementAmount}
                      disabled={amount >= selectedNFT.amount}
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

                <button className="list-button" onClick={handleListNFT}>
                  List for Sale
                </button>
              </div>
              <button className="close-modal" onClick={handleCloseSellModal}></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;