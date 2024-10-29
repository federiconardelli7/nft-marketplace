// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {NFT} from "../src/NFT.sol";

contract DeployNFT is Script {
    function run() external returns (NFT) {
        vm.startBroadcast();
        NFT nft = new NFT("ipfs://");
        vm.stopBroadcast();
        
        // Add this line to match the expected output format
        console2.log("NFT deployed to: %s", address(nft));
        
        return nft;
    }
}
