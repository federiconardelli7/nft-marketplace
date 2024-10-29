// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {Marketplace} from "../src/Marketplace.sol";

contract DeployMarketplace is Script {
    function run() external returns (Marketplace) {
        vm.startBroadcast();
        Marketplace marketplace = new Marketplace();
        vm.stopBroadcast();
        
        console2.log("Marketplace deployed to: %s", address(marketplace));
        
        return marketplace;
    }
}
