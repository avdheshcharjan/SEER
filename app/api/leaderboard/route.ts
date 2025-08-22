import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') || '10';
        const sortBy = searchParams.get('sortBy') || 'winRate'; // winRate, totalSpent, totalPredictions

        // Mock leaderboard data - in real implementation, fetch from database
        const leaderboard = [
            {
                id: '1',
                address: '0x1234...5678',
                username: 'CryptoProphet',
                correctPredictions: 89,
                totalPredictions: 112,
                totalSpent: 112,
                rank: 1,
                winRate: 79.5,
                joinedAt: '2024-01-15T10:30:00Z',
            },
            {
                id: '2',
                address: '0xabcd...efgh',
                username: 'BasedTrader',
                correctPredictions: 76,
                totalPredictions: 98,
                totalSpent: 98,
                rank: 2,
                winRate: 77.6,
                joinedAt: '2024-01-20T14:15:00Z',
            },
            {
                id: '3',
                address: '0x9876...5432',
                username: 'SwipeKing',
                correctPredictions: 134,
                totalPredictions: 178,
                totalSpent: 178,
                rank: 3,
                winRate: 75.3,
                joinedAt: '2024-01-10T09:45:00Z',
            },
            {
                id: '4',
                address: '0xdef0...1234',
                username: 'PredictorMax',
                correctPredictions: 92,
                totalPredictions: 125,
                totalSpent: 125,
                rank: 4,
                winRate: 73.6,
                joinedAt: '2024-01-25T16:20:00Z',
            },
            {
                id: '5',
                address: '0x5678...9abc',
                username: 'MarketMaven',
                correctPredictions: 67,
                totalPredictions: 92,
                totalSpent: 92,
                rank: 5,
                winRate: 72.8,
                joinedAt: '2024-02-01T11:10:00Z',
            },
            {
                id: '6',
                address: '0xfeed...beef',
                username: 'ChainChaser',
                correctPredictions: 45,
                totalPredictions: 63,
                totalSpent: 63,
                rank: 6,
                winRate: 71.4,
                joinedAt: '2024-02-05T13:30:00Z',
            },
            {
                id: '7',
                address: '0xcafe...babe',
                username: 'BlockBetter',
                correctPredictions: 38,
                totalPredictions: 54,
                totalSpent: 54,
                rank: 7,
                winRate: 70.4,
                joinedAt: '2024-02-10T08:45:00Z',
            },
            {
                id: '8',
                address: '0xdead...code',
                username: 'TokenTiger',
                correctPredictions: 52,
                totalPredictions: 75,
                totalSpent: 75,
                rank: 8,
                winRate: 69.3,
                joinedAt: '2024-02-15T12:20:00Z',
            },
            {
                id: '9',
                address: '0xbeef...feed',
                username: 'CryptoSeer',
                correctPredictions: 29,
                totalPredictions: 42,
                totalSpent: 42,
                rank: 9,
                winRate: 69.0,
                joinedAt: '2024-02-20T15:15:00Z',
            },
            {
                id: '10',
                address: '0x1337...h4x0r',
                username: 'DeFiDegen',
                correctPredictions: 41,
                totalPredictions: 60,
                totalSpent: 60,
                rank: 10,
                winRate: 68.3,
                joinedAt: '2024-02-25T10:00:00Z',
            },
        ];

        // Sort by specified criteria
        let sortedLeaderboard = [...leaderboard];
        switch (sortBy) {
            case 'totalSpent':
                sortedLeaderboard.sort((a, b) => b.totalSpent - a.totalSpent);
                break;
            case 'totalPredictions':
                sortedLeaderboard.sort((a, b) => b.totalPredictions - a.totalPredictions);
                break;
            case 'winRate':
            default:
                sortedLeaderboard.sort((a, b) => b.winRate - a.winRate);
                break;
        }

        // Update ranks after sorting
        sortedLeaderboard = sortedLeaderboard.map((user, index) => ({
            ...user,
            rank: index + 1,
        }));

        // Apply limit
        const limitedLeaderboard = sortedLeaderboard.slice(0, parseInt(limit));

        return NextResponse.json({
            success: true,
            data: limitedLeaderboard,
            total: sortedLeaderboard.length,
            sortBy,
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch leaderboard' },
            { status: 500 }
        );
    }
}
