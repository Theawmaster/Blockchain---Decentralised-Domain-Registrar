// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

/// @title Registry interface for .ntu name ownership and resolution
interface IRegistry {
    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------
    event NameRegistered(bytes32 indexed namehash, address indexed owner, string name);
    event ResolveSet(bytes32 indexed namehash, address resolved);

    /// -----------------------------------------------------------------------
    /// Core functions
    /// -----------------------------------------------------------------------
    function register(string calldata name, address owner) external;
    function ownerOf(bytes32 namehash) external view returns (address);
}
