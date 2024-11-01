// services/database.js

const mongoose = require('mongoose');
const { User, NFT, Activity } = require('../schemas'); // Change path to where your schemas are

class DatabaseService {
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    if (!this.isConnected) {
      try {
        console.log('Attempting to connect to MongoDB...');
        
        // Suppress deprecation warning
        mongoose.set('strictQuery', true);
        
        // Check if already connected
        if (mongoose.connection.readyState === 1) {
          console.log('Already connected to MongoDB');
          this.isConnected = true;
          return true;
        }
        
        await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
        
        this.isConnected = true;
        console.log('MongoDB Connected Successfully');
        console.log('Connected to database:', mongoose.connection.db.databaseName);
        
        // List collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
        return true;
      } catch (error) {
        console.error('MongoDB Connection Error:', error);
        throw error;
      }
    }
    return true;
  }

  async testConnection() {
    try {
      // Test write operation
      const testUser = await User.create({
        wallet_address: 'test_address_' + Date.now(),
        username: 'Test User'
      });
      console.log('Test user created:', testUser);

      // Delete test user
      await User.deleteOne({ _id: testUser._id });
      console.log('Test user deleted');

      return true;
    } catch (error) {
      console.error('Database test failed:', error);
      return false;
    }
  }

  // User operations
  async createUser(userData) {
    try {
      // Ensure MongoDB is connected
      await this.connect();
      
      console.log('DatabaseService: Creating user with data:', userData);
      
      // Ensure required fields are present
      const normalizedData = {
        wallet_address: userData.wallet_address.toLowerCase(),
        username: userData.username || `User_${userData.wallet_address.slice(-8)}`,
        profile_image: userData.profile_image || "https://via.placeholder.com/100",
        bio: userData.bio || "Bio here",
        social_links: {
          twitter: userData.social_links?.twitter || "",
          instagram: userData.social_links?.instagram || ""
        }
      };

      console.log('Normalized user data:', normalizedData);
      const user = new User(normalizedData);
      const savedUser = await user.save();
      console.log('DatabaseService: User saved successfully:', savedUser);
      return savedUser;
    } catch (error) {
      console.error('DatabaseService: Error in createUser:', error);
      throw error;
    }
  }


  async createUserWithProfile(walletAddress) {
    const truncatedAddress = walletAddress.slice(-8);
    const defaultUsername = `User_${truncatedAddress}`;
    
    const userData = {
      wallet_address: walletAddress.toLowerCase(),
      username: defaultUsername,
      profile_image: "https://via.placeholder.com/100",
      bio: "Bio here",
      social_links: {
        twitter: "",
        instagram: ""
      }
    };

    try {
      const user = await User.create(userData);
      console.log('User created with default profile:', user);
      return user;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(walletAddress, profileData) {
    try {
      const updatedUser = await User.findOneAndUpdate(
        { wallet_address: walletAddress.toLowerCase() },
        {
          ...profileData,
          updated_at: new Date()
        },
        { new: true }
      );
      console.log('Profile updated:', updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async getUserByAddress(walletAddress) {
    try {
      console.log('Getting user by address:', walletAddress);
      const user = await User.findOne({ 
        wallet_address: walletAddress.toLowerCase() 
      });
      console.log('Found user:', user);
      return user;
    } catch (error) {
      console.error('Error in getUserByAddress:', error);
      throw error;
    }
  }

  async updateUser(walletAddress, userData) {
    return User.findOneAndUpdate(
      { wallet_address: walletAddress.toLowerCase() },
      { ...userData, updated_at: new Date() },
      { new: true }
    );
  }

  // NFT operations
  async createNFT(nftData) {
    console.log('Attempting to create NFT:', nftData);
    try {
      // First check if NFT already exists
      const existingNFT = await NFT.findOne({ token_id: nftData.token_id });
      
      if (existingNFT) {
        console.log('NFT already exists, updating instead:', existingNFT);
        // Update the existing NFT with new data
        const updatedNFT = await NFT.findOneAndUpdate(
          { token_id: nftData.token_id },
          {
            $set: {
              metadata: nftData.metadata,
              current_owner: nftData.current_owner,
              total_supply: nftData.total_supply,
              available_amount: nftData.available_amount,
              updated_at: new Date()
            }
          },
          { new: true }
        );
        return updatedNFT;
      }

      // If NFT doesn't exist, create new one
      const result = await NFT.create(nftData);
      console.log('NFT created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating/updating NFT:', error);
      throw error;
    }
  }

  async getNFTByTokenId(tokenId) {
    return NFT.findOne({ token_id: tokenId });
  }

  async updateNFTMetadata(tokenId, metadata) {
    return NFT.findOneAndUpdate(
      { token_id: tokenId },
      { metadata },
      { new: true }
    );
  }

  // Activity tracking
  async logActivity(activityData) {
    console.log('Logging activity:', activityData);
    try {
      const result = await Activity.create(activityData);
      console.log('Activity logged successfully:', result);
      return result;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }

  async getUserActivities(walletAddress, limit = 20) {
    return Activity.find({ wallet_address: walletAddress.toLowerCase() })
      .sort({ created_at: -1 })
      .limit(limit);
  }
}

const dbService = new DatabaseService();
module.exports = dbService;
