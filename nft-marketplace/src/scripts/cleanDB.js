// scripts/cleanDB.js

const mongoose = require('mongoose');
require('dotenv').config();

async function cleanDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log('Found collections:', collections.map(c => c.name));

    // Drop each collection
    for (const collection of collections) {
      console.log(`Dropping collection: ${collection.name}`);
      await mongoose.connection.db.dropCollection(collection.name);
    }

    console.log('All collections have been dropped successfully');
  } catch (error) {
    console.error('Error cleaning database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

cleanDatabase();