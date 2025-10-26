// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

/// @title Blind-commit auction interface for .ntu names
interface IAuctionHouse {
    event BidCommitted(bytes32 indexed namehash, address indexed bidder);
    event BidRevealed(bytes32 indexed namehash, address indexed bidder, uint256 bidAmount);
    event AuctionFinalized(bytes32 indexed namehash, address indexed winner, uint256 winningBid);

    /// keccak256(abi.encodePacked(name, bidAmount, salt, bidder))
    function commitBid(bytes32 namehash, bytes32 bidHash) external;

    /// Reveal a previously committed bid
    function revealBid(string calldata name, uint256 bidAmount, bytes32 salt) external;

    /// Finalize auction for `name`; should register winner in Registry
    function finalizeAuction(string calldata name) external;
}
