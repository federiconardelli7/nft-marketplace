// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol";
import "openzeppelin-contracts/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "openzeppelin-contracts/contracts/token/common/ERC2981.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

contract NFT is ERC1155, ERC1155Supply, ERC2981, Ownable {
    uint256 private _currentTokenId;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => address) public minters;
    mapping(uint256 => uint256) private _initialSupplies;

    event TokenMinted(
        uint256 indexed tokenId,
        address indexed creator,
        uint256 supply,
        string tokenURI,
        uint96 royaltyPercentage
    );

    constructor() ERC1155("") Ownable(msg.sender) {}

    function mint(
        uint256 supply,
        string memory tokenURI,
        uint96 royaltyPercentage
    ) public returns (uint256) {
        require(supply > 0, "Supply must be greater than 0");
        require(royaltyPercentage >= 100 && royaltyPercentage <= 500, "Royalty must be between 1% and 5%");
        require(bytes(tokenURI).length > 0, "URI must not be empty");

        _currentTokenId += 1;
        uint256 newTokenId = _currentTokenId;

        _mint(msg.sender, newTokenId, supply, "");
        _setURI(newTokenId, tokenURI);
        _setTokenRoyalty(newTokenId, msg.sender, royaltyPercentage);
        minters[newTokenId] = msg.sender;
        _initialSupplies[newTokenId] = supply;

        emit TokenMinted(
            newTokenId,
            msg.sender,
            supply,
            tokenURI,
            royaltyPercentage
        );

        return newTokenId;
    }

    // Get token information including availability
    function getTokenInfo(uint256 tokenId) public view returns (
        address creator,
        uint256 initialSupply,
        uint256 currentSupply,
        uint256 availableSupply,
        string memory tokenURI
    ) {
        require(exists(tokenId), "Token does not exist");
        
        creator = minters[tokenId];
        initialSupply = _initialSupplies[tokenId];
        currentSupply = totalSupply(tokenId);
        availableSupply = balanceOf(msg.sender, tokenId);
        tokenURI = uri(tokenId);
    }

    // Get current token supply
    function getTokenSupply(uint256 tokenId) public view returns (uint256) {
        require(exists(tokenId), "Token does not exist");
        return totalSupply(tokenId);
    }

    // Get available balance for an address
    function getAvailableBalance(address owner, uint256 tokenId) public view returns (uint256) {
        require(exists(tokenId), "Token does not exist");
        return balanceOf(owner, tokenId);
    }

    function _setURI(uint256 tokenId, string memory tokenURI) internal {
        _tokenURIs[tokenId] = tokenURI;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        require(exists(tokenId), "URI query for nonexistent token");
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

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
}
