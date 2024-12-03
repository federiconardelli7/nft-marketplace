import React, { useState, useEffect, useMemo } from 'react';
import { fetchMarketItems, buyNFT } from '../utils/contractInteraction';
import './MarketplacePage.css';

function MarketplacePage({ account }) {
  const [marketItems, setMarketItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState(1);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Filter states
  const [sortOption, setSortOption] = useState('default');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [hideMyListings, setHideMyListings] = useState(true); 

  // Add these states to your existing states:
  const [isBuying, setIsBuying] = useState(false);
  const [buyingError, setBuyingError] = useState(null);
  const [transactionHash, setTransactionHash] = useState(null);

  useEffect(() => {
    loadMarketItems();
  }, []);

  
  async function loadMarketItems() {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching market items...');
      const items = await fetchMarketItems();
      console.log('Market items:', items);
      setMarketItems(items);
    } catch (err) {
      console.error("Error fetching market items:", err);
      // setError("Failed to load marketplace items. Please try again later.");
      setError("Marketplace is out of items. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  const handleBuy = (item) => {
    setSelectedItem(item);
    setPurchaseAmount(1);
    setShowPurchaseModal(true);
  };

  const handlePurchaseConfirm = async () => {
    if (!selectedItem) return;
    
    try {
      setIsBuying(true);
      setBuyingError(null);
      setTransactionHash(null);
  
      // Get the transaction receipt from buyNFT
      const receipt = await buyNFT(selectedItem.marketItemId, selectedItem.price, purchaseAmount);
      console.log('Purchase transaction receipt:', receipt);
  
      // Set the transaction hash
      if (receipt.hash) {
        setTransactionHash(receipt.hash);
      }
  
      // Show success message and refresh data after short delay
      setTimeout(async () => {
        try {
          // Refresh the marketplace items
          await loadMarketItems();
          
          // Show success message
          alert('Purchase successful!');
          
          // Close modal and reset states
          handleCloseModal();
        } catch (error) {
          console.error("Error refreshing data:", error);
        }
      }, 2000); // Wait 2 seconds before closing
  
    } catch (error) {
      console.error("Error buying NFT:", error);
      setBuyingError(error.message || 'Failed to complete purchase. Please try again.');
    } finally {
      setIsBuying(false);
    }
  };
  
  // Add this function to handle modal closing and state reset
  const handleCloseModal = () => {
    setShowPurchaseModal(false);
    setSelectedItem(null);
    setPurchaseAmount(1);
    setBuyingError(null);
    setTransactionHash(null);
  };

  const calculateTotal = () => {
    if (!selectedItem) return '0';
    return (parseFloat(selectedItem.price) * purchaseAmount).toFixed(4);
  };

  const formatTimeLeft = (endTime) => {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = endTime - now;
    
    if (timeLeft <= 0) return "Expired";
    
    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const formatEndDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString('default', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredItems = useMemo(() => {
    return marketItems
      .filter(item => {
        // Hide user's listings when checkbox is checked
        if (hideMyListings && account && item.seller.toLowerCase() === account.toLowerCase()) {
          return false; // Filter out the item if it's the user's listing
        }
        
        // Apply search filter
        if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        
        // Apply price filter
        if (priceRange.min || priceRange.max) {
          const price = parseFloat(item.price);
          const min = priceRange.min ? parseFloat(priceRange.min) : 0;
          const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
          if (price < min || price > max) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'price-low-to-high':
            return parseFloat(a.price) - parseFloat(b.price);
          case 'price-high-to-low':
            return parseFloat(b.price) - parseFloat(a.price);
          case 'recent':
            return new Date(b.endTime) - new Date(a.endTime);
          default:
            return 0;
        }
      });
  }, [marketItems, account, hideMyListings, searchTerm, priceRange, sortOption]);

  if (loading) {
    return <div className="loading">Loading marketplace items...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="marketplace-page">
      <div className="marketplace-layout">
        {/* Sidebar */}
        <div className="filter-sidebar">
          <div className="filter-section">
            <h3>Status</h3>
            <label className="listing-filter">
              <input
                type="checkbox"
                checked={hideMyListings}
                onChange={(e) => setHideMyListings(e.target.checked)}
              />
              Hide my listings
            </label>
          </div>

          <div className="filter-section">
            <h3>Search</h3>
            <input
              type="text"
              placeholder="Search NFTs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-section">
            <h3>Sort By</h3>
            <select 
              value={sortOption} 
              onChange={(e) => setSortOption(e.target.value)}
              className="sort-select"
            >
              <option value="default">Default</option>
              <option value="price-low-to-high">Price: Low to High</option>
              <option value="price-high-to-low">Price: High to Low</option>
              <option value="recent">Recently Listed</option>
            </select>
          </div>

          <div className="filter-section">
            <h3>Price Range (POL)</h3>
            <div className="price-range">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="marketplace-content">
          <div className="nft-grid">
            {filteredItems.map((item) => {
              const isUserListing = account && item.seller.toLowerCase() === account.toLowerCase();
              const isClickable = !isUserListing; // Ensure user listings are not clickable

              return (
                <div 
                  key={item.marketItemId} 
                  className={`nft-item ${isUserListing ? 'disabled' : ''}`} // Add 'disabled' class if it's the user's listing
                  onClick={isClickable ? () => handleBuy(item) : undefined} // Make non-clickable if it's the user's listing
                >
                  <div className="time-left">{formatTimeLeft(item.endTime)}</div>
                  <img 
                    src={item.image} 
                    alt={item.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/150?text=No+Image";
                    }}
                  />
                  <div className="nft-info">
                    <h3>{item.name}</h3>
                    <p className="nft-price">{item.price} POL</p>
                    <p className="nft-amount">Available: {item.remainingAmount} of {item.amount}</p>
                    <p className="nft-seller">
                      Seller: {item.seller.substring(0, 6)}...{item.seller.substring(item.seller.length - 4)}
                    </p>
                    <p className="end-date">Ends: {formatEndDate(item.endTime)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Purchase NFT</h2>
            <img src={selectedItem.image} alt={selectedItem.name} />
            <h3>{selectedItem.name}</h3>
            
            {buyingError && (
              <div className="error-message">
                {buyingError}
              </div>
            )}
            
            {transactionHash && (
              <div className="transaction-info">
                <p>Transaction submitted!</p>
                <a 
                  href={`https://amoy.polygonscan.com/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transaction-link"
                >
                  View on Explorer
                </a>
              </div>
            )}

            <div className="purchase-controls">
              <label>Amount:</label>
              <div className="amount-controls">
                <button 
                  onClick={() => setPurchaseAmount(prev => Math.max(1, prev - 1))}
                  disabled={purchaseAmount <= 1 || isBuying}
                >-</button>
                <input
                  type="number"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(Math.min(
                    parseInt(selectedItem.amount),
                    Math.max(1, parseInt(e.target.value) || 1)
                  ))}
                  min="1"
                  max={selectedItem.remainingAmount}
                  disabled={isBuying}
                />
                <button 
                  onClick={() => setPurchaseAmount(prev => Math.min(parseInt(selectedItem.remainingAmount), prev + 1))}
                  disabled={purchaseAmount >= parseInt(selectedItem.remainingAmount) || isBuying}
                >+</button>
              </div>
            </div>

            <div className="purchase-summary">
              <p>Price per item: {selectedItem.price} POL</p>
              <p>Total: {calculateTotal()} POL</p>
            </div>

            <div className="modal-actions">
              <button 
                onClick={handlePurchaseConfirm}
                disabled={isBuying}
                className="confirm-button"
              >
                {isBuying ? 'Processing...' : 'Confirm Purchase'}
              </button>
              <button 
                onClick={() => setShowPurchaseModal(false)}
                disabled={isBuying}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketplacePage;