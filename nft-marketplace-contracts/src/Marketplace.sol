// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC1155/IERC1155.sol";
import "openzeppelin-contracts/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

contract Marketplace is ERC1155Holder, ReentrancyGuard, Ownable {
    uint256 public platformFeePercentage = 100; // 1% (base 10000)
    uint256 private _itemsSold;
    uint256 private _marketItemIds;

    struct MarketItem {
        uint256 marketItemId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        uint256 price;
        uint256 amount;
        uint256 remainingAmount;
        uint256 endTime;
        bool active;
    }

    // MarketItem ID => MarketItem
    mapping(uint256 => MarketItem) private _marketItems;

    event MarketItemCreated(
        uint256 indexed marketItemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 price,
        uint256 amount,
        uint256 endTime
    );

    event MarketItemSold(
        uint256 indexed marketItemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price,
        uint256 amount
    );

    event MarketItemExpired(
        uint256 indexed marketItemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 remainingAmount
    );

    event MarketItemCancelled(
        uint256 indexed marketItemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 remainingAmount
    );

    constructor() Ownable(msg.sender) {}

    // Utility function to check if a listing is expired
    function isExpired(uint256 marketItemId) public view returns (bool) {
        MarketItem storage item = _marketItems[marketItemId];
        return item.endTime <= block.timestamp;
    }

    // Function to handle expired listing
    function handleExpiredListing(uint256 marketItemId) internal {
        MarketItem storage item = _marketItems[marketItemId];
        require(item.active && item.remainingAmount > 0 && isExpired(marketItemId), "Listing not eligible for expiry handling");

        // Save amount to return before modifying storage
        uint256 amountToReturn = item.remainingAmount;
        
        // Update state before transfer to prevent reentrancy
        item.remainingAmount = 0;
        item.active = false;

        // Return remaining NFTs to seller
        IERC1155(item.nftContract).safeTransferFrom(
            address(this),
            item.seller,
            item.tokenId,
            amountToReturn,
            ""
        );

        emit MarketItemExpired(
            marketItemId,
            item.nftContract,
            item.tokenId,
            item.seller,
            amountToReturn
        );
    }

    function listToken(
        address nftContract,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        uint256 endTime
    ) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(price > 0, "Price must be greater than 0");
        require(endTime > block.timestamp, "End time must be in the future");

        IERC1155 nft = IERC1155(nftContract);
        require(
            nft.balanceOf(msg.sender, tokenId) >= amount,
            "Insufficient token balance"
        );

        _marketItemIds++;
        uint256 marketItemId = _marketItemIds;

        _marketItems[marketItemId] = MarketItem(
            marketItemId,
            nftContract,
            tokenId,
            payable(msg.sender),
            price,
            amount,
            amount,
            endTime,
            true
        );

        nft.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        emit MarketItemCreated(
            marketItemId,
            nftContract,
            tokenId,
            msg.sender,
            price,
            amount,
            endTime
        );
    }

    function buyToken(uint256 marketItemId, uint256 amount) external payable nonReentrant {
        MarketItem storage item = _marketItems[marketItemId];
        require(item.active, "Item not active");
        
        // Check if expired and handle appropriately
        if (isExpired(marketItemId)) {
            handleExpiredListing(marketItemId);
            revert("Listing has expired");
        }
        
        require(amount > 0 && amount <= item.remainingAmount, "Invalid amount");
        require(msg.value == item.price * amount, "Incorrect price");

        uint256 platformFee = (msg.value * platformFeePercentage) / 10000;
        uint256 sellerAmount = msg.value - platformFee;

        payable(owner()).transfer(platformFee);
        payable(item.seller).transfer(sellerAmount);

        IERC1155(item.nftContract).safeTransferFrom(
            address(this),
            msg.sender,
            item.tokenId,
            amount,
            ""
        );

        item.remainingAmount -= amount;
        _itemsSold += amount;

        if (item.remainingAmount == 0) {
            item.active = false;
        }

        emit MarketItemSold(
            marketItemId,
            item.nftContract,
            item.tokenId,
            item.seller,
            msg.sender,
            item.price,
            amount
        );
    }

    function cancelListing(uint256 marketItemId, uint256 amountToRemove) external nonReentrant {
    MarketItem storage item = _marketItems[marketItemId];
    require(item.active, "Item not active");
    require(msg.sender == item.seller, "Only seller can cancel");
    require(amountToRemove > 0 && amountToRemove <= item.remainingAmount, "Invalid amount to remove");

    // If removing all, deactivate listing
    if (amountToRemove == item.remainingAmount) {
        item.active = false;
    }
    
    // Update remaining amount
    item.remainingAmount -= amountToRemove;
    
    // Return the NFTs to seller
    IERC1155(item.nftContract).safeTransferFrom(
        address(this),
        item.seller,
        item.tokenId,
        amountToRemove,
        ""
    );

    emit MarketItemCancelled(
        marketItemId,
        item.nftContract,
        item.tokenId,
        item.seller,
        amountToRemove
    );
}

    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 activeItemCount = 0;
        
        // First pass: count active and non-expired items
        for (uint256 i = 1; i <= _marketItemIds; i++) {
            if (_marketItems[i].active && !isExpired(i)) {
                activeItemCount++;
            }
        }

        MarketItem[] memory items = new MarketItem[](activeItemCount);
        uint256 currentIndex = 0;
        
        // Second pass: populate array with active and non-expired items
        for (uint256 i = 1; i <= _marketItemIds; i++) {
            if (_marketItems[i].active && !isExpired(i)) {
                items[currentIndex] = _marketItems[i];
                currentIndex++;
            }
        }
        return items;
    }

    // Function to handle expired listings (can be called by anyone)
    function cleanExpiredListing(uint256 marketItemId) external {
        require(_marketItems[marketItemId].active, "Item not active");
        require(isExpired(marketItemId), "Item not expired");
        handleExpiredListing(marketItemId);
    }

    function getMarketItem(uint256 marketItemId) public view returns (MarketItem memory) {
        return _marketItems[marketItemId];
    }
}