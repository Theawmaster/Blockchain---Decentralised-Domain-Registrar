// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

interface IRegistry {
    event NameRegistered(bytes32 indexed namehash, address indexed owner, string name);

    function register(string calldata name, address owner) external;
    function registerByHash(bytes32 namehash, address owner) external;

    function ownerOf(bytes32 namehash) external view returns (address);
}
