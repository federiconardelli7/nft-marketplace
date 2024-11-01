import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchUserNFTs, listNFTForSale, listNFTForAuction } from '../utils/contractInteraction';
import { NFT_ADDRESS } from '../config/contracts';
import './SellNFTPage.css';

function SellNFTPage({ account }) {
  const [userNFTs, setUserNFTs] = useState([]);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [saleType, setSaleType] = useState('fixed');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('MATIC');
  const [duration, setDuration] = useState('1 day');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUserNFTs = async () => {
      if (!account) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('Fetching NFTs for account:', account);
        const nfts = await fetchUserNFTs(account);
        console.log('Fetched NFTs:', nfts);
        if (nfts.length > 0) {
          const nftForLog = {
            ...nfts[0],
            balance: nfts[0].balance.toString(),
            royaltyInfo: nfts[0].royaltyInfo ? {
              ...nfts[0].royaltyInfo,
              percentage: nfts[0].royaltyInfo.percentage.toString()
            } : null
          };
          console.log('First NFT structure:', JSON.stringify(nftForLog, null, 2));
        }
        setUserNFTs(nfts);
      } catch (error) {
        console.error('Error fetching NFTs:', error);
        setError('Failed to load your NFTs. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserNFTs();
  }, [account]);

  useEffect(() => {
    updateEndDate(duration);
  }, [duration]);

  useEffect(() => {
    setPrice(currency === 'MATIC' ? '0.001' : '1');
  }, [currency]);

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

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
    setPrice(currency === 'MATIC' ? '0.001' : '1');
    setDuration('1 day');
    updateEndDate('1 day');
    setAmount(1);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedNFT(null);
  };

  const handleAmountChange = (e) => {
    const newAmount = parseInt(e.target.value, 10);
    if (!isNaN(newAmount) && newAmount >= 1 && newAmount <= parseInt(selectedNFT.available)) {
      setAmount(newAmount);
    }
  };

  const incrementAmount = () => {
    if (amount < parseInt(selectedNFT.available)) {
      setAmount(prevAmount => prevAmount + 1);
    }
  };

  const decrementAmount = () => {
    if (amount > 1) {
      setAmount(prevAmount => prevAmount - 1);
    }
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
    if (!selectedNFT || !price || amount <= 0 || !endDate) {
      console.log('Validation failed:', { selectedNFT, price, amount, endDate });
      return;
    }

    try {
      if (saleType === 'fixed') {
        console.log('Selected NFT:', selectedNFT);
        
        console.log('Listing NFT with params:', {
          nftContractAddress: NFT_ADDRESS,
          tokenId: selectedNFT.id,
          amount,
          price,
          endDate
        });

        await listNFTForSale(
          NFT_ADDRESS,
          selectedNFT.id,
          amount,
          price,
          endDate
        );
        alert('NFT listed successfully');
        handleCloseModal();
      } else {
        await listNFTForAuction(selectedNFT.id, price, endDate, amount, currency);
      }
    } catch (error) {
      console.error('Error listing NFT:', error);
      alert('Error listing NFT. Please try again.');
    }
  };

  if (!account) {
    return (
      <div className="sell-nft-page">
        <div className="sell-nft-content">
          <h1>Sell Your NFTs</h1>
          <div className="wallet-connect-message">
            <p>Please connect your wallet to sell NFTs</p>
          </div>
        </div>
      </div>
    );
  }

  const renderNFTCard = (nft) => (
    <div key={nft.id} className="nft-card" onClick={() => handleNFTClick(nft)}>
      <img 
        src={nft.image} 
        alt={nft.name} 
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = "https://via.placeholder.com/150?text=No+Image";
        }}
      />
      <div className="nft-info">
        <h3>{nft.name}</h3>
        <p className="nft-quantity">Available: {nft.available}/{nft.mintInfo.originalAmount}</p>
      </div>
    </div>
  );

  return (
    <div className="sell-nft-page">
      <h1 className="page-title">Sell Your NFTs</h1>
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      {isLoading ? (
        <div className="loading-spinner">Loading your NFTs...</div>
      ) : userNFTs.length === 0 ? (
        <div className="no-nfts-message">
          <p>You don't have any NFTs yet.</p>
          <Link to="/mint" className="mint-link">Mint your first NFT</Link>
        </div>
      ) : (
        <div className="nft-row-container">
          {userNFTs.map(nft => renderNFTCard(nft))}
        </div>
      )}

      {showModal && selectedNFT && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>List {selectedNFT.name} for Sale</h2>
            <img src={selectedNFT.image || "https://via.placeholder.com/150"} alt={selectedNFT.name} />
            <p className="nft-description">{selectedNFT.description}</p>
            <p className="nft-quantity">Available quantity: {selectedNFT.available}/{selectedNFT.mintInfo.originalAmount}</p>
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
                    placeholder={currency === 'MATIC' ? '0.0000' : '0'}
                    step={currency === 'MATIC' ? '0.001' : '1'}
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
              <button className="list-button" onClick={handleListNFT}>
                List for Sale
              </button>
            </div>
            <button className="close-modal" onClick={handleCloseModal}></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SellNFTPage;