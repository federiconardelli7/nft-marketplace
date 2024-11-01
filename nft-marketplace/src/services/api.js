// src/services/api.js

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper to handle BigInt serialization
const formatData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

export const api = {
  // User operations
  async createUser(walletAddress) {
    try {
      const truncatedAddress = walletAddress.slice(-8);
      const userData = {
        wallet_address: walletAddress.toLowerCase(),
        username: `User_${truncatedAddress}`, // Include username in the request
        profile_image: "https://via.placeholder.com/100",
        bio: "Bio here",
        social_links: {
          twitter: "",
          instagram: ""
        }
      };
  
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData) // Send complete user data
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },
  
  async getUser(walletAddress) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${walletAddress.toLowerCase()}`);
      
      if (response.status === 404) {
        console.log('User not found, creating new user...');
        return this.createUser(walletAddress);
      }
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      return data;
    } catch (error) {
      if (error.message.includes('not found')) {
        return this.createUser(walletAddress);
      }
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  async updateUserProfile(walletAddress, profileData) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${walletAddress}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  // NFT operations
  async createNFT(nftData) {
    try {
      const response = await fetch(`${API_BASE_URL}/nfts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formatData(nftData))
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('NFT creation error:', errorData);
        
        // If it's a duplicate key error, try updating instead
        if (errorData.error && errorData.error.includes('duplicate key error')) {
          console.log('Attempting to update existing NFT...');
          const updateResponse = await fetch(`${API_BASE_URL}/nfts/${nftData.token_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formatData(nftData))
          });

          if (!updateResponse.ok) {
            throw new Error(`Failed to update NFT: ${updateResponse.status}`);
          }

          return await updateResponse.json();
        }
        
        throw new Error(errorData.message || `Failed to create NFT: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating/updating NFT:', error);
      throw error;
    }
  },

  async getNFTsByOwner(walletAddress) {
    const response = await fetch(`${API_BASE_URL}/nfts/owner/${walletAddress}`);
    return response.json();
  },

  // Activity operations
  async logActivity(activityData) {
    const response = await fetch(`${API_BASE_URL}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatData(activityData))
    });
    return response.json();
  },

  async getUserActivities(walletAddress) {
    const response = await fetch(`${API_BASE_URL}/activities/${walletAddress}`);
    return response.json();
  },

  async createActivity(activityData) {
    try {
      const response = await fetch(`${API_BASE_URL}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Activity creation error:', errorData);
        throw new Error(errorData.message || 'Failed to create activity record');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  }
};
