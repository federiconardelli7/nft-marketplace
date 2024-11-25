// scripts/cleanCollections.js

const mongoose = require('mongoose');
const { User, NFT, Activity } = require('../schemas');
require('dotenv').config();

async function cleanCollections() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clean specific collections
    console.log('Cleaning Users collection...');
    await User.deleteMany({});
    
    console.log('Cleaning NFTs collection...');
    await NFT.deleteMany({});
    
    console.log('Cleaning Activities collection...');
    await Activity.deleteMany({});

    console.log('All collections have been cleaned successfully');

    // Optional: Get counts to verify
    const userCount = await User.countDocuments();
    const nftCount = await NFT.countDocuments();
    const activityCount = await Activity.countDocuments();

    console.log('Collection counts after cleaning:', {
      users: userCount,
      nfts: nftCount,
      activities: activityCount
    });

  } catch (error) {
    console.error('Error cleaning collections:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

cleanCollections();