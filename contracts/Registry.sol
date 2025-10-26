// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IRegistry.sol";

contract Registry is IRegistry {
    // ---------- Storage ----------
    // namehash => owner
    mapping(bytes32 => address) private _ownerOf;

    // ---------- Internal: name normalization ----------
    function _isValidName(string memory name) internal pure returns (bool) {
        bytes memory b = bytes(name);
        if (b.length < 3 || b.length > 63) return false;
        if (b[0] == "-" || b[b.length - 1] == "-") return false;
        for (uint i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            if (
                !(c >= 0x61 && c <= 0x7A) && // a-z
                !(c >= 0x30 && c <= 0x39) && // 0-9
                !(c == 0x2D)                 // '-'
            ) return false;
            if (i > 0 && b[i - 1] == 0x2D && c == 0x2D) return false; // no "--"
        }
        return true;
    }

    // ---------- IRegistry ----------
    function register(string calldata name, address owner) external override {
        require(_isValidName(name), "invalid name format");
        bytes32 namehash = keccak256(abi.encodePacked(name));
        require(_ownerOf[namehash] == address(0), "already registered");
        _ownerOf[namehash] = owner;
        emit NameRegistered(namehash, owner, name);
    }

    function ownerOf(string calldata name) external view override returns (address) {
        bytes32 namehash = keccak256(abi.encodePacked(name));
        return _ownerOf[namehash];
    }
}
