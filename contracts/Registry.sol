// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "./interfaces/IRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// -----------------------------------------------------------------------
///                              Custom Errors
/// -----------------------------------------------------------------------
error InvalidNameFormat();
error NameAlreadyRegistered();
error DomainNotRegistered();
error NotDomainOwner();

/// -----------------------------------------------------------------------
/// @title Registry
/// @notice Manages ownership and resolution of `.ntu` domain names.
/// @dev Provides domain registration, ownership lookups, and resolver mapping.
/// @custom:phase Registry Core v0.4 (T014 - Access Control & Pausable)
/// -----------------------------------------------------------------------
contract Registry is IRegistry, Ownable, Pausable {
    // -------------------------------------------------------------------
    // Storage Layout
    // -------------------------------------------------------------------
    /// @dev namehash → owner address
    mapping(bytes32 => address) private _ownerOf;

    /// @dev namehash → resolved address (T012)
    mapping(bytes32 => address) private _resolves;

    // -------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------
    /// @notice Initializes Ownable with deployer as the initial owner.
    constructor() Ownable(msg.sender) {}

    // -------------------------------------------------------------------
    // Internal Validation
    // -------------------------------------------------------------------
    /// @dev Validates domain name format: [a–z0–9-], no double or leading/trailing dashes.
    function _isValidName(string memory name) internal pure returns (bool) {
        bytes memory b = bytes(name);
        if (b.length < 3 || b.length > 63) return false;
        if (b[0] == "-" || b[b.length - 1] == "-") return false;
        for (uint256 i; i < b.length; i++) {
            bytes1 c = b[i];
            if (
                !(c >= 0x61 && c <= 0x7A) && // a–z
                !(c >= 0x30 && c <= 0x39) && // 0–9
                !(c == 0x2D)                 // hyphen
            ) return false;
            if (i > 0 && b[i - 1] == 0x2D && c == 0x2D) return false;
        }
        return true;
    }

    // -------------------------------------------------------------------
    // Registration (Public)
    // -------------------------------------------------------------------
    function register(string calldata name, address owner)
        external
        override
        whenNotPaused
    {
        if (!_isValidName(name)) revert InvalidNameFormat();
        bytes32 namehash = keccak256(abi.encodePacked(name));
        if (_ownerOf[namehash] != address(0)) revert NameAlreadyRegistered();

        _ownerOf[namehash] = owner;
        emit NameRegistered(namehash, owner, name);
    }

    function registerByHash(bytes32 namehash, address owner)
        external
        override
        whenNotPaused
    {
        if (_ownerOf[namehash] != address(0)) revert NameAlreadyRegistered();
        _ownerOf[namehash] = owner;
        emit NameRegistered(namehash, owner, "");
    }

    // -------------------------------------------------------------------
    // Ownership View
    // -------------------------------------------------------------------
    function ownerOf(bytes32 namehash)
        external
        view
        override
        returns (address)
    {
        return _ownerOf[namehash];
    }

    // -------------------------------------------------------------------
    // Resolver API (T012)
    // -------------------------------------------------------------------
    function setResolve(string calldata name, address resolved)
        external
        whenNotPaused
    {
        bytes32 namehash = keccak256(abi.encodePacked(name));
        address owner = _ownerOf[namehash];
        if (owner == address(0)) revert DomainNotRegistered();
        if (msg.sender != owner) revert NotDomainOwner();

        _resolves[namehash] = resolved;
        emit ResolveSet(namehash, resolved);
    }

    function resolve(string calldata name)
        external
        view
        returns (address resolved)
    {
        bytes32 namehash = keccak256(abi.encodePacked(name));
        resolved = _resolves[namehash];
    }

    // -------------------------------------------------------------------
    // Admin Controls (T014)
    // -------------------------------------------------------------------
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
