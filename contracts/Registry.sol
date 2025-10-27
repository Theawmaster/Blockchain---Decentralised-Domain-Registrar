// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "./interfaces/IRegistry.sol";

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
/// @custom:phase Registry Core v0.3 (T013)
/// -----------------------------------------------------------------------
contract Registry is IRegistry {
    // -------------------------------------------------------------------
    // Storage Layout
    // -------------------------------------------------------------------
    /// @dev namehash → owner address
    mapping(bytes32 => address) private _ownerOf;

    /// @dev namehash → resolved address (T012)
    mapping(bytes32 => address) private _resolves;


    // -------------------------------------------------------------------
    // Internal Validation
    // -------------------------------------------------------------------
    /// @dev Validates domain name format: [a–z0–9-], no double or leading/trailing dashes.
    /// @param name The domain name to validate.
    /// @return True if the name conforms to `.ntu` naming rules.
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
    /// @notice Registers a new domain name to an owner.
    /// @param name The domain name (e.g. "alice").
    /// @param owner The address to assign ownership to.
    /// @custom:error InvalidNameFormat Thrown when name violates format rules.
    /// @custom:error NameAlreadyRegistered Thrown if the name is already taken.
    function register(string calldata name, address owner) external override {
        if (!_isValidName(name)) revert InvalidNameFormat();
        bytes32 namehash = keccak256(abi.encodePacked(name));
        if (_ownerOf[namehash] != address(0)) revert NameAlreadyRegistered();

        _ownerOf[namehash] = owner;
        emit NameRegistered(namehash, owner, name);
    }

    /// @notice Registers ownership directly by hash (used by AuctionHouse).
    /// @param namehash The keccak256 hash of the domain name.
    /// @param owner The address to assign ownership to.
    /// @custom:error NameAlreadyRegistered Thrown if already owned.
    function registerByHash(bytes32 namehash, address owner) external override {
        if (_ownerOf[namehash] != address(0)) revert NameAlreadyRegistered();
        _ownerOf[namehash] = owner;
        emit NameRegistered(namehash, owner, "");
    }

    // -------------------------------------------------------------------
    // Ownership View
    // -------------------------------------------------------------------
    /// @notice Returns the owner of a domain hash.
    /// @param namehash The keccak256 hash of the domain name.
    /// @return The owner address or address(0) if unregistered.
    function ownerOf(bytes32 namehash) external view override returns (address) {
        return _ownerOf[namehash];
    }

    // -------------------------------------------------------------------
    // Resolver API (T012)
    // -------------------------------------------------------------------
    /// @notice Allows the owner to set a resolution address for a domain.
    /// @param name The registered domain name (e.g. "alice").
    /// @param resolved The address that this domain should resolve to.
    /// @custom:error DomainNotRegistered Thrown if the domain is not registered.
    /// @custom:error NotDomainOwner Thrown if caller is not the domain owner.
    function setResolve(string calldata name, address resolved) external {
        bytes32 namehash = keccak256(abi.encodePacked(name));
        address owner = _ownerOf[namehash];
        if (owner == address(0)) revert DomainNotRegistered();
        if (msg.sender != owner) revert NotDomainOwner();

        _resolves[namehash] = resolved;
        emit ResolveSet(namehash, resolved);
    }

    /// @notice Resolves a domain name to its mapped address.
    /// @param name The registered domain name.
    /// @return resolved The address this name resolves to (or zero if unset).
    function resolve(string calldata name) external view returns (address resolved) {
        bytes32 namehash = keccak256(abi.encodePacked(name));
        resolved = _resolves[namehash];
    }
}
