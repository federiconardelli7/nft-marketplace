import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { connectWallet, createToken, fetchMarketItems, buyNFT } from './contractInteraction';
import MintNFTPage from './components/MintNFTPage';
import MarketplacePage from './components/MarketplacePage';
import './App.css';

function App() {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode) {
      setDarkMode(JSON.parse(savedMode));
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    document.body.classList.toggle('light-mode', !darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleConnect = async () => {
    try {
      const signer = await connectWallet();
      if (signer) {
        const address = await signer.getAddress();
        setAccount(address);
        setError(null);
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

  return (
    <Router>
      <div className={`App ${darkMode ? 'dark-mode' : 'light-mode'}`}>
        <header className="app-header container">
          <Link to="/" className="app-title">NFT Marketplace</Link>
          <div className="header-controls">
            <button onClick={toggleDarkMode} className="mode-toggle">
              {darkMode ? '☀️' : '🌙'}
            </button>
            {account ? (
              <p className="account-info">{account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
            ) : (
              <button onClick={handleConnect} className="connect-button">Connect Wallet</button>
            )}
          </div>
        </header>

        <Routes>
          <Route path="/" element={
            <main className="container">
              <section className="hero-section">
                <h1 className="hero-title">Discover, Collect, and Sell Extraordinary NFTs</h1>
                <p className="hero-subtitle">on the world's first & largest NFT marketplace</p>
                <div className="hero-cta">
                  <Link to="/marketplace" className="btn btn-primary">Explore</Link>
                  <Link to="/mint" className="btn btn-secondary">Create</Link>
                </div>
              </section>

              <section className="featured-nfts">
                <h2>Featured NFTs</h2>
                <div className="nft-grid">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="nft-item">
                      <img src={`https://via.placeholder.com/300?text=NFT+${item}`} alt={`NFT ${item}`} className="nft-image" />
                      <div className="nft-info">
                        <h3 className="nft-title">NFT #{item}</h3>
                        <p className="nft-price">0.05 ETH</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </main>
          } />
          <Route path="/mint" element={<MintNFTPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
        </Routes>

        <footer className="app-footer container">
          <p>&copy; 2024 NFT Marketplace. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;