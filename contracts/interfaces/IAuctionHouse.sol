// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

/// @title Blind-commit auction interface for .ntu names
interface IAuctionHouse {
    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------
    event BidCommitted(bytes32 indexed namehash, address indexed bidder);
    event BidRevealed(bytes32 indexed namehash, address indexed bidder, uint256 bidAmount);
    event AuctionFinalized(bytes32 indexed namehash, address indexed winner, uint256 winningBid);
    event RefundIssued(bytes32 indexed namehash, address indexed bidder, uint256 amount);

    /// -----------------------------------------------------------------------
    /// Core functions
    /// -----------------------------------------------------------------------

    /// keccak256(abi.encodePacked(name, bidAmount, salt, bidder))
    /// Commit a sealed bid with deposit ≥ reservePrice
    function commitBid(bytes32 namehash, bytes32 bidHash) external payable;

    /// Reveal a previously committed bid
    function revealBid(string calldata name, uint256 bidAmount, bytes32 salt) external;

    /// Finalize auction for `name`; should register winner in Registry
    function finalizeAuction(string calldata name) external;
}
