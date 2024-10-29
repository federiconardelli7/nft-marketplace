// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC1155/IERC1155.sol";
import "openzeppelin-contracts/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "openzeppelin-contracts/contracts/token/common/ERC2981.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

contract Marketplace is ERC1155Holder, ReentrancyGuard, Ownable {
    uint256 public constant LISTING_FEE = 0.025 ether;
    uint256 private _itemsSold;

    struct MarketItem {
        uint256 tokenId;
        address nftContract;
        address payable creator;
        address payable seller;
        uint256 price;
        uint256 supply;
        uint256 remainingSupply;
        bool active;
    }

    // MarketItem ID => MarketItem
    mapping(uint256 => MarketItem) private _marketItems;
    uint256 private _marketItemIds;

    event MarketItemCreated(
        uint256 indexed marketItemId,
        uint256 indexed tokenId,
        address indexed nftContract,
        address creator,
        address seller,
        uint256 price,
        uint256 supply
    );

    event MarketItemSold(
        uint256 indexed marketItemId,
        uint256 indexed tokenId,
        address buyer,
        uint256 amount
    );

    constructor() Ownable(msg.sender) {}

    function createMarketItem(
        address nftContract,
        uint256 tokenId,
        uint256 supply,
        uint256 price
    ) public payable returns (uint256) {
        require(msg.value == LISTING_FEE, "Must pay the listing fee");
        require(supply > 0, "Supply must be greater than 0");
        require(price > 0, "Price must be greater than 0");

        _marketItemIds++;
        uint256 marketItemId = _marketItemIds;

        IERC1155(nftContract).safeTransferFrom(msg.sender, address(this), tokenId, supply, "");

        _marketItems[marketItemId] = MarketItem(
            tokenId,
            nftContract,
            payable(msg.sender),
            payable(msg.sender),
            price,
            supply,
            supply,
            true
        );

        emit MarketItemCreated(
            marketItemId,
            tokenId,
            nftContract,
            msg.sender,
            msg.sender,
            price,
            supply
        );

        return marketItemId;
    }

    function buyMarketItem(uint256 marketItemId, uint256 amount) public payable nonReentrant {
        MarketItem storage item = _marketItems[marketItemId];
        require(item.active, "Item not active");
        require(amount > 0 && amount <= item.remainingSupply, "Invalid amount");
        
        uint256 totalPrice = item.price * amount;
        require(msg.value == totalPrice, "Incorrect price");

        // Calculate royalties if applicable
        (address royaltyReceiver, uint256 royaltyAmount) = 
            ERC2981(item.nftContract).royaltyInfo(item.tokenId, totalPrice);
        
        // Calculate platform fee (1%)
        uint256 platformFee = (totalPrice * 100) / 10000;
        
        // Calculate final amount for seller
        uint256 sellerAmount = totalPrice - royaltyAmount - platformFee;

        // Transfer royalties if applicable
        if(royaltyAmount > 0 && royaltyReceiver != item.seller) {
            payable(royaltyReceiver).transfer(royaltyAmount);
        }

        // Transfer platform fee to contract owner
        payable(owner()).transfer(platformFee);
        
        // Transfer remaining amount to seller
        payable(item.seller).transfer(sellerAmount);

        // Transfer NFT to buyer
        IERC1155(item.nftContract).safeTransferFrom(
            address(this),
            msg.sender,
            item.tokenId,
            amount,
            ""
        );

        item.remainingSupply -= amount;
        _itemsSold += amount;

        if(item.remainingSupply == 0) {
            item.active = false;
        }

        emit MarketItemSold(marketItemId, item.tokenId, msg.sender, amount);
    }

    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = _marketItemIds;
        uint256 activeItemCount = itemCount - _itemsSold;
        MarketItem[] memory items = new MarketItem[](activeItemCount);

        uint256 currentIndex = 0;
        for (uint256 i = 1; i <= itemCount; i++) {
            if (_marketItems[i].active) {
                items[currentIndex] = _marketItems[i];
                currentIndex++;
            }
        }
        return items;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
}
