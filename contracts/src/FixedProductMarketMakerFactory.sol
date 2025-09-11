// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./FixedProductMarketMaker.sol";

contract FixedProductMarketMakerFactory {
    event FixedProductMarketMakerCreation(
        address indexed creator,
        address fixedProductMarketMaker,
        address indexed conditionalTokens,
        address indexed collateralToken,
        bytes32[] conditionIds,
        uint fee
    );
    
    function createFixedProductMarketMaker(
        address conditionalTokens,
        address collateralToken,
        bytes32[] calldata conditionIds,
        uint fee
    ) external returns (address) {
        FixedProductMarketMaker fpmm = new FixedProductMarketMaker(
            conditionalTokens,
            collateralToken,
            conditionIds[0], // For simplicity, assume single condition
            fee
        );
        
        emit FixedProductMarketMakerCreation(
            msg.sender,
            address(fpmm),
            conditionalTokens,
            collateralToken,
            conditionIds,
            fee
        );
        
        return address(fpmm);
    }
}