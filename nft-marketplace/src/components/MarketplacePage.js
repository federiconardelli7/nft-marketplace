import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { fetchMarketItems, buyNFT } from '../utils/contractInteraction';
import './MarketplacePage.css';

function MarketplacePage() {
  const [marketItems, setMarketItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMarketItems();
  }, []);

  async function loadMarketItems() {
    try {
      setLoading(true);
      setError(null);
      const items = await fetchMarketItems();
      setMarketItems(items);
    } catch (err) {
      console.error("Error fetching market items:", err);
      setError("Failed to load marketplace items. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBuyNFT(tokenId, price) {
    try {
      await buyNFT(tokenId, price);
      // Refresh the market items after successful purchase
      loadMarketItems();
    } catch (err) {
      console.error("Error buying NFT:", err);
      setError("Failed to buy NFT. Please try again.");
    }
  }

  if (loading) return <div className="loading">Loading marketplace items...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="marketplace-page">
      <h1>NFT Marketplace</h1>
      {marketItems.length === 0 ? (
        <p>No items currently available in the marketplace.</p>
      ) : (
        <div className="nft-grid">
          {marketItems.map((item) => (
            <div key={item.tokenId} className="nft-item">
              <img src={`https://via.placeholder.com/150?text=NFT+${item.tokenId}`} alt={`NFT ${item.tokenId}`} />
              <h3>NFT #{item.tokenId}</h3>
              <p>Price: {ethers.formatEther(item.price)} ETH</p>
              <p>Creator: {item.creator.substring(0, 6)}...{item.creator.substring(item.creator.length - 4)}</p>
              <p>Available: {item.remainingSupply}/{item.supply}</p>
              <button onClick={() => handleBuyNFT(item.tokenId, item.price)}>Buy Now</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MarketplacePage;