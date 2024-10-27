import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { connectWallet } from './utils/contractInteraction';
import MintNFTPage from './components/MintNFTPage';
import MarketplacePage from './components/MarketplacePage';
import ProfilePage from './components/ProfilePage';
import SellNFTPage from './components/SellNFTPage';
import nftMarketplaceImage from './img/nft-marketplace-image.jpg';
import { api } from './services/api'; 

import './App.css';


function AppContent() {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode) {
      setDarkMode(JSON.parse(savedMode));
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleConnect = async () => {
    try {
      const signer = await connectWallet();
      if (signer) {
        const address = await signer.getAddress();
        setAccount(address);
        setError(null);
  
        try {
          const normalizedAddress = address.toLowerCase();
          console.log('Checking if user exists:', normalizedAddress);
          
          const user = await api.getUser(normalizedAddress);
          console.log('User data:', user);
          
        } catch (error) {
          console.error('Error handling user in database:', error);
          // Don't throw the error, just log it
        }
      } else {
        setError("Failed to connect wallet. Please try again.");
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError("Failed to connect wallet. Please make sure you're signed in to MetaMask.");
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleDisconnect = () => {
    setAccount(null);
    setShowDropdown(false);
  };

  const handleViewProfile = () => {
    navigate('/profile');
    setShowDropdown(false);
  };

  return (
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      <header className="app-header">
        <Link to="/" className="app-title-link">
          <h1 className="app-title">NFT Marketplace</h1>
        </Link>
        <div className="header-controls">
          <button onClick={toggleDarkMode} className="mode-toggle">
            {darkMode ? '☀️' : '🌙'}
          </button>
          {account ? (
            <div className="account-dropdown">
              <div className="account-info" onClick={toggleDropdown}>
                Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}
              </div>
              {showDropdown && (
                <div className="dropdown-menu">
                  <button onClick={handleViewProfile}>View Profile</button>
                  <button onClick={handleDisconnect}>Disconnect</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={handleConnect} className="connect-button">Connect Wallet</button>
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={
          <main className="app-main">
            <div className="hero-section">
              <img src={nftMarketplaceImage} alt="NFT Marketplace" className="hero-image" />
              <div className="hero-overlay">
                <h2>Discover, Collect, and Sell Extraordinary NFTs</h2>
                <p>on the world's first & largest NFT marketplace</p>
              </div>
            </div>
            
            <nav className="app-nav">
              <Link to="/marketplace"><button>Explore Marketplace</button></Link>
              <Link to="/mint"><button>Mint your NFT</button></Link>
              <Link to="/sell"><button>Sell your NFT</button></Link>
            </nav>

            {error && <p className="error-message">{error}</p>}

            <section className="description">
              <h2>Welcome to Our NFT Marketplace</h2>
              <p>
                Discover, collect, and trade unique digital assets on our decentralized platform. 
                Whether you're an artist looking to showcase your work or a collector searching 
                for rare digital treasures, our marketplace provides a secure and user-friendly 
                environment for all your NFT needs.
              </p>
            </section>

            <section className="featured-nfts">
              <h2>Featured NFTs</h2>
              <div className="nft-grid">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="nft-item">
                    <div className="nft-image"></div>
                    <h3>NFT #{item}</h3>
                    <p>0.05 ETH</p>
                    <button>View Details</button>
                  </div>
                ))}
              </div>
            </section>
          </main>
        } />
        <Route path="/mint" element={<MintNFTPage account={account} />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/profile" element={<ProfilePage account={account} />} />
        <Route path="/sell" element={<SellNFTPage account={account} />} />
      </Routes>

      <footer className="app-footer">
        <p>&copy; 2024 NFT Marketplace. All rights reserved. Developed by <a href="https://github.com//nft-marketplace">Federico Nardelli</a></p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
