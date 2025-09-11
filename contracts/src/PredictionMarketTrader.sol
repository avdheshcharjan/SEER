// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./GnosisPredictionMarketFactory.sol";

contract PredictionMarketTrader is ReentrancyGuard {
    GnosisPredictionMarketFactory public immutable factory;
    IConditionalTokens public immutable conditionalTokens;
    IERC20 public immutable collateralToken;
    
    // ERC-4337 compatibility
    address public constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
    
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _entryPointReentrancyStatus;
    
    // Events
    event BetPlaced(
        address indexed user,
        bytes32 indexed conditionId,
        bool outcome,
        uint256 amount,
        uint256 shares
    );
    
    event RewardsClaimed(
        address indexed user,
        bytes32 indexed conditionId,
        uint256 amount
    );
    
    // Errors
    error InvalidAmount();
    error MarketNotFound();
    error MarketEnded();
    error MarketNotResolved();
    error MarketAlreadyResolved();
    error InsufficientShares();
    
    modifier onlyActiveMarket(bytes32 conditionId) {
        GnosisPredictionMarketFactory.Market memory market = factory.getMarket(conditionId);
        if (market.creator == address(0)) revert MarketNotFound();
        if (block.timestamp >= market.endTime) revert MarketEnded();
        if (market.resolved) revert MarketAlreadyResolved();
        _;
    }
    
    modifier onlyResolvedMarket(bytes32 conditionId) {
        GnosisPredictionMarketFactory.Market memory market = factory.getMarket(conditionId);
        if (market.creator == address(0)) revert MarketNotFound();
        if (!market.resolved) revert MarketNotResolved();
        _;
    }
    
    modifier entryPointReentrancyGuard() {
        if (_entryPointReentrancyStatus == _ENTERED) {
            revert("EntryPoint reentrancy");
        }
        _entryPointReentrancyStatus = _ENTERED;
        _;
        _entryPointReentrancyStatus = _NOT_ENTERED;
    }
    
    constructor(
        address _factory,
        address _conditionalTokens,
        address _collateralToken
    ) {
        factory = GnosisPredictionMarketFactory(_factory);
        conditionalTokens = IConditionalTokens(_conditionalTokens);
        collateralToken = IERC20(_collateralToken);
        _entryPointReentrancyStatus = _NOT_ENTERED;
    }
    
    function placeBet(
        bytes32 conditionId,
        bool outcome, // true for YES, false for NO
        uint256 amount
    ) external 
      nonReentrant 
      entryPointReentrancyGuard 
      onlyActiveMarket(conditionId) 
      returns (uint256 shares) 
    {
        if (amount == 0) revert InvalidAmount();
        
        GnosisPredictionMarketFactory.Market memory market = factory.getMarket(conditionId);
        
        // Transfer USDC from user
        collateralToken.transferFrom(msg.sender, address(this), amount);
        collateralToken.approve(market.fpmm, amount);
        
        // Calculate minimum shares expected (with 1% slippage tolerance)
        uint256 expectedShares = IFixedProductMarketMaker(market.fpmm).calcBuyAmount(
            amount, 
            outcome ? 0 : 1
        );
        uint256 minShares = (expectedShares * 99) / 100;
        
        // Buy outcome tokens through FPMM
        IFixedProductMarketMaker(market.fpmm).buy(
            amount,
            outcome ? 0 : 1,
            minShares
        );
        
        shares = expectedShares; // Return expected shares for simplicity
        
        emit BetPlaced(msg.sender, conditionId, outcome, amount, shares);
    }
    
    function claimRewards(
        bytes32 conditionId
    ) external 
      nonReentrant 
      entryPointReentrancyGuard 
      onlyResolvedMarket(conditionId) 
      returns (uint256 payout) 
    {
        // Redeem winning positions through ConditionalTokens
        uint[] memory indexSets = new uint[](2);
        indexSets[0] = 1; // YES outcome
        indexSets[1] = 2; // NO outcome
        
        // Get user's balance before redemption
        uint256 balanceBefore = collateralToken.balanceOf(msg.sender);
        
        // Redeem positions (this will automatically transfer winnings)
        conditionalTokens.redeemPositions(
            collateralToken,
            bytes32(0), // parent collection ID
            conditionId,
            indexSets
        );
        
        // Calculate payout
        payout = collateralToken.balanceOf(msg.sender) - balanceBefore;
        
        emit RewardsClaimed(msg.sender, conditionId, payout);
    }
    
    function getBetQuote(
        bytes32 conditionId,
        bool outcome,
        uint256 amount
    ) external view returns (uint256 expectedShares) {
        GnosisPredictionMarketFactory.Market memory market = factory.getMarket(conditionId);
        if (market.creator == address(0)) return 0;
        
        try IFixedProductMarketMaker(market.fpmm).calcBuyAmount(
            amount,
            outcome ? 0 : 1
        ) returns (uint256 shares) {
            return shares;
        } catch {
            return 0;
        }
    }
    
    function getCurrentOdds(
        bytes32 conditionId
    ) external view returns (uint256 yesPrice, uint256 noPrice) {
        GnosisPredictionMarketFactory.Market memory market = factory.getMarket(conditionId);
        if (market.creator == address(0)) return (0, 0);
        
        // Get marginal prices from FPMM
        // This is a simplified version - actual implementation would call FPMM's calcMarginalPrice
        try IFixedProductMarketMaker(market.fpmm).calcBuyAmount(1e6, 0) returns (uint256 yesShares) {
            yesPrice = (1e18 * 1e6) / (1e6 + yesShares); // Approximate price calculation
            noPrice = 1e18 - yesPrice;
        } catch {
            yesPrice = 5e17; // Default to 50%
            noPrice = 5e17;
        }
    }
    
    function estimateGasForBet(
        bytes32 conditionId,
        bool outcome,
        uint256 amount
    ) external view returns (uint256 gasEstimate) {
        // Base gas for FPMM interaction and transfers
        gasEstimate = 150000;
        
        // Additional gas for first-time approvals
        if (collateralToken.allowance(msg.sender, address(this)) < amount) {
            gasEstimate += 50000;
        }
        
        return gasEstimate;
    }
    
    function isSmartWallet() external view returns (bool) {
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(caller())
        }
        return codeSize > 0;
    }
}