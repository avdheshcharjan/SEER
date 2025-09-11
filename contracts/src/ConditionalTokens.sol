// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ConditionalTokens {
    mapping(bytes32 => uint) public outcomeSlotCounts;
    mapping(bytes32 => bool) public conditionResolved;
    mapping(bytes32 => uint[]) public payouts;
    
    event ConditionPreparation(
        bytes32 indexed conditionId,
        address indexed oracle,
        bytes32 indexed questionId,
        uint outcomeSlotCount
    );
    
    event ConditionResolution(
        bytes32 indexed conditionId,
        address indexed oracle,
        bytes32 indexed questionId,
        uint outcomeSlotCount,
        uint[] payoutNumerators
    );
    
    function prepareCondition(
        address oracle,
        bytes32 questionId,
        uint outcomeSlotCount
    ) external {
        bytes32 conditionId = getConditionId(oracle, questionId, outcomeSlotCount);
        require(outcomeSlotCounts[conditionId] == 0, "Condition already prepared");
        
        outcomeSlotCounts[conditionId] = outcomeSlotCount;
        emit ConditionPreparation(conditionId, oracle, questionId, outcomeSlotCount);
    }
    
    function reportPayouts(bytes32 questionId, uint[] calldata _payouts) external {
        // In a real implementation, this would validate the oracle
        // For mock, we'll allow anyone to report
        bytes32 conditionId = keccak256(abi.encodePacked(questionId, _payouts.length));
        
        require(!conditionResolved[conditionId], "Condition already resolved");
        conditionResolved[conditionId] = true;
        payouts[conditionId] = _payouts;
        
        emit ConditionResolution(
            conditionId,
            msg.sender,
            questionId,
            _payouts.length,
            _payouts
        );
    }
    
    function getConditionId(
        address oracle,
        bytes32 questionId,
        uint outcomeSlotCount
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(oracle, questionId, outcomeSlotCount));
    }
    
    function getOutcomeSlotCount(bytes32 conditionId) external view returns (uint) {
        return outcomeSlotCounts[conditionId];
    }
    
    function getCollectionId(
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint indexSet
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(parentCollectionId, conditionId, indexSet));
    }
    
    function getPositionId(
        IERC20 collateralToken,
        bytes32 collectionId
    ) external pure returns (uint) {
        return uint(keccak256(abi.encodePacked(collateralToken, collectionId)));
    }
    
    function splitPosition(
        IERC20 collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint[] calldata partition,
        uint amount
    ) external {
        // Mock implementation - in reality this would mint ERC1155 tokens
        collateralToken.transferFrom(msg.sender, address(this), amount);
    }
    
    function mergePositions(
        IERC20 collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint[] calldata partition,
        uint amount
    ) external {
        // Mock implementation - in reality this would burn ERC1155 tokens
        collateralToken.transfer(msg.sender, amount);
    }
    
    function redeemPositions(
        IERC20 collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint[] calldata indexSets
    ) external {
        // Mock implementation - calculate and transfer winnings
        // For simplicity, assume user wins 1 USDC per winning outcome
        uint256 balance = collateralToken.balanceOf(address(this));
        uint256 winnings = balance > 1e6 ? 1e6 : balance; // 1 USDC or available balance
        
        if (winnings > 0) {
            collateralToken.transfer(msg.sender, winnings);
        }
    }
}