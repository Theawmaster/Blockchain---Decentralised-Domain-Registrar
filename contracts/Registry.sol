// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Strings.sol";

contract Registry {
    mapping(bytes32 => address) private _ownerOf;
    event NameRegistered(bytes32 indexed namehash, address indexed owner);

    function register(bytes32 namehash, address owner) external {
        require(_ownerOf[namehash] == address(0), "already registered");
        _ownerOf[namehash] = owner;
        emit NameRegistered(namehash, owner);
    }

    function ownerOf(bytes32 namehash) external view returns (address) {
        return _ownerOf[namehash];
    }
}
