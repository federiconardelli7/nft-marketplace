const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  wallet_address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  username: {
    type: String,
    required: true
  },
  profile_image: {
    type: String,
    default: "https://via.placeholder.com/100"
  },
  bio: {
    type: String,
    default: "Bio here"
  },
  social_links: {
    twitter: { type: String, default: "" },
    instagram: { type: String, default: "" }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Add pre-save middleware to ensure username is set
userSchema.pre('save', function(next) {
  if (!this.username && this.wallet_address) {
    this.username = `User_${this.wallet_address.slice(-8)}`;
  }
  next();
});

const nftSchema = new mongoose.Schema({
  token_id: {
    type: String,
    required: true,
    unique: true
  },
  metadata: {
    name: String,
    description: String,
    image: String,
    attributes: [{}]
  },
  creator_address: {
    type: String,
    required: true,
    lowercase: true
  },
  current_owner: {
    type: String,
    required: true,
    lowercase: true
  },
  total_supply: Number,
  available_amount: Number,
  created_at: {
    type: Date,
    default: Date.now
  }
});

const activitySchema = new mongoose.Schema({
  wallet_address: {
    type: String,
    required: true,
    lowercase: true
  },
  activity_type: {
    type: String,
    required: true,
    enum: ['MINT', 'LIST', 'UNLIST', 'BUY', 'SELL', 'EXPIRED']
  },
  token_id: String,
  amount: Number,
  transaction_hash: String,
  price: String,
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Create and export models
const User = mongoose.model('User', userSchema);
const NFT = mongoose.model('NFT', nftSchema);
const Activity = mongoose.model('Activity', activitySchema);

module.exports = { User, NFT, Activity };