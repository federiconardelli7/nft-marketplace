// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-contracts/contracts/utils/Strings.sol";

contract NFTMarketplace is ERC1155, Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 public constant LISTING_FEE = 0.025 ether;
    uint256 private _tokenIds;
    uint256 private _itemsSold;

    mapping(uint256 => string) private _tokenURIs;

    struct MarketItem {
        uint256 tokenId;
        address payable creator;
        address payable seller;
        uint256 price;
        uint256 supply;
        uint256 remainingSupply;
    }

    mapping(uint256 => MarketItem) private _marketItems;

    event MarketItemCreated(
        uint256 indexed tokenId,
        address creator,
        address seller,
        uint256 price,
        uint256 supply
    );

    event MarketItemSold(
        uint256 indexed tokenId,
        address buyer,
        uint256 amount
    );

    constructor() ERC1155("") Ownable(msg.sender) {}

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    // Update the createToken function to accept and store the URI
    function createToken(uint256 supply, uint256 price, string memory tokenURI) public payable returns (uint256) {
        require(msg.value == LISTING_FEE, "Must pay the listing fee");
        require(supply > 0, "Supply must be greater than 0");
        require(price > 0, "Price must be greater than 0");

        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _mint(msg.sender, newTokenId, supply, "");
        _tokenURIs[newTokenId] = tokenURI;  // Store the token URI

        _marketItems[newTokenId] = MarketItem(
            newTokenId,
            payable(msg.sender),
            payable(msg.sender),
            price,
            supply,
            supply
        );

        emit MarketItemCreated(newTokenId, msg.sender, msg.sender, price, supply);

        return newTokenId;
    }

    function buyToken(uint256 tokenId, uint256 amount) public payable nonReentrant {
        MarketItem storage item = _marketItems[tokenId];
        require(item.tokenId != 0, "Token does not exist");
        require(amount > 0 && amount <= item.remainingSupply, "Invalid amount");
        require(msg.value == item.price * amount, "Incorrect price");

        item.remainingSupply -= amount;
        _itemsSold += amount;

        _safeTransferFrom(item.seller, msg.sender, tokenId, amount, "");
        payable(item.seller).transfer(msg.value);

        emit MarketItemSold(tokenId, msg.sender, amount);
    }

    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = _tokenIds;
        uint256 unsoldItemCount = itemCount - _itemsSold;
        MarketItem[] memory items = new MarketItem[](unsoldItemCount);

        uint256 currentIndex = 0;
        for (uint256 i = 1; i <= itemCount; i++) {
            if (_marketItems[i].remainingSupply > 0) {
                items[currentIndex] = _marketItems[i];
                currentIndex++;
            }
        }
        return items;
    }

    // Update the uri function
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        require(_marketItems[tokenId].tokenId != 0, "URI query for nonexistent token");
        string memory tokenURI = _tokenURIs[tokenId];
        return tokenURI;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
    }
}