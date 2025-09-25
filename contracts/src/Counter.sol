// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title Counter
/// @notice A simple counter contract for testing purposes
contract Counter {
    uint256 public number;

    function setNumber(uint256 newNumber) public {
        number = newNumber;
    }

    function increment() public {
        number++;
    }
}
