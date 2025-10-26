// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "./interfaces/IAuctionHouse.sol";
import "./interfaces/IRegistry.sol";

/// @notice Storage + ABI skeleton; logic lands in T008–T009
contract AuctionHouse is IAuctionHouse {
    // ---------- Storage layout ----------
    // namehash => (bidder => commit hash)
    mapping(bytes32 => mapping(address => bytes32)) private _commits;
    // namehash => (bidder => revealed amount)
    mapping(bytes32 => mapping(address => uint256)) private _reveals;
    // namehash => auction end timestamp
    mapping(bytes32 => uint256) private _auctionEnd;

    IRegistry public immutable registry;  // Registry contract
    uint256  public immutable reservePrice; // optional floor
    uint256  public immutable duration;     // seconds from first commit

    // ---------- Constructor ----------
    constructor(address registry_, uint256 reservePrice_, uint256 duration_) {
        require(registry_ != address(0), "registry addr required");
        registry = IRegistry(registry_);
        reservePrice = reservePrice_;
        duration = duration_;
    }

    // ---------- IAuctionHouse ABI (stubs for now) ----------
    function commitBid(bytes32 namehash, bytes32 bidHash) external override {
        // T008: set _auctionEnd if unset; record commit; prevent overwrite; emit
        _commits[namehash][msg.sender] = bidHash;
        if (_auctionEnd[namehash] == 0) {
            _auctionEnd[namehash] = block.timestamp + duration;
        }
        emit BidCommitted(namehash, msg.sender);
    }

    function revealBid(
        string calldata name,
        uint256 bidAmount,
        bytes32 salt
    ) external override {
        // T008: verify commit hash matches; store revealed value; emit
        bytes32 namehash = keccak256(abi.encodePacked(name));
        // full checks come in T008; just emit for now to satisfy ABI
        emit BidRevealed(namehash, msg.sender, bidAmount);
        _reveals[namehash][msg.sender] = bidAmount;
    }

    function finalizeAuction(string calldata name) external override {
        // T009: find highest valid reveal >= reserve; register winner; clean up
        bytes32 namehash = keccak256(abi.encodePacked(name));
        emit AuctionFinalized(namehash, address(0), 0);
    }

    // ---------- Views helpful to frontend ----------
    function getCommit(bytes32 namehash, address bidder) external view returns (bytes32) {
        return _commits[namehash][bidder];
    }
    function getReveal(bytes32 namehash, address bidder) external view returns (uint256) {
        return _reveals[namehash][bidder];
    }
    function auctionEnd(bytes32 namehash) external view returns (uint256) {
        return _auctionEnd[namehash];
    }
}
