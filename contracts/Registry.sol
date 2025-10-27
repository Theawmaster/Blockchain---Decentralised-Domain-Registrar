// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "./interfaces/IRegistry.sol";

contract Registry is IRegistry {
    // ---------- Storage layout ----------
    // namehash => owner address
    mapping(bytes32 => address) private _ownerOf;
    // namehash => resolved address (T012)
    mapping(bytes32 => address) private _resolves;

    // ---------- Internal helpers ----------
    function _isValidName(string memory name) internal pure returns (bool) {
        bytes memory b = bytes(name);
        if (b.length < 3 || b.length > 63) return false;
        if (b[0] == "-" || b[b.length - 1] == "-") return false;
        for (uint i; i < b.length; i++) {
            bytes1 c = b[i];
            if (
                !(c >= 0x61 && c <= 0x7A) && // a–z
                !(c >= 0x30 && c <= 0x39) && // 0–9
                !(c == 0x2D)
            ) return false;
            if (i > 0 && b[i - 1] == 0x2D && c == 0x2D) return false;
        }
        return true;
    }

    // ---------- Registration ----------
    function register(string calldata name, address owner) external override {
        require(_isValidName(name), "invalid name format");
        bytes32 namehash = keccak256(abi.encodePacked(name));
        require(_ownerOf[namehash] == address(0), "already registered");
        _ownerOf[namehash] = owner;
        emit NameRegistered(namehash, owner, name);
    }

    // new helper for system-level calls (e.g., AuctionHouse)
    function registerByHash(bytes32 namehash, address owner) external override {
        require(_ownerOf[namehash] == address(0), "already registered");
        _ownerOf[namehash] = owner;
        emit NameRegistered(namehash, owner, "");
    }

    function ownerOf(bytes32 namehash) external view override returns (address) {
        return _ownerOf[namehash];
    }

    // ---------- Resolve API ----------
    /// @notice Allows a domain owner to set a resolver address for their domain.
    /// @param name The registered domain name (e.g. "alice").
    /// @param resolved The address that this name should resolve to.
    function setResolve(string calldata name, address resolved) external {
        bytes32 namehash = keccak256(abi.encodePacked(name));
        address owner = _ownerOf[namehash];
        require(owner != address(0), "domain not registered");
        require(msg.sender == owner, "not domain owner");
        _resolves[namehash] = resolved;

        emit ResolveSet(namehash, resolved);
    }

    /// @notice Resolves a domain name to its mapped address.
    /// @param name The registered domain name (e.g. "alice").
    /// @return resolved The address that this name resolves to.
    function resolve(string calldata name) external view returns (address resolved) {
        bytes32 namehash = keccak256(abi.encodePacked(name));
        resolved = _resolves[namehash];
    }

    /// @notice Emitted when a domain's resolve target is updated.
    event ResolveSet(bytes32 indexed namehash, address indexed resolved);
}
