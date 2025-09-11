// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract FixedProductMarketMaker is ReentrancyGuard {
    address public conditionalTokens;
    IERC20 public collateralToken;
    bytes32 public conditionId;
    uint public fee;
    
    // Pool reserves (YES, NO)
    uint[2] public reserves;
    uint public totalSupply;
    mapping(address => uint) public balanceOf;
    
    event Buy(address indexed buyer, uint outcomeIndex, uint investmentAmount, uint outcomeTokensBought);
    event Sell(address indexed seller, uint outcomeIndex, uint returnAmount, uint outcomeTokensSold);
    event FundingAdded(address indexed funder, uint[] amountsAdded, uint sharesMinted);
    event FundingRemoved(address indexed funder, uint sharesBurned, uint[] amountsRemoved);
    
    constructor(
        address _conditionalTokens,
        address _collateralToken,
        bytes32 _conditionId,
        uint _fee
    ) {
        conditionalTokens = _conditionalTokens;
        collateralToken = IERC20(_collateralToken);
        conditionId = _conditionId;
        fee = _fee;
        
        // Initialize with minimal liquidity to avoid division by zero
        reserves[0] = 1000;
        reserves[1] = 1000;
    }
    
    function buy(
        uint investmentAmount,
        uint outcomeIndex,
        uint minOutcomeTokensToBuy
    ) external nonReentrant {
        require(outcomeIndex < 2, "Invalid outcome index");
        require(investmentAmount > 0, "Investment must be positive");
        
        // Calculate outcome tokens to buy using constant product formula
        uint outcomeTokensBought = calcBuyAmount(investmentAmount, outcomeIndex);
        require(outcomeTokensBought >= minOutcomeTokensToBuy, "Slippage too high");
        
        // Transfer USDC from buyer
        collateralToken.transferFrom(msg.sender, address(this), investmentAmount);
        
        // Update reserves
        reserves[outcomeIndex] += investmentAmount;
        
        emit Buy(msg.sender, outcomeIndex, investmentAmount, outcomeTokensBought);
    }
    
    function sell(
        uint returnAmount,
        uint outcomeIndex,
        uint maxOutcomeTokensToSell
    ) external nonReentrant {
        require(outcomeIndex < 2, "Invalid outcome index");
        require(returnAmount > 0, "Return amount must be positive");
        
        uint outcomeTokensToSell = calcSellAmount(returnAmount, outcomeIndex);
        require(outcomeTokensToSell <= maxOutcomeTokensToSell, "Slippage too high");
        require(reserves[outcomeIndex] >= returnAmount, "Insufficient liquidity");
        
        // Update reserves
        reserves[outcomeIndex] -= returnAmount;
        
        // Transfer USDC to seller
        collateralToken.transfer(msg.sender, returnAmount);
        
        emit Sell(msg.sender, outcomeIndex, returnAmount, outcomeTokensToSell);
    }
    
    function addFunding(
        uint addedFunds,
        uint[] calldata distributionHint
    ) external nonReentrant {
        require(addedFunds > 0, "Added funds must be positive");
        require(distributionHint.length == 2, "Distribution hint must have 2 elements");
        
        // Transfer funds from funder
        collateralToken.transferFrom(msg.sender, address(this), addedFunds);
        
        // Add to reserves based on distribution hint
        uint total = distributionHint[0] + distributionHint[1];
        uint amount0 = (addedFunds * distributionHint[0]) / total;
        uint amount1 = addedFunds - amount0;
        
        reserves[0] += amount0;
        reserves[1] += amount1;
        
        // Mint LP tokens (simplified)
        uint sharesMinted = addedFunds;
        balanceOf[msg.sender] += sharesMinted;
        totalSupply += sharesMinted;
        
        uint[] memory amountsAdded = new uint[](2);
        amountsAdded[0] = amount0;
        amountsAdded[1] = amount1;
        
        emit FundingAdded(msg.sender, amountsAdded, sharesMinted);
    }
    
    function removeFunding(uint sharesToBurn) external nonReentrant {
        require(sharesToBurn > 0, "Shares to burn must be positive");
        require(balanceOf[msg.sender] >= sharesToBurn, "Insufficient shares");
        
        uint proportion = (sharesToBurn * 1e18) / totalSupply;
        uint amount0 = (reserves[0] * proportion) / 1e18;
        uint amount1 = (reserves[1] * proportion) / 1e18;
        
        // Update state
        balanceOf[msg.sender] -= sharesToBurn;
        totalSupply -= sharesToBurn;
        reserves[0] -= amount0;
        reserves[1] -= amount1;
        
        // Transfer funds back
        collateralToken.transfer(msg.sender, amount0 + amount1);
        
        uint[] memory amountsRemoved = new uint[](2);
        amountsRemoved[0] = amount0;
        amountsRemoved[1] = amount1;
        
        emit FundingRemoved(msg.sender, sharesToBurn, amountsRemoved);
    }
    
    function calcBuyAmount(
        uint investmentAmount,
        uint outcomeIndex
    ) public view returns (uint) {
        require(outcomeIndex < 2, "Invalid outcome index");
        
        // Simplified constant product formula: x * y = k
        // When buying outcome 0: new_reserve0 = reserve0 + investment
        // tokens_bought = reserve1 * investment / (reserve0 + investment)
        uint otherIndex = 1 - outcomeIndex;
        return (reserves[otherIndex] * investmentAmount) / (reserves[outcomeIndex] + investmentAmount);
    }
    
    function calcSellAmount(
        uint returnAmount,
        uint outcomeIndex
    ) public view returns (uint) {
        require(outcomeIndex < 2, "Invalid outcome index");
        
        // Reverse calculation for selling
        uint otherIndex = 1 - outcomeIndex;
        return (returnAmount * reserves[otherIndex]) / (reserves[outcomeIndex] - returnAmount);
    }
    
    function calcMarginalPrice(uint outcomeIndex) external view returns (uint) {
        require(outcomeIndex < 2, "Invalid outcome index");
        
        uint total = reserves[0] + reserves[1];
        return (reserves[outcomeIndex] * 1e18) / total;
    }
}