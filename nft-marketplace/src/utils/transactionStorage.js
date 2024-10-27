export const storeTransaction = (txData) => {
    const transactions = JSON.parse(localStorage.getItem('nftTransactions') || '[]');
    transactions.push({
      ...txData,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('nftTransactions', JSON.stringify(transactions));
  };
  
  export const getTransactions = () => {
    return JSON.parse(localStorage.getItem('nftTransactions') || '[]');
  };
  
  // Usage in your component:
  import { storeTransaction } from '../utils/transactionStorage';
  
  // After successful minting:
  storeTransaction({
    hash: mintResult.transactionHash,
    tokenId: mintResult.tokenId,
    metadata: metadataUploadResult.pinataUrl,
    image: imageUploadResult.pinataUrl,
    name: name,
    description: description,
    price: price,
    supply: supply
  });