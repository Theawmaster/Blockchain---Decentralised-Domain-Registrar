// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "./interfaces/IAuctionHouse.sol";
import "./interfaces/IRegistry.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// -----------------------------------------------------------------------
///                              Custom Errors
/// -----------------------------------------------------------------------
error EmptyBidHash();
error DepositBelowReserve();
error AuctionClosed();
error AuctionAlreadyCommitted();
error NoCommitFound();
error RevealPeriodEnded();
error AlreadyRevealed();
error InvalidBidReveal();
error AuctionNotStarted();
error AuctionNotEnded();
error AuctionAlreadyFinalized();
error WinnerCannotWithdraw();
error NothingToWithdraw();
error WithdrawFailed();

/// -----------------------------------------------------------------------
/// @title AuctionHouse
/// @notice Implements a blind commit–reveal auction for `.ntu` domain names.
/// @dev Handles the auction lifecycle: commit, reveal, finalize, and refund.
///      All ETH movements use the pull pattern and ReentrancyGuard.
/// @custom:phase Commit–Reveal Auction v0.3 (T013)
/// -----------------------------------------------------------------------
contract AuctionHouse is IAuctionHouse, Ownable, Pausable, ReentrancyGuard {
    // -------------------------------------------------------------------
    // Storage Layout
    // -------------------------------------------------------------------
    mapping(bytes32 => mapping(address => bytes32)) private _commits;     // namehash → bidder → commit
    mapping(bytes32 => mapping(address => uint256)) private _commitTime;  // namehash → bidder → timestamp
    mapping(bytes32 => mapping(address => uint256)) private _deposits;    // namehash → bidder → ETH deposit
    mapping(bytes32 => uint256) private _auctionEnd;                      // namehash → auction end time
    mapping(bytes32 => mapping(address => uint256)) private _reveals;     // namehash → bidder → revealed bid
    mapping(bytes32 => uint256) private _highestBid;                      // namehash → current highest bid
    mapping(bytes32 => address) private _highestBidder;                   // namehash → current highest bidder
    mapping(bytes32 => bool) private _finalized;                          // namehash → finalization flag

    uint256 private _proceeds;                                            // accumulated proceeds (winner deposits)
    address public immutable beneficiary;                                 // deployer / treasury
    IRegistry public immutable registry;                                  // linked Registry contract
    uint256 public immutable reservePrice;                                // minimum deposit required
    uint256 public immutable duration;                                    // auction duration (seconds)

    // -------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------
    /// @notice Emitted when a new auction is started.
    event AuctionStarted(bytes32 indexed namehash, uint256 endTime);

    // -------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------
    /// @param registry_ Address of the domain registry contract.
    /// @param reservePrice_ Minimum deposit (in wei) to participate.
    /// @param duration_ Duration of each auction (in seconds).
    constructor(address registry_, uint256 reservePrice_, uint256 duration_)
        Ownable(msg.sender)
    {
        require(registry_ != address(0), "registry addr required");
        registry = IRegistry(registry_);
        reservePrice = reservePrice_;
        duration = duration_;
        beneficiary = msg.sender;
    }

    // -------------------------------------------------------------------
    // Commit Phase (T008)
    // -------------------------------------------------------------------
    /// @notice Commits a sealed bid for a given domain.
    /// @param namehash Hash of the domain name being auctioned.
    /// @param bidHash Off-chain computed bid hash = keccak256(name, bid, salt, bidder).
    /// @dev Starts the auction timer if this is the first commit.
    function commitBid(bytes32 namehash, bytes32 bidHash)
        external
        payable
        nonReentrant
        override
        whenNotPaused
    {
        if (bidHash == bytes32(0)) revert EmptyBidHash();
        if (msg.value < reservePrice) revert DepositBelowReserve();

        if (_auctionEnd[namehash] == 0) {
            _auctionEnd[namehash] = block.timestamp + duration;
            emit AuctionStarted(namehash, _auctionEnd[namehash]);
        } else if (block.timestamp >= _auctionEnd[namehash]) {
            revert AuctionClosed();
        }

        if (_commits[namehash][msg.sender] != bytes32(0)) revert AuctionAlreadyCommitted();

        _commits[namehash][msg.sender] = bidHash;
        _commitTime[namehash][msg.sender] = block.timestamp;
        _deposits[namehash][msg.sender] = msg.value;

        emit BidCommitted(namehash, msg.sender);
    }

    // -------------------------------------------------------------------
    // Reveal Phase (T009)
    // -------------------------------------------------------------------
    /// @notice Reveals a previously committed bid.
    /// @param name The plaintext domain name.
    /// @param bidAmount The numeric bid value.
    /// @param salt Random salt used in commit.
    /// @dev Updates the highest bid and bidder if valid.
    function revealBid(
        string calldata name,
        uint256 bidAmount,
        bytes32 salt
    ) external override nonReentrant whenNotPaused {
        bytes32 namehash = keccak256(abi.encodePacked(name));
        bytes32 commitHash = _commits[namehash][msg.sender];

        if (commitHash == bytes32(0)) revert NoCommitFound();
        if (block.timestamp > _auctionEnd[namehash]) revert RevealPeriodEnded();
        if (_reveals[namehash][msg.sender] != 0) revert AlreadyRevealed();

        bytes32 computed = keccak256(abi.encodePacked(name, bidAmount, salt, msg.sender));
        if (computed != commitHash) revert InvalidBidReveal();

        _reveals[namehash][msg.sender] = bidAmount;

        if (bidAmount > _highestBid[namehash]) {
            _highestBid[namehash] = bidAmount;
            _highestBidder[namehash] = msg.sender;
        }

        emit BidRevealed(namehash, msg.sender, bidAmount);
    }

    // -------------------------------------------------------------------
    // Finalization (T010)
    // -------------------------------------------------------------------
    /// @notice Finalizes an auction after its end time.
    /// @param name The plaintext domain name.
    /// @dev Registers the winner in the Registry and transfers proceeds to treasury.
    function finalizeAuction(string calldata name) external override nonReentrant whenNotPaused {
        bytes32 namehash = keccak256(abi.encodePacked(name));

        uint256 end = _auctionEnd[namehash];
        if (end == 0) revert AuctionNotStarted();
        if (block.timestamp <= end) revert AuctionNotEnded();
        if (_finalized[namehash]) revert AuctionAlreadyFinalized();

        _finalized[namehash] = true;

        address winner = _highestBidder[namehash];
        uint256 winBid = _highestBid[namehash];

        if (winner != address(0)) {
            registry.registerByHash(namehash, winner);

            uint256 winnerDeposit = _deposits[namehash][winner];
            if (winnerDeposit > 0) {
                _deposits[namehash][winner] = 0;
                _proceeds += winnerDeposit;
            }
        }

        emit AuctionFinalized(namehash, winner, winBid);
    }

    // -------------------------------------------------------------------
    // Refunds (T011)
    // -------------------------------------------------------------------
    /// @notice Allows losing bidders to withdraw their deposits.
    /// @param namehash The hashed domain name.
    /// @dev Implements pull pattern to prevent reentrancy.
    function withdraw(bytes32 namehash) external nonReentrant whenNotPaused {
        if (!_finalized[namehash]) revert AuctionNotEnded();

        address winner = _highestBidder[namehash];
        if (msg.sender == winner) revert WinnerCannotWithdraw();

        uint256 amount = _deposits[namehash][msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        _deposits[namehash][msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert WithdrawFailed();

        emit RefundIssued(namehash, msg.sender, amount);
    }

    // -------------------------------------------------------------------
    // Admin Controls (T014)
    // -------------------------------------------------------------------

    /// @notice Pauses all bid, reveal, and finalization functions.
    /// @dev Only callable by contract owner.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses the contract, restoring normal functionality.
    function unpause() external onlyOwner {
        _unpause();
    }

    // -------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------
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

    // ---------- Refunds (T011) ----------
    /// @notice Losing bidders can withdraw their deposits after auction finalization.
    /// @dev Implements pull-based refund pattern to prevent reentrancy vulnerabilities.
    function withdraw(bytes32 namehash) external nonReentrant {
        require(_finalized[namehash], "not finalized");

        // Winner cannot withdraw (their deposit becomes proceeds)
        address winner = _highestBidder[namehash];
        require(msg.sender != winner, "winner cannot withdraw");

        uint256 amount = _deposits[namehash][msg.sender];
        require(amount > 0, "nothing to withdraw");

        _deposits[namehash][msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "withdraw failed");

        emit RefundIssued(namehash, msg.sender, amount);
    }

    /// @notice Emitted when a losing bidder successfully withdraws their deposit.
    /// @param namehash The hashed name of the auctioned domain.
    /// @param bidder The address that withdrew.
    /// @param amount The withdrawn amount in wei.
    event RefundIssued(bytes32 indexed namehash, address indexed bidder, uint256 amount);
}
