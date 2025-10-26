// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "./interfaces/IAuctionHouse.sol";
import "./interfaces/IRegistry.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AuctionHouse - Blind Commit-Reveal Auction for .ntu Domains
/// @notice Implements commit, reveal, and tracking of highest bidder
contract AuctionHouse is IAuctionHouse, ReentrancyGuard {
    // ---------- Storage layout ----------
    // namehash => (bidder => commit hash)
    mapping(bytes32 => mapping(address => bytes32)) private _commits;
    // namehash => (bidder => commit timestamp)
    mapping(bytes32 => mapping(address => uint256)) private _commitTime;
    // namehash => (bidder => ETH deposit)
    mapping(bytes32 => mapping(address => uint256)) private _deposits;
    // namehash => auction end timestamp
    mapping(bytes32 => uint256) private _auctionEnd;
    // namehash => (bidder => revealed bid amount)
    mapping(bytes32 => mapping(address => uint256)) private _reveals;
    // namehash => highest bid info
    mapping(bytes32 => uint256) private _highestBid;
    mapping(bytes32 => address) private _highestBidder;

    IRegistry public immutable registry;
    uint256 public immutable reservePrice;
    uint256 public immutable duration;

    // ---------- Constructor ----------
    constructor(address registry_, uint256 reservePrice_, uint256 duration_) {
        require(registry_ != address(0), "registry addr required");
        registry = IRegistry(registry_);
        reservePrice = reservePrice_;
        duration = duration_;
    }

    // ---------- Commit Function (T008) ----------
    function commitBid(bytes32 namehash, bytes32 bidHash)
        external
        payable
        nonReentrant
        override
    {
        require(bidHash != bytes32(0), "empty hash");
        require(msg.value >= reservePrice, "deposit < reserve");

        if (_auctionEnd[namehash] == 0) {
            _auctionEnd[namehash] = block.timestamp + duration;
        } else {
            require(block.timestamp < _auctionEnd[namehash], "auction closed");
        }

        require(_commits[namehash][msg.sender] == bytes32(0), "already committed");

        _commits[namehash][msg.sender] = bidHash;
        _commitTime[namehash][msg.sender] = block.timestamp;
        _deposits[namehash][msg.sender] = msg.value;

        emit BidCommitted(namehash, msg.sender);
    }

    // ---------- Reveal Function (T009) ----------
    function revealBid(
        string calldata name,
        uint256 bidAmount,
        bytes32 salt
    ) external override nonReentrant {
        bytes32 namehash = keccak256(abi.encodePacked(name));
        bytes32 commitHash = _commits[namehash][msg.sender];

        require(commitHash != bytes32(0), "no commit found");
        require(block.timestamp <= _auctionEnd[namehash], "reveal period ended");
        require(_reveals[namehash][msg.sender] == 0, "already revealed");

        // Recompute commitment (MUST match original encoding)
        bytes32 computed = keccak256(
            abi.encodePacked(name, bidAmount, salt, msg.sender)
        );
        require(computed == commitHash, "invalid reveal");

        // Store revealed value
        _reveals[namehash][msg.sender] = bidAmount;

        // Update highest bid tracking
        if (bidAmount > _highestBid[namehash]) {
            _highestBid[namehash] = bidAmount;
            _highestBidder[namehash] = msg.sender;
        }

        emit BidRevealed(namehash, msg.sender, bidAmount);
    }

    // ---------- Stub: Finalize Function (T010 placeholder) ----------
    function finalizeAuction(string calldata name) external override {
        bytes32 namehash = keccak256(abi.encodePacked(name));
        emit AuctionFinalized(namehash, _highestBidder[namehash], _highestBid[namehash]);
    }

    // ---------- Views ----------
    function getCommit(bytes32 namehash, address bidder) external view returns (bytes32) {
        return _commits[namehash][bidder];
    }

    function getCommitTime(bytes32 namehash, address bidder) external view returns (uint256) {
        return _commitTime[namehash][bidder];
    }

    function getDeposit(bytes32 namehash, address bidder) external view returns (uint256) {
        return _deposits[namehash][bidder];
    }

    function auctionEnd(bytes32 namehash) external view returns (uint256) {
        return _auctionEnd[namehash];
    }

    function getHighestBid(bytes32 namehash) external view returns (uint256) {
        return _highestBid[namehash];
    }

    function getHighestBidder(bytes32 namehash) external view returns (address) {
        return _highestBidder[namehash];
    }
}
