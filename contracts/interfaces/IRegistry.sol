// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

/// @title Registry interface for .ntu names
interface IRegistry {
    /// Emitted when a name is registered
    event NameRegistered(bytes32 indexed namehash, address indexed owner, string name);

    /// Register a validated name to an owner (name excludes ".ntu")
    function register(string calldata name, address owner) external;

    /// Resolve owner from a name (string form)
    function ownerOf(string calldata name) external view returns (address);
}
