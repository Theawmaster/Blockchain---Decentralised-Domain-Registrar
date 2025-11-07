// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────────────────────────────────────
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title NameToken
/// @notice Minimal placeholder contract for NameToken.
/// @dev Currently provides version metadata only; extendable for ERC-721/1155 token logic later.
contract NameToken {
    /// @notice Returns the version string of the NameToken contract.
    /// @dev Useful for frontend or backend integration checks.
    /// @return The current contract version.
    function version() external pure returns (string memory) {
        return "nametoken-0.0.1";
    }
}
