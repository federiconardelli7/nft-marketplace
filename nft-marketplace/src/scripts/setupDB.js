// src/scripts/setupDB.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function setupDatabase() {
  try {
    console.log('Setting up MongoDB collections...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create collections
    const db = mongoose.connection.db;
    
    const collections = ['users', 'nfts', 'activities', 'collections'];
    
    for (const collectionName of collections) {
      const exists = await db.listCollections({ name: collectionName }).hasNext();
      if (!exists) {
        await db.createCollection(collectionName);
        console.log(`Created collection: ${collectionName}`);
      } else {
        console.log(`Collection ${collectionName} already exists`);
      }
    }

    // Create indexes
    const Users = db.collection('users');
    await Users.createIndex({ wallet_address: 1 }, { unique: true });
    console.log('Created index on users.wallet_address');

    const NFTs = db.collection('nfts');
    await NFTs.createIndex({ token_id: 1 }, { unique: true });
    await NFTs.createIndex({ creator_address: 1 });
    console.log('Created indexes on NFTs collection');

    const Activities = db.collection('activities');
    await Activities.createIndex({ wallet_address: 1 });
    await Activities.createIndex({ token_id: 1 });
    await Activities.createIndex({ created_at: -1 });
    console.log('Created indexes on Activities collection');

    console.log('\nDatabase setup completed successfully!');

  } catch (error) {
    console.error('Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit();
  }
}

setupDatabase();