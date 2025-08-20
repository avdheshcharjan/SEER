// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockUSDC
/// @notice A mock USDC token for testing prediction markets on Base Sepolia
/// @dev Implements 6 decimal places like real USDC and includes a faucet function
contract MockUSDC is ERC20, Ownable {
    
    uint8 private constant DECIMALS = 6;
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**DECIMALS; // 1000 USDC per request
    uint256 public constant FAUCET_COOLDOWN = 24 hours;
    
    mapping(address => uint256) public lastFaucetRequest;
    
    event FaucetUsed(address indexed user, uint256 amount);
    
    error FaucetCooldownActive(uint256 timeRemaining);
    error InvalidAmount();
    
    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {
        // Mint initial supply to deployer for liquidity
        _mint(msg.sender, 1_000_000 * 10**DECIMALS); // 1M USDC
    }
    
    /// @notice Override decimals to match USDC (6 decimals)
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /// @notice Faucet function - gives users free USDC for testing
    /// @dev Limited to once per 24 hours per address
    function faucet() external {
        uint256 timeSinceLastRequest = block.timestamp - lastFaucetRequest[msg.sender];
        
        if (timeSinceLastRequest < FAUCET_COOLDOWN) {
            revert FaucetCooldownActive(FAUCET_COOLDOWN - timeSinceLastRequest);
        }
        
        lastFaucetRequest[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetUsed(msg.sender, FAUCET_AMOUNT);
    }
    
    /// @notice Admin function to mint tokens to any address
    /// @param to Address to mint tokens to
    /// @param amount Amount of tokens to mint (in wei, considering 6 decimals)
    function mint(address to, uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        _mint(to, amount);
    }
    
    /// @notice Admin function to airdrop tokens to multiple addresses
    /// @param recipients Array of addresses to receive tokens
    /// @param amounts Array of amounts to mint (must match recipients length)
    function airdrop(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            if (amounts[i] > 0) {
                _mint(recipients[i], amounts[i]);
            }
        }
    }
    
    /// @notice Get time remaining until user can use faucet again
    /// @param user Address to check
    /// @return timeRemaining Seconds until faucet is available (0 if available now)
    function getFaucetCooldown(address user) external view returns (uint256 timeRemaining) {
        uint256 timeSinceLastRequest = block.timestamp - lastFaucetRequest[user];
        
        if (timeSinceLastRequest >= FAUCET_COOLDOWN) {
            return 0;
        }
        
        return FAUCET_COOLDOWN - timeSinceLastRequest;
    }
    
    /// @notice Check if user can use faucet
    /// @param user Address to check
    /// @return available true if faucet is available
    function canUseFaucet(address user) external view returns (bool available) {
        return block.timestamp - lastFaucetRequest[user] >= FAUCET_COOLDOWN;
    }
    
    /// @notice Convenient function to get USDC amount in human readable format
    /// @param amount Amount in wei (6 decimals)
    /// @return humanAmount Amount divided by 10^6 for display
    function toHumanAmount(uint256 amount) external pure returns (uint256 humanAmount) {
        return amount / 10**DECIMALS;
    }
    
    /// @notice Convert human readable amount to wei format
    /// @param humanAmount Amount in normal units (e.g., 100 for 100 USDC)
    /// @return weiAmount Amount multiplied by 10^6
    function fromHumanAmount(uint256 humanAmount) external pure returns (uint256 weiAmount) {
        return humanAmount * 10**DECIMALS;
    }
}