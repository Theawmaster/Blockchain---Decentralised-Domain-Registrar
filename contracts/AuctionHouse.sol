// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "./interfaces/IAuctionHouse.sol";
import "./interfaces/IRegistry.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AuctionHouse - Blind Commit-Reveal Auction for .ntu Domains
contract AuctionHouse is IAuctionHouse, ReentrancyGuard {
    // ---------- Storage layout ----------
    // namehash => (bidder => commit hash)
    mapping(bytes32 => mapping(address => bytes32)) private _commits;
    // namehash => (bidder => commit timestamp)
    mapping(bytes32 => mapping(address => uint256)) private _commitTime;
    // namehash => (bidder => ETH deposit sent at commit)
    mapping(bytes32 => mapping(address => uint256)) private _deposits;
    // namehash => auction end timestamp (set on first commit)
    mapping(bytes32 => uint256) private _auctionEnd;
    // namehash => (bidder => revealed bid amount)
    mapping(bytes32 => mapping(address => uint256)) private _reveals;
    // namehash => highest bid and bidder (updated on each valid reveal)
    mapping(bytes32 => uint256) private _highestBid;
    mapping(bytes32 => address) private _highestBidder;
    // namehash => finalized flag (one-shot guard)
    mapping(bytes32 => bool) private _finalized;

    // proceeds accumulated for the beneficiary (winner’s deposit for now)
    uint256 private _proceeds;
    // deployer is the beneficiary; keeps ctor signature stable
    address public immutable beneficiary;

    IRegistry public immutable registry;
    uint256 public immutable reservePrice;
    uint256 public immutable duration;

    // ---------- Constructor ----------
    constructor(address registry_, uint256 reservePrice_, uint256 duration_) {
        require(registry_ != address(0), "registry addr required");
        registry = IRegistry(registry_);
        reservePrice = reservePrice_;
        duration = duration_;
        beneficiary = msg.sender; // simple treasury; changeable later if needed
    }

    // ---------- Commit (T008) ----------
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

    // ---------- Reveal (T009) ----------
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

        // commit = keccak256(abi.encodePacked(name, bid, salt, bidder))
        bytes32 computed = keccak256(abi.encodePacked(name, bidAmount, salt, msg.sender));
        require(computed == commitHash, "invalid reveal");

        _reveals[namehash][msg.sender] = bidAmount;

        if (bidAmount > _highestBid[namehash]) {
            _highestBid[namehash] = bidAmount;
            _highestBidder[namehash] = msg.sender;
        }

        emit BidRevealed(namehash, msg.sender, bidAmount);
    }

    // ---------- Finalize (T010) ----------
    /// @notice closes the auction, registers the winner, and moves funds (one-shot)
    /// @dev current funds model: winner's *deposit* is retained as proceeds;
    ///      losers will withdraw in T011 via a pull-pattern `withdraw()`.
    function finalizeAuction(string calldata name) external override nonReentrant {
        bytes32 namehash = keccak256(abi.encodePacked(name));

        uint256 end = _auctionEnd[namehash];
        require(end != 0, "auction not started");
        require(block.timestamp > end, "auction not ended");
        require(!_finalized[namehash], "already finalized");

        _finalized[namehash] = true;

        address winner = _highestBidder[namehash];
        uint256 winBid = _highestBid[namehash];

        // if nobody revealed, do nothing except emit
        if (winner != address(0)) {
            // mint/register ownership in the registry
            // Registry supports bytes32-based registration in your current codebase
            registry.registerByHash(namehash, winner);

            // move winner's *deposit* to proceeds (simple model for now)
            uint256 winnerDeposit = _deposits[namehash][winner];
            if (winnerDeposit > 0) {
                _deposits[namehash][winner] = 0;
                _proceeds += winnerDeposit;
            }
        }

        emit AuctionFinalized(namehash, winner, winBid);
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

    function isFinalized(bytes32 namehash) external view returns (bool) {
        return _finalized[namehash];
    }

    function proceeds() external view returns (uint256) {
        return _proceeds;
    }
}
