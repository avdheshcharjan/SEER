# CLAUDE_REQUIREMENTS.md

## Introduction
This document outlines the requirements for a swipe-based prediction market miniapp integrated within The Base App (TBA) ecosystem. The miniapp allows users to create binary prediction markets from their Farcaster social feed and participate in others' predictions through an intuitive swipe interface. Markets operate on a dynamic pricing model where winning shares resolve to $1 USDC, with prices floating between $0-$1 based on pool ratios, representing implied probability (similar to Polymarket).

## Requirements

### Requirement 1: Miniapp Integration with Farcaster Feed
**User Story:** As a **TBA user**, I want to **access prediction market creation from my Farcaster feed**, so that I can **seamlessly create predictions while browsing social content**.

#### Acceptance Criteria
1. **WHEN** a user taps the "Apps" button while composing a Farcaster post **THEN** the system **SHALL** display the Creator Studio overlay with "Create a Prediction" as a featured tool.
2. **WHEN** the user selects "Create a Prediction" **THEN** the system **SHALL** launch the prediction market miniapp within the TBA environment.
3. **WHEN** the miniapp is not available or fails to load **THEN** the system **SHALL** display an error message "Prediction app temporarily unavailable. Please try again later."

### Requirement 2: Prediction Market Creation Flow
**User Story:** As a **market creator**, I want to **quickly generate a prediction market through guided input**, so that I can **create markets without complex configuration**.

#### Acceptance Criteria
1. **WHEN** the miniapp opens from Creator Studio **THEN** the system **SHALL** display a chatbot interface requesting: ticker symbol, target price, direction (above/below), and resolution date/time.
2. **WHEN** all required fields are provided **THEN** the system **SHALL** generate a binary question format: "Will [TICKER] be [above/below] [PRICE] on [DATE] at [TIME]?"
3. **WHEN** the user confirms the prediction **THEN** the system **SHALL** deploy a smart contract on Base network and display a success confirmation with the market card.
4. **WHEN** smart contract deployment fails **THEN** the system **SHALL** display "Market creation failed. Please check your wallet balance and try again."

### Requirement 3: Market Smart Contract Implementation
**User Story:** As a **market participant**, I want to **trade shares that resolve to fixed values**, so that I can **understand my potential profit/loss clearly**.

#### Acceptance Criteria
1. **WHEN** a market resolves with the condition met **THEN** the system **SHALL** allow winning shareholders to redeem each share for exactly $1 USDC.
2. **WHEN** a user purchases shares **THEN** the system **SHALL** calculate price based on the formula: YES price = YES pool / (YES pool + NO pool).
3. **WHEN** shares are purchased or sold **THEN** the system **SHALL** update prices immediately to reflect new pool ratios.
4. **WHEN** market resolution time arrives **THEN** the system **SHALL** automatically fetch price data from a reliable oracle and resolve the market.

### Requirement 4: Farcaster Sharing Integration
**User Story:** As a **market creator**, I want to **share my prediction on Farcaster**, so that I can **attract participants to my market**.

#### Acceptance Criteria
1. **WHEN** a market is successfully created **THEN** the system **SHALL** display a "Share on Farcaster" button.
2. **WHEN** the share button is tapped **THEN** the system **SHALL** pre-populate a Farcaster post with "I predicted this..." and an embedded link to the prediction card.
3. **WHEN** other users click the embedded link **THEN** the system **SHALL** open the miniapp directly to that specific prediction market.

### Requirement 5: Swipe-Based Market Discovery
**User Story:** As a **market participant**, I want to **browse predictions through swiping**, so that I can **quickly discover and participate in markets**.

#### Acceptance Criteria
1. **WHEN** a user opens the app directly (not from Creator Studio) **THEN** the system **SHALL** display a full-screen swipe stack of active prediction cards.
2. **WHEN** a user swipes right on a card **THEN** the system **SHALL** open a purchase modal for YES shares with amount input.
3. **WHEN** a user swipes left on a card **THEN** the system **SHALL** open a purchase modal for NO shares with amount input.
4. **WHEN** a user swipes up **THEN** the system **SHALL** skip the current prediction and show the next one.
5. **WHEN** no more predictions are available **THEN** the system **SHALL** display "No more predictions. Check back later or create your own!"

### Requirement 6: User Portfolio Dashboard
**User Story:** As a **regular user**, I want to **view my prediction history and positions**, so that I can **track my performance and manage active positions**.

#### Acceptance Criteria
1. **WHEN** a user navigates to the home/portfolio tab **THEN** the system **SHALL** display two sections: "Created Markets" and "Your Positions".
2. **WHEN** viewing created markets **THEN** the system **SHALL** show total volume, current odds, time remaining, and participant count.
3. **WHEN** viewing positions **THEN** the system **SHALL** display shares owned, current value, potential profit/loss, and market status.
4. **WHEN** a market resolves **THEN** the system **SHALL** automatically update the position status and show claim button for winning shares.

### Requirement 7: Share Purchase and Trading
**User Story:** As a **market participant**, I want to **buy and sell prediction shares**, so that I can **profit from correct predictions or exit positions**.

#### Acceptance Criteria
1. **WHEN** a user confirms a share purchase **THEN** the system **SHALL** execute a Base network transaction using USDC from their connected wallet.
2. **WHEN** purchasing shares **THEN** the system **SHALL** display current price, shares received, and total cost including gas fees.
3. **WHEN** insufficient USDC balance **THEN** the system **SHALL** display "Insufficient USDC balance" with option to add funds.
4. **WHEN** a user owns shares **THEN** the system **SHALL** allow selling back to the pool at current market price.

### Requirement 8: Market Resolution and Settlement
**User Story:** As a **market participant**, I want to **automatically receive payouts**, so that I can **claim winnings without manual intervention**.

#### Acceptance Criteria
1. **WHEN** market resolution time is reached **THEN** the system **SHALL** fetch price data from designated oracle within 5 minutes.
2. **WHEN** oracle data is successfully retrieved **THEN** the system **SHALL** resolve market as YES or NO based on the condition.
3. **WHEN** a user holds winning shares **THEN** the system **SHALL** enable a "Claim Rewards" button to withdraw USDC.
4. **WHEN** oracle fails or returns ambiguous data **THEN** the system **SHALL** escalate to manual resolution with 24-hour dispute period.

### Requirement 9: Mobile-Optimized UI/UX
**User Story:** As a **mobile user**, I want to **use the app with touch gestures**, so that I can **interact naturally on my phone**.

#### Acceptance Criteria
1. **WHEN** viewing prediction cards **THEN** the system **SHALL** display cards in portrait full-screen format optimized for mobile viewing.
2. **WHEN** swiping **THEN** the system **SHALL** provide smooth animations with visual feedback (card tilt, color highlights).
3. **WHEN** a swipe gesture is initiated **THEN** the system **SHALL** show YES (green) or NO (red) visual indicators based on direction.
4. **WHEN** loading new cards **THEN** the system **SHALL** preload next 3 cards for seamless browsing experience.