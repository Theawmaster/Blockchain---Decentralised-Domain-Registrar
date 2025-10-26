// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "./interfaces/IRegistry.sol";

contract Registry is IRegistry {
    mapping(bytes32 => address) private _ownerOf;

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
}
