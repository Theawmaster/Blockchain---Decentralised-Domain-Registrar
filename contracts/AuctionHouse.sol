// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Strings.sol";

contract AuctionHouse {
    function version() external pure returns (string memory) {
        return "auctionhouse-0.0.1";
    }
}
