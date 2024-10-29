// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/NFTMarketplace.sol";

contract DeployMarketplace is Script {
    function run() external {
        // Read private key directly from environment
        bytes32 pk = vm.envBytes32("PRIVATE_KEY");
        uint256 deployerPrivateKey = uint256(pk);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the marketplace contract
        NFTMarketplace marketplace = new NFTMarketplace();
        
        console.log("NFTMarketplace deployed to:", address(marketplace));
        
        vm.stopBroadcast();
        
        // Store the contract address in the environment for the ABI copy script
        vm.setEnv("CONTRACT_ADDRESS", vm.toString(address(marketplace)));
    }
}