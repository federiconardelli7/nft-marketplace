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
        uint256 endTime;  // New field
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
        uint256 endTime  // New field
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

    constructor() Ownable(msg.sender) {}

    function setPlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 10000, "Fee cannot exceed 100%");
        platformFeePercentage = newFeePercentage;
    }

    function listToken(
        address nftContract,
        uint256 tokenId,
        uint256 amount,
        uint256 price,
        uint256 endTime  // New parameter
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
            endTime,  // New field
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
            endTime  // New field
        );
    }

    function buyToken(uint256 marketItemId, uint256 amount) external payable nonReentrant {
        MarketItem storage item = _marketItems[marketItemId];
        require(item.active, "Item not active");
        require(block.timestamp <= item.endTime, "Listing has expired");  // New check
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

        if (item.remainingAmount == 0 || block.timestamp > item.endTime) {
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

    function cancelListing(uint256 marketItemId) external nonReentrant {
        MarketItem storage item = _marketItems[marketItemId];
        require(item.active, "Item not active");
        require(msg.sender == item.seller, "Only seller can cancel");

        item.active = false;
        IERC1155(item.nftContract).safeTransferFrom(
            address(this),
            item.seller,
            item.tokenId,
            item.remainingAmount,
            ""
        );
    }

    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 activeItemCount = 0;
        for (uint256 i = 1; i <= _marketItemIds; i++) {
            if (_marketItems[i].active && block.timestamp <= _marketItems[i].endTime) {
                activeItemCount++;
            }
        }

        MarketItem[] memory items = new MarketItem[](activeItemCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 1; i <= _marketItemIds; i++) {
            if (_marketItems[i].active && block.timestamp <= _marketItems[i].endTime) {
                items[currentIndex] = _marketItems[i];
                currentIndex++;
            }
        }
        return items;
    }

    function getMarketItem(uint256 marketItemId) public view returns (MarketItem memory) {
        return _marketItems[marketItemId];
    }
}