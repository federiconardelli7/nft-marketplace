// src/services/ipfsService.js

import axios from 'axios';

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://green-hidden-halibut-64.mypinata.cloud';

const pinataConfig = {
  headers: {
    'pinata_api_key': process.env.REACT_APP_PINATA_API_KEY,
    'pinata_secret_api_key': process.env.REACT_APP_PINATA_API_SECRET
  }
};

export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const headers = {
      'pinata_api_key': process.env.REACT_APP_PINATA_API_KEY,
      'pinata_secret_api_key': process.env.REACT_APP_PINATA_API_SECRET
    };

    console.log('Headers present:', {
      api_key_present: !!headers.pinata_api_key,
      secret_present: !!headers.pinata_secret_api_key
    });

    const response = await axios({
      method: 'post',
      url: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
      data: formData,
      headers: headers,
      maxContentLength: Infinity
    });

    return {
      success: true,
      pinataUrl: `ipfs://${response.data.IpfsHash}`,
      pinataHash: response.data.IpfsHash
    };
  } catch (error) {
    console.error('Error uploading to IPFS:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    throw error;
  }
};

export const uploadMetadata = async (metadata) => {
  try {
    const headers = {
      'pinata_api_key': process.env.REACT_APP_PINATA_API_KEY,
      'pinata_secret_api_key': process.env.REACT_APP_PINATA_API_SECRET,
      'Content-Type': 'application/json'
    };

    const response = await axios({
      method: 'post',
      url: 'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      data: metadata,
      headers: headers
    });

    return {
      success: true,
      pinataUrl: `ipfs://${response.data.IpfsHash}`,
      pinataHash: response.data.IpfsHash
    };
  } catch (error) {
    console.error('Error uploading metadata:', error);
    throw error;
  }
};

// Helper method to verify credentials
export const verifyCredentials = async () => {
  try {
    const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
      headers: {
        'pinata_api_key': process.env.REACT_APP_PINATA_API_KEY,
        'pinata_secret_api_key': process.env.REACT_APP_PINATA_API_SECRET
      }
    });
    console.log('Pinata credentials verified:', response.data);
    return true;
  } catch (error) {
    console.error('Pinata credential verification failed:', error.response?.data);
    return false;
  }
};