const dbService = require('../services/databaseService');

async function testDatabaseService() {
  try {
    console.log('Testing Database Service...');
    
    const result = await dbService.runTest();
    
    if (result) {
      console.log('All tests passed!');
    } else {
      console.log('Tests failed!');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit();
  }
}

testDatabaseService();