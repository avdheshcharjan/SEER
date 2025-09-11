// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interface for Gnosis ConditionalTokens (compatible with 0.5.x version)
interface IConditionalTokens {
    function prepareCondition(address oracle, bytes32 questionId, uint outcomeSlotCount) external;
    function reportPayouts(bytes32 questionId, uint[] calldata payouts) external;
    function getConditionId(address oracle, bytes32 questionId, uint outcomeSlotCount) external pure returns (bytes32);
    function getOutcomeSlotCount(bytes32 conditionId) external view returns (uint);
    function getCollectionId(bytes32 parentCollectionId, bytes32 conditionId, uint indexSet) external view returns (bytes32);
    function getPositionId(IERC20 collateralToken, bytes32 collectionId) external pure returns (uint);
    function splitPosition(IERC20 collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint[] calldata partition, uint amount) external;
    function mergePositions(IERC20 collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint[] calldata partition, uint amount) external;
    function redeemPositions(IERC20 collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint[] calldata indexSets) external;
}

// Interface for Gnosis FPMM Factory
interface IFixedProductMarketMakerFactory {
    function createFixedProductMarketMaker(
        address conditionalTokens,
        address collateralToken,
        bytes32[] calldata conditionIds,
        uint fee
    ) external returns (address);
}

// Interface for Gnosis FPMM
interface IFixedProductMarketMaker {
    function buy(uint investmentAmount, uint outcomeIndex, uint minOutcomeTokensToBuy) external;
    function sell(uint returnAmount, uint outcomeIndex, uint maxOutcomeTokensToSell) external;
    function addFunding(uint addedFunds, uint[] calldata distributionHint) external;
    function removeFunding(uint sharesToBurn) external;
    function calcBuyAmount(uint investmentAmount, uint outcomeIndex) external view returns (uint);
    function calcSellAmount(uint returnAmount, uint outcomeIndex) external view returns (uint);
}

contract GnosisPredictionMarketFactory is Ownable, ReentrancyGuard {
    IConditionalTokens public immutable conditionalTokens;
    IFixedProductMarketMakerFactory public immutable fpmmFactory;
    IERC20 public immutable collateralToken; // USDC
    
    // Market tracking
    struct Market {
        bytes32 conditionId;
        address fpmm;
        string question;
        uint256 endTime;
        address oracle;
        bool resolved;
        address creator;
        uint256 createdAt;
    }
    
    mapping(bytes32 => Market) public markets;
    mapping(address => bytes32[]) public creatorMarkets;
    mapping(bytes32 => bytes32) public questionIds; // conditionId => questionId
    bytes32[] public allMarkets;
    
    // Constants
    uint256 public constant MINIMUM_INITIAL_LIQUIDITY = 100e6; // 100 USDC
    uint256 public constant OUTCOME_COUNT = 2; // Binary markets only
    
    // Events
    event MarketCreated(
        bytes32 indexed conditionId,
        address indexed fpmm,
        address indexed creator,
        string question,
        uint256 endTime,
        address oracle
    );
    
    event MarketResolved(
        bytes32 indexed conditionId,
        uint[] payouts
    );
    
    // Errors
    error InvalidEndTime();
    error InvalidOracle();
    error InsufficientInitialLiquidity();
    error MarketAlreadyExists();
    error MarketDoesNotExist();
    error MarketNotEnded();
    error UnauthorizedResolver();
    error MarketAlreadyResolved();
    error InvalidOutcomeSlotCount();
    
    constructor(
        address _conditionalTokens,
        address _fpmmFactory,
        address _collateralToken
    ) Ownable(msg.sender) {
        conditionalTokens = IConditionalTokens(_conditionalTokens);
        fpmmFactory = IFixedProductMarketMakerFactory(_fpmmFactory);
        collateralToken = IERC20(_collateralToken);
    }
    
    function createMarket(
        string memory question,
        uint256 endTime,
        address oracle,
        uint256 initialLiquidity
    ) external nonReentrant returns (bytes32 conditionId, address fpmm) {
        if (endTime <= block.timestamp + 1 hours) revert InvalidEndTime();
        if (oracle == address(0)) revert InvalidOracle();
        if (initialLiquidity < MINIMUM_INITIAL_LIQUIDITY) revert InsufficientInitialLiquidity();
        
        // Create unique question ID
        bytes32 questionId = keccak256(abi.encodePacked(question, block.timestamp, msg.sender));
        conditionId = conditionalTokens.getConditionId(oracle, questionId, OUTCOME_COUNT);
        
        if (markets[conditionId].creator != address(0)) revert MarketAlreadyExists();
        
        // Prepare condition on ConditionalTokens
        conditionalTokens.prepareCondition(oracle, questionId, OUTCOME_COUNT);
        
        // Create FPMM 
        bytes32[] memory conditionIds = new bytes32[](1);
        conditionIds[0] = conditionId;
        
        fpmm = fpmmFactory.createFixedProductMarketMaker(
            address(conditionalTokens),
            address(collateralToken),
            conditionIds,
            0 // 0% fee for now
        );
        
        // Add initial liquidity to FPMM
        if (initialLiquidity > 0) {
            collateralToken.transferFrom(msg.sender, address(this), initialLiquidity);
            collateralToken.approve(fpmm, initialLiquidity);
            
            uint256[] memory distributionHint = new uint256[](2);
            distributionHint[0] = 1;
            distributionHint[1] = 1; // Equal initial distribution (50/50 odds)
            
            IFixedProductMarketMaker(fpmm).addFunding(initialLiquidity, distributionHint);
        }
        
        // Store market data
        markets[conditionId] = Market({
            conditionId: conditionId,
            fpmm: fpmm,
            question: question,
            endTime: endTime,
            oracle: oracle,
            resolved: false,
            creator: msg.sender,
            createdAt: block.timestamp
        });
        
        creatorMarkets[msg.sender].push(conditionId);
        allMarkets.push(conditionId);
        
        // Store questionId for resolution
        questionIds[conditionId] = questionId;
        
        emit MarketCreated(conditionId, fpmm, msg.sender, question, endTime, oracle);
    }
    
    function resolveMarket(
        bytes32 conditionId,
        bool outcome
    ) external nonReentrant {
        Market storage market = markets[conditionId];
        if (market.creator == address(0)) revert MarketDoesNotExist();
        if (block.timestamp < market.endTime) revert MarketNotEnded();
        if (msg.sender != market.oracle && msg.sender != owner()) revert UnauthorizedResolver();
        if (market.resolved) revert MarketAlreadyResolved();
        
        // Create payout vector: [1,0] for YES, [0,1] for NO
        uint[] memory payouts = new uint[](2);
        if (outcome) {
            payouts[0] = 1; // YES wins
            payouts[1] = 0;
        } else {
            payouts[0] = 0;
            payouts[1] = 1; // NO wins
        }
        
        // Report payouts to ConditionalTokens
        conditionalTokens.reportPayouts(
            questionIds[conditionId],
            payouts
        );
        
        market.resolved = true;
        
        emit MarketResolved(conditionId, payouts);
    }
    
    // View functions
    function getMarket(bytes32 conditionId) external view returns (Market memory) {
        return markets[conditionId];
    }
    
    function getMarketCount() external view returns (uint256) {
        return allMarkets.length;
    }
    
    function getMarkets(uint256 offset, uint256 limit) 
        external 
        view 
        returns (Market[] memory result) 
    {
        uint256 length = allMarkets.length;
        if (offset >= length) return new Market[](0);
        
        uint256 end = offset + limit;
        if (end > length) end = length;
        
        result = new Market[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = markets[allMarkets[i]];
        }
    }
    
    function getActiveMarkets(uint256 limit) 
        external 
        view 
        returns (Market[] memory result) 
    {
        uint256 count = 0;
        uint256 length = allMarkets.length;
        
        // Count active markets
        for (uint256 i = 0; i < length && count < limit; i++) {
            bytes32 conditionId = allMarkets[i];
            Market storage market = markets[conditionId];
            if (block.timestamp < market.endTime && !market.resolved) {
                count++;
            }
        }
        
        if (count == 0) return new Market[](0);
        
        result = new Market[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < length && index < count; i++) {
            bytes32 conditionId = allMarkets[i];
            Market storage market = markets[conditionId];
            if (block.timestamp < market.endTime && !market.resolved) {
                result[index] = market;
                index++;
            }
        }
    }
    
    function getCreatorMarkets(address creator) 
        external 
        view 
        returns (Market[] memory result) 
    {
        bytes32[] memory conditionIds = creatorMarkets[creator];
        result = new Market[](conditionIds.length);
        
        for (uint256 i = 0; i < conditionIds.length; i++) {
            result[i] = markets[conditionIds[i]];
        }
    }
    
    
    // Admin functions
    function emergencyResolve(
        bytes32 conditionId,
        bool outcome
    ) external onlyOwner {
        Market storage market = markets[conditionId];
        if (market.creator == address(0)) revert MarketDoesNotExist();
        if (market.resolved) revert MarketAlreadyResolved();
        
        uint[] memory payouts = new uint[](2);
        if (outcome) {
            payouts[0] = 1;
            payouts[1] = 0;
        } else {
            payouts[0] = 0;
            payouts[1] = 1;
        }
        
        conditionalTokens.reportPayouts(
            questionIds[conditionId],
            payouts
        );
        
        market.resolved = true;
        emit MarketResolved(conditionId, payouts);
    }
}