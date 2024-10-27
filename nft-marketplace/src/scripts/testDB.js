// scripts/testDB.js
const dbService = require('../services/database');
const { User, NFT, Activity } = require('../schemas');
require('dotenv').config();

async function runTests() {
  try {
    console.log('Starting database tests...');

    // Connect to database
    await dbService.connect();
    console.log('Connected to database');

    // Test user operations
    console.log('\nTesting user operations...');
    const testUser = await dbService.createUser({
      wallet_address: '0xtest' + Date.now(),
      username: 'Test User',
      bio: 'Test Bio'
    });
    console.log('Created test user:', testUser);

    // Test NFT operations
    console.log('\nTesting NFT operations...');
    const testNFT = await dbService.createNFT({
      token_id: 'test' + Date.now(),
      metadata: {
        name: 'Test NFT',
        description: 'Test Description',
        image: 'https://test.com/image.jpg',
        attributes: [{ trait_type: 'Test', value: 'Test' }]
      },
      creator_address: testUser.wallet_address,
      current_owner: testUser.wallet_address,
      total_supply: 1,
      available_amount: 1
    });
    console.log('Created test NFT:', testNFT);

    // Test activity logging
    console.log('\nTesting activity logging...');
    const testActivity = await dbService.logActivity({
      wallet_address: testUser.wallet_address,
      activity_type: 'MINT',
      token_id: testNFT.token_id,
      amount: 1,
      transaction_hash: '0x' + Date.now()
    });
    console.log('Created test activity:', testActivity);

    // Clean up test data
    await User.deleteOne({ _id: testUser._id });
    await NFT.deleteOne({ _id: testNFT._id });
    await Activity.deleteOne({ _id: testActivity._id });
    console.log('\nTest data cleaned up');

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit();
  }
}

runTests();