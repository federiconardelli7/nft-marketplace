// src/services/ipfsService.js

import axios from 'axios';

class IPFSService {
  constructor() {
    this.apiKey = process.env.REACT_APP_PINATA_API_KEY;
    this.apiSecret = process.env.REACT_APP_PINATA_API_SECRET;
    this.gateway = 'https://green-hidden-halibut-64.mypinata.cloud';

    // Debug check for environment variables
    if (!this.apiKey || !this.apiSecret) {
      console.error('Pinata API keys not found in environment variables:', {
        apiKey: this.apiKey ? 'Present' : 'Missing',
        apiSecret: this.apiSecret ? 'Present' : 'Missing'
      });
    }
  }

  async uploadFile(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Debug log for request configuration
      console.log('Uploading to Pinata with config:', {
        apiKeyPresent: !!this.apiKey,
        apiSecretPresent: !!this.apiSecret,
        fileSize: file.size,
        fileType: file.type
      });

      const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data`,
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.apiSecret
        }
      });

      if (response.status === 200) {
        return {
          success: true,
          ipfsHash: response.data.IpfsHash,
          pinataUrl: `${this.gateway}/ipfs/${response.data.IpfsHash}`
        };
      }

      return {
        success: false,
        message: 'Upload failed'
      };

    } catch (error) {
      // Enhanced error logging
      console.error('Error uploading to IPFS:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });

      return {
        success: false,
        message: error.response?.data?.error || error.message
      };
    }
  }

  async uploadMetadata(metadata) {
    try {
      const response = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.apiSecret
        }
      });

      if (response.status === 200) {
        return {
          success: true,
          ipfsHash: response.data.IpfsHash,
          pinataUrl: `${this.gateway}/ipfs/${response.data.IpfsHash}`
        };
      }

      return {
        success: false,
        message: 'Metadata upload failed'
      };

    } catch (error) {
      console.error('Error uploading metadata to IPFS:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      return {
        success: false,
        message: error.response?.data?.error || error.message
      };
    }
  }

  // Helper method to verify credentials
  async verifyCredentials() {
    try {
      const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
        headers: {
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.apiSecret
        }
      });
      console.log('Pinata credentials verification:', response.data);
      return response.status === 200;
    } catch (error) {
      console.error('Pinata credentials verification failed:', error);
      return false;
    }
  }
}

export default new IPFSService();