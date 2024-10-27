const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser'); // Add this if not already present
const dbService = require('../services/database');
require('dotenv').config();

const app = express();

// Middleware - place these before any routes
app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(express.json({limit: '50mb'}));

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Initialize database and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected Successfully');

    // Initialize database service
    await dbService.connect();
    
    // User Routes
    app.get('/api/users/:walletAddress', async (req, res) => {
      try {
        console.log('Getting user for address:', req.params.walletAddress);
        const user = await dbService.getUserByAddress(req.params.walletAddress);
        if (!user) {
          console.log('User not found');
          return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
      } catch (error) {
        console.error('Error in GET /api/users/:walletAddress:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/users', async (req, res) => {
      try {
        const userData = req.body;
        console.log('Received user data:', userData);

        if (!userData.wallet_address) {
          return res.status(400).json({ error: 'Wallet address is required' });
        }

        // Check if user already exists
        let existingUser = await dbService.getUserByAddress(userData.wallet_address.toLowerCase());
        if (existingUser) {
          console.log('User already exists:', existingUser);
          return res.json(existingUser);
        }

        // Create new user
        console.log('Creating new user with data:', userData);
        const user = await dbService.createUser(userData);
        console.log('User created successfully:', user);
        res.status(201).json(user);
      } catch (error) {
        console.error('Error in POST /api/users:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.put('/api/users/:walletAddress/profile', async (req, res) => {
      try {
        console.log('Updating profile for:', req.params.walletAddress);
        const updatedUser = await dbService.updateUserProfile(
          req.params.walletAddress,
          req.body
        );
        if (!updatedUser) {
          return res.status(404).json({ message: 'User not found' });
        }
        res.json(updatedUser);
      } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/nfts', async (req, res) => {
      try {
        const nft = await dbService.createNFT(req.body);
        res.status(201).json(nft);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/nfts/owner/:walletAddress', async (req, res) => {
      try {
        const nfts = await dbService.getNFTsByOwner(req.params.walletAddress);
        res.json(nfts);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/activities', async (req, res) => {
      try {
        const activity = await dbService.logActivity(req.body);
        res.status(201).json(activity);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/activities/:walletAddress', async (req, res) => {
      try {
        const activities = await dbService.getUserActivities(req.params.walletAddress);
        res.json(activities);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
