// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol";
import "openzeppelin-contracts/contracts/token/common/ERC2981.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

contract NFT is ERC1155, ERC2981, Ownable {
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => uint96) private _tokenRoyalties;
    uint256 private _tokenIds;

    event TokenMinted(
        uint256 indexed tokenId,
        address creator,
        uint256 supply,
        uint96 royaltyPercentage
    );

    constructor(string memory baseURI) ERC1155(baseURI) Ownable(msg.sender) {}

    function mint(
        uint256 supply,
        string memory tokenURI,
        uint96 royaltyPercentage
    ) public returns (uint256) {
        require(supply > 0, "Supply must be greater than 0");
        require(royaltyPercentage >= 100 && royaltyPercentage <= 500, "Royalty must be between 1% and 5%");

        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _mint(msg.sender, newTokenId, supply, "");
        _tokenURIs[newTokenId] = tokenURI;
        _setTokenRoyalty(newTokenId, msg.sender, royaltyPercentage);
        _tokenRoyalties[newTokenId] = royaltyPercentage;

        emit TokenMinted(newTokenId, msg.sender, supply, royaltyPercentage);

        return newTokenId;
    }

    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        require(bytes(_tokenURIs[tokenId]).length > 0, "URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
