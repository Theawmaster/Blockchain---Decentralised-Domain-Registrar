// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

import "./interfaces/IRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

error InvalidNameFormat();
error NameAlreadyRegistered();
error DomainNotRegistered();
error NotDomainOwner();

contract Registry is IRegistry, Ownable, Pausable {
    // namehash → owner
    mapping(bytes32 => address) private _ownerOf;

    // namehash → resolved address
    mapping(bytes32 => address) private _resolves;

    // namehash → original domain name (reverse lookup)
    mapping(bytes32 => string) private _nameOf;

    // List of registered names
    string[] private _allNames;

    constructor() Ownable(msg.sender) {}

    function _isValidName(string memory name) internal pure returns (bool) {
        bytes memory b = bytes(name);
        if (b.length < 3 || b.length > 63) return false;
        if (b[0] == "-" || b[b.length - 1] == "-") return false;
        for (uint256 i; i < b.length; i++) {
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

    function register(string calldata name, address owner)
        external
        override
        whenNotPaused
    {
        if (!_isValidName(name)) revert InvalidNameFormat();
        bytes32 namehash = keccak256(abi.encodePacked(name));
        if (_ownerOf[namehash] != address(0)) revert NameAlreadyRegistered();

        _ownerOf[namehash] = owner;
        _nameOf[namehash] = name;
        _allNames.push(name);

        emit NameRegistered(namehash, owner, name);
    }

    function ownerOf(bytes32 namehash)
        external
        view
        override
        returns (address)
    {
        return _ownerOf[namehash];
    }

    function resolve(string calldata name)
        external
        view
        returns (address resolved)
    {
        bytes32 namehash = keccak256(abi.encodePacked(name));
        return _resolves[namehash];
    }

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

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getAllNames() external view returns (string[] memory) {
        return _allNames;
    }

    /// NEW: Helpful for frontend — lookup name from hash
    function nameOf(bytes32 namehash) external view returns (string memory) {
        return _nameOf[namehash];
    }
}
