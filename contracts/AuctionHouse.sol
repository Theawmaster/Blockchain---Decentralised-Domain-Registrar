// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "./interfaces/IAuctionHouse.sol";
import "./interfaces/IRegistry.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

error EmptyBidHash();
error DepositBelowReserve();
error AuctionAlreadyCommitted();
error AuctionClosed();             
error AuctionNotStarted();
error CommitPhaseNotOpen();
error RevealPhaseNotOpen();
error RevealPeriodEnded();
error NoCommitFound();
error AlreadyRevealed();
error InvalidBidReveal();
error AuctionNotEnded();
error AuctionAlreadyFinalized();
error WinnerCannotWithdraw();
error NothingToWithdraw();
error WithdrawFailed();
error NameAlreadyRegisteredOnRegistry();
error InvalidDomainSuffix();        // must end with .ntu

/// @title AuctionHouse
/// @notice Blind commit–reveal auction for `.ntu` domains.
/// @dev Phases: commit → reveal → finalize. Funds use pull pattern.
///      NOTE: Do NOT redeclare events already in IAuctionHouse (prevents duplicates).
contract AuctionHouse is IAuctionHouse, Ownable, Pausable, ReentrancyGuard {
    // -------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------
    // namehash → bidder → commit / time / deposit / revealed bid
    mapping(bytes32 => mapping(address => bytes32)) private _commits;
    mapping(bytes32 => mapping(address => uint256)) private _commitTime;
    mapping(bytes32 => mapping(address => uint256)) private _deposits;
    mapping(bytes32 => mapping(address => uint256)) private _reveals;

    // namehash → phase windows
    mapping(bytes32 => uint256) private _commitEnd;  // commit cutoff
    mapping(bytes32 => uint256) private _revealEnd;  // reveal cutoff

    // namehash → leading state
    mapping(bytes32 => uint256) private _highestBid;
    mapping(bytes32 => address) private _highestBidder;

    // namehash → status
    mapping(bytes32 => bool) private _finalized;

    // optional expiry tracking for the won domain (front-end friendly)
    mapping(bytes32 => uint256) public expiration;

    // Track active auctions so UI can list them
    bytes32[] private _activeAuctions;
    mapping(bytes32 => bool) private _isActive; // membership set

    // economics / params
    uint256 private _proceeds;               // winner deposits accumulated
    address public immutable beneficiary;    // treasury
    IRegistry public immutable registry;     // Registry
    uint256 public immutable reservePrice;   // min deposit to bid (in wei)
    uint256 public immutable commitDuration; // seconds
    uint256 public immutable revealDuration; // seconds
    uint256 public immutable defaultExpiry;  // seconds after finalize

    // Extra events defined only here (not in interface)
    event AuctionStarted(bytes32 indexed namehash, uint256 commitEnd, uint256 revealEnd);
    event ProceedsSwept(address indexed to, uint256 amount);

    // -------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------
    constructor(
        address registry_,
        uint256 reservePrice_,
        uint256 commitDuration_,
        uint256 revealDuration_,
        uint256 defaultExpiry_
    ) Ownable(msg.sender) {
        require(registry_ != address(0), "registry addr required");
        require(commitDuration_ > 0 && revealDuration_ > 0, "durations > 0");
        registry = IRegistry(registry_);
        reservePrice = reservePrice_;
        commitDuration = commitDuration_;
        revealDuration = revealDuration_;
        defaultExpiry = defaultExpiry_;
        beneficiary = msg.sender;
    }

    // -------------------------------------------------------------------
    // Internal utils
    // -------------------------------------------------------------------
    function _endsWithNTU(string memory name) internal pure returns (bool) {
        bytes memory s = bytes(name);
        bytes memory tld = bytes(".ntu");
        if (s.length < tld.length) return false;
        for (uint256 i = 0; i < tld.length; i++) {
            if (s[s.length - tld.length + i] != tld[i]) return false;
        }
        return true;
    }

    function _initWindows(bytes32 namehash) internal {
        if (_commitEnd[namehash] == 0) {
            uint256 cEnd = block.timestamp + commitDuration;
            _commitEnd[namehash] = cEnd;
            _revealEnd[namehash] = cEnd + revealDuration;

            if (!_isActive[namehash]) {
                _isActive[namehash] = true;
                _activeAuctions.push(namehash);
            }

            emit AuctionStarted(namehash, _commitEnd[namehash], _revealEnd[namehash]);
        }
    }

    function _deactivate(bytes32 namehash) internal {
        if (_isActive[namehash]) {
            _isActive[namehash] = false;
            // swap & pop
            uint256 n = _activeAuctions.length;
            for (uint256 i = 0; i < n; i++) {
                if (_activeAuctions[i] == namehash) {
                    if (i != n - 1) _activeAuctions[i] = _activeAuctions[n - 1];
                    _activeAuctions.pop();
                    break;
                }
            }
        }
    }

    // -------------------------------------------------------------------
    // Optional explicit starter (nice for UX, not required)
    // -------------------------------------------------------------------
    /// @notice Explicitly start an auction (checks .ntu and not registered).
    function startAuction(string calldata name) external whenNotPaused {
        if (!_endsWithNTU(name)) revert InvalidDomainSuffix();
        bytes32 namehash = keccak256(abi.encodePacked(name));
        if (registry.ownerOf(namehash) != address(0)) revert NameAlreadyRegisteredOnRegistry();
        _initWindows(namehash);
    }

    // -------------------------------------------------------------------
    // Commit Phase
    // -------------------------------------------------------------------
    /// @notice Commit sealed bid: hash = keccak256(abi.encodePacked(name, bid, salt, bidder))
    /// @dev On first commit for a name, phase windows are created (lazy).
    function commitBid(bytes32 namehash, bytes32 bidHash)
        external
        payable
        nonReentrant
        override
        whenNotPaused
    {
        if (bidHash == bytes32(0)) revert EmptyBidHash();
        if (msg.value < reservePrice) revert DepositBelowReserve();
        if (registry.ownerOf(namehash) != address(0)) revert NameAlreadyRegisteredOnRegistry();

        _initWindows(namehash);
        if (block.timestamp >= _commitEnd[namehash]) revert AuctionClosed();
        if (_commits[namehash][msg.sender] != bytes32(0)) revert AuctionAlreadyCommitted();

        _commits[namehash][msg.sender] = bidHash;
        _commitTime[namehash][msg.sender] = block.timestamp;
        _deposits[namehash][msg.sender] = msg.value;

        emit BidCommitted(namehash, msg.sender);
    }

    /// @notice Safer overload that validates `.ntu` on-chain during commit.
    function commitBidWithName(string calldata name, bytes32 bidHash)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        if (!_endsWithNTU(name)) revert InvalidDomainSuffix();
        bytes32 namehash = keccak256(abi.encodePacked(name));
        this.commitBid{ value: msg.value }(namehash, bidHash);

    }

    // -------------------------------------------------------------------
    // Reveal Phase
    // -------------------------------------------------------------------
    function revealBid(
        string calldata name,
        uint256 bidAmount,
        bytes32 salt
    ) external override nonReentrant whenNotPaused {
        if (!_endsWithNTU(name)) revert InvalidDomainSuffix();

        bytes32 namehash = keccak256(abi.encodePacked(name));
        bytes32 commitHash = _commits[namehash][msg.sender];
        if (commitHash == bytes32(0)) revert NoCommitFound();

        if (block.timestamp < _commitEnd[namehash]) revert RevealPhaseNotOpen();
        if (block.timestamp > _revealEnd[namehash]) revert RevealPeriodEnded();
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
    // Finalization
    // -------------------------------------------------------------------
    function finalizeAuction(string calldata name)
        external
        override
        nonReentrant
        whenNotPaused
    {
        if (!_endsWithNTU(name)) revert InvalidDomainSuffix();

        bytes32 namehash = keccak256(abi.encodePacked(name));
        uint256 rEnd = _revealEnd[namehash];
        if (rEnd == 0) revert AuctionNotStarted();
        if (block.timestamp <= rEnd) revert AuctionNotEnded();
        if (_finalized[namehash]) revert AuctionAlreadyFinalized();

        _finalized[namehash] = true;

        address winner = _highestBidder[namehash];
        uint256 winBid = _highestBid[namehash];

        if (winner != address(0)) {
            // Will revert if already registered (safety)
            registry.register(name, winner);

            // winner’s deposit becomes proceeds
            uint256 winnerDeposit = _deposits[namehash][winner];
            if (winnerDeposit > 0) {
                _deposits[namehash][winner] = 0;
                _proceeds += winnerDeposit;
            }

            expiration[namehash] = block.timestamp + defaultExpiry;
        }

        _deactivate(namehash);
        emit AuctionFinalized(namehash, winner, winBid);
    }

    // -------------------------------------------------------------------
    // Refunds (losers only)
    // -------------------------------------------------------------------
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
    // Admin / Treasury
    // -------------------------------------------------------------------
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /// @notice Sweep accumulated proceeds to beneficiary
    function sweepProceeds() external nonReentrant onlyOwner {
        uint256 amt = _proceeds;
        _proceeds = 0;
        (bool ok, ) = payable(beneficiary).call{value: amt}("");
        if (!ok) revert WithdrawFailed();
        emit ProceedsSwept(beneficiary, amt);
    }

    // -------------------------------------------------------------------
    // Views (UI helpers)
    // -------------------------------------------------------------------
    function commitEnd(bytes32 namehash) external view returns (uint256) { return _commitEnd[namehash]; }
    function revealEnd(bytes32 namehash) external view returns (uint256) { return _revealEnd[namehash]; }
    function getCommit(bytes32 namehash, address bidder) external view returns (bytes32) { return _commits[namehash][bidder]; }
    function getCommitTime(bytes32 namehash, address bidder) external view returns (uint256) { return _commitTime[namehash][bidder]; }
    function getDeposit(bytes32 namehash, address bidder) external view returns (uint256) { return _deposits[namehash][bidder]; }
    function getHighestBid(bytes32 namehash) external view returns (uint256) { return _highestBid[namehash]; }
    function getHighestBidder(bytes32 namehash) external view returns (address) { return _highestBidder[namehash]; }
    function isFinalized(bytes32 namehash) external view returns (bool) { return _finalized[namehash]; }
    function proceeds() external view returns (uint256) { return _proceeds; }

    /// @notice Phase as string for quick UI
    function phase(bytes32 namehash) external view returns (string memory) {
        if (_commitEnd[namehash] == 0) return "not-started";
        if (block.timestamp < _commitEnd[namehash]) return "commit";
        if (block.timestamp <= _revealEnd[namehash]) return "reveal";
        if (!_finalized[namehash]) return "await-finalize";
        return "finalized";
    }

    /// @notice Remaining seconds for commit/reveal windows (0 if passed/not started)
    function commitSecondsLeft(bytes32 namehash) external view returns (uint256) {
        uint256 c = _commitEnd[namehash];
        if (c == 0 || block.timestamp >= c) return 0;
        return c - block.timestamp;
    }

    function revealSecondsLeft(bytes32 namehash) external view returns (uint256) {
        uint256 r = _revealEnd[namehash];
        if (r == 0 || block.timestamp >= r) return 0;
        if (block.timestamp < _commitEnd[namehash]) return _revealEnd[namehash] - _commitEnd[namehash];
        return r - block.timestamp;
    }

    /// @notice List active auctions (namehashes)
    function getActiveAuctions() external view returns (bytes32[] memory) {
        return _activeAuctions;
    }

    function phaseBatch(bytes32[] calldata hashes) external view returns (string[] memory out) {
        out = new string[](hashes.length);
        for (uint256 i; i < hashes.length; i++) {
            out[i] = this.phase(hashes[i]);
        }
    }


    receive() external payable {}
}
