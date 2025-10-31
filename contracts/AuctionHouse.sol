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
error InvalidDomainSuffix(); // must end with .ntu

/// @title AuctionHouse
/// @notice Blind commit–reveal auction for `.ntu` domains.
contract AuctionHouse is IAuctionHouse, Ownable, Pausable, ReentrancyGuard {
    // --------------------------------- Storage ---------------------------------

    // namehash -> bidder -> data
    mapping(bytes32 => mapping(address => bytes32)) private _commits;
    mapping(bytes32 => mapping(address => uint256)) private _commitTime;
    mapping(bytes32 => mapping(address => uint256)) private _deposits;
    mapping(bytes32 => mapping(address => uint256)) private _reveals;

    // namehash -> phase windows
    mapping(bytes32 => uint256) private _commitEnd;
    mapping(bytes32 => uint256) private _revealEnd;

    // namehash -> leader
    mapping(bytes32 => uint256) private _highestBid;
    mapping(bytes32 => address) private _highestBidder;

    // namehash -> status
    mapping(bytes32 => bool) private _finalized;

    // expiry helper
    mapping(bytes32 => uint256) public expiration;

    // active auctions set
    bytes32[] private _activeAuctions;
    mapping(bytes32 => bool) private _isActive;

    // NEW: persist domain string so UI can render names during auction
    mapping(bytes32 => string) private _domainOf;

    // economics / params
    uint256 private _proceeds;
    address public immutable beneficiary;
    IRegistry public immutable registry;
    uint256 public immutable reservePrice;   // wei
    uint256 public immutable commitDuration; // seconds
    uint256 public immutable revealDuration; // seconds
    uint256 public immutable defaultExpiry;  // seconds

    // events
    event AuctionStarted(bytes32 indexed namehash, uint256 commitEnd, uint256 revealEnd);
    event ProceedsSwept(address indexed to, uint256 amount);

    constructor(
        address registry_,
        uint256 reservePrice_,
        uint256 commitDuration_,
        uint256 revealDuration_,
        uint256 defaultExpiry_
    ) Ownable(msg.sender) {
        require(registry_ != address(0), "registry required");
        require(commitDuration_ > 0 && revealDuration_ > 0, "durations > 0");
        registry = IRegistry(registry_);
        reservePrice = reservePrice_;
        commitDuration = commitDuration_;
        revealDuration = revealDuration_;
        defaultExpiry = defaultExpiry_;
        beneficiary = msg.sender;
    }

    // ------------------------------ Internal utils -----------------------------

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
            uint256 n = _activeAuctions.length;
            for (uint256 i; i < n; i++) {
                if (_activeAuctions[i] == namehash) {
                    if (i != n - 1) _activeAuctions[i] = _activeAuctions[n - 1];
                    _activeAuctions.pop();
                    break;
                }
            }
        }
    }

    // Single internal commit entry used by both public commit fns (avoids reentrancy issues)
    function _commit(bytes32 namehash, bytes32 bidHash) internal {
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

    // --------------------------------- Starters --------------------------------

    /// @notice Optional: proactively open a window for a domain.
    function startAuction(string calldata name) external whenNotPaused {
        if (!_endsWithNTU(name)) revert InvalidDomainSuffix();
        bytes32 namehash = keccak256(abi.encodePacked(name));
        if (registry.ownerOf(namehash) != address(0)) revert NameAlreadyRegisteredOnRegistry();
        if (bytes(_domainOf[namehash]).length == 0) _domainOf[namehash] = name; // store human name
        _initWindows(namehash);
    }

    // --------------------------------- Commit ----------------------------------

    /// @notice Commit sealed bid with precomputed hash: keccak256(abi.encodePacked(name, bid, salt, bidder))
    function commitBid(bytes32 namehash, bytes32 bidHash)
        external
        payable
        nonReentrant
        override
        whenNotPaused
    {
        _commit(namehash, bidHash);
    }

    /// @notice Commit sealed bid using the domain string (validates `.ntu` on-chain).
    function commitBidWithName(string calldata name, bytes32 bidHash)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        if (!_endsWithNTU(name)) revert InvalidDomainSuffix();
        bytes32 namehash = keccak256(abi.encodePacked(name));
        if (bytes(_domainOf[namehash]).length == 0) _domainOf[namehash] = name; // store once
        _commit(namehash, bidHash);
    }

    // --------------------------------- Reveal ----------------------------------

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

        // Must match the front-end/off-chain formula exactly
        bytes32 computed = keccak256(abi.encodePacked(name, bidAmount, salt, msg.sender));
        if (computed != commitHash) revert InvalidBidReveal();

        _reveals[namehash][msg.sender] = bidAmount;

        if (bidAmount > _highestBid[namehash]) {
            _highestBid[namehash] = bidAmount;
            _highestBidder[namehash] = msg.sender;
        }

        emit BidRevealed(namehash, msg.sender, bidAmount);
    }

    // ------------------------------- Finalization ------------------------------

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
            // Ensure domain string is recorded for UIs; register FULL domain (e.g., "ivan.ntu")
            if (bytes(_domainOf[namehash]).length == 0) _domainOf[namehash] = name;
            registry.register(name, winner);

            // winner deposit -> proceeds
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

    // --------------------------------- Refunds ---------------------------------

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

    // --------------------------------- Admin -----------------------------------

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function sweepProceeds() external nonReentrant onlyOwner {
        uint256 amt = _proceeds;
        _proceeds = 0;
        (bool ok, ) = payable(beneficiary).call{value: amt}("");
        if (!ok) revert WithdrawFailed();
        emit ProceedsSwept(beneficiary, amt);
    }

    // ---------------------------------- Views ----------------------------------

    function commitEnd(bytes32 namehash) external view returns (uint256) { return _commitEnd[namehash]; }
    function revealEnd(bytes32 namehash) external view returns (uint256) { return _revealEnd[namehash]; }
    function getCommit(bytes32 namehash, address bidder) external view returns (bytes32) { return _commits[namehash][bidder]; }
    function getCommitTime(bytes32 namehash, address bidder) external view returns (uint256) { return _commitTime[namehash][bidder]; }
    function getDeposit(bytes32 namehash, address bidder) external view returns (uint256) { return _deposits[namehash][bidder]; }
    function getHighestBid(bytes32 namehash) external view returns (uint256) { return _highestBid[namehash]; }
    function getHighestBidder(bytes32 namehash) external view returns (address) { return _highestBidder[namehash]; }
    function isFinalized(bytes32 namehash) external view returns (bool) { return _finalized[namehash]; }
    function proceeds() external view returns (uint256) { return _proceeds; }

    /// @notice Remaining seconds for commit (0 if none/ended)
    function commitSecondsLeft(bytes32 namehash) external view returns (uint256) {
        uint256 c = _commitEnd[namehash];
        if (c == 0 || block.timestamp >= c) return 0;
        return c - block.timestamp;
    }

    /// @notice Remaining seconds for reveal (0 if none/ended)
    function revealSecondsLeft(bytes32 namehash) external view returns (uint256) {
        uint256 r = _revealEnd[namehash];
        if (r == 0 || block.timestamp >= r) return 0;
        if (block.timestamp < _commitEnd[namehash]) return _revealEnd[namehash] - _commitEnd[namehash];
        return r - block.timestamp;
    }

    /// @notice Active auction hashes
    function getActiveAuctions() external view returns (bytes32[] memory) {
        return _activeAuctions;
    }

    /// @notice NEW: get the domain string during auction
    function domainOf(bytes32 namehash) external view returns (string memory) {
        return _domainOf[namehash];
    }

    /// @notice NEW: convenience bundle for UIs
    function getAuctionInfo(bytes32 namehash)
        external
        view
        returns (
            string memory domain,
            uint256 commitEnd_,
            uint256 revealEnd_,
            bool finalized,
            address highestBidder_,
            uint256 highestBid_
        )
    {
        domain = _domainOf[namehash];
        commitEnd_ = _commitEnd[namehash];
        revealEnd_ = _revealEnd[namehash];
        finalized = _finalized[namehash];
        highestBidder_ = _highestBidder[namehash];
        highestBid_ = _highestBid[namehash];
    }

    receive() external payable {}
}
