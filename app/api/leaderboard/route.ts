import { NextRequest, NextResponse } from 'next/server';
import SupabaseService from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10');
        const sortBy = searchParams.get('sortBy') || 'winRate'; // winRate, totalSpent, totalPredictions, currentStreak
        const realTime = searchParams.get('realTime') === 'true';

        // Try to get real data from Supabase first
        let leaderboard;
        try {
            const sortMapping = {
                'winRate': 'win_rate',
                'totalSpent': 'total_volume',
                'totalPredictions': 'total_predictions',
                'currentStreak': 'current_streak',
                'profitLoss': 'profit_loss'
            };
            const mapped = sortMapping[sortBy as keyof typeof sortMapping] || 'win_rate';
            // Supabase service only accepts these specific sort keys
            const dbSortBy = (mapped === 'total_volume' ? 'profit_loss' : mapped) as 'win_rate' | 'total_predictions' | 'current_streak' | 'profit_loss';

            const realData = await SupabaseService.getLeaderboard(limit, dbSortBy);

            if (realData && realData.length > 0) {
                // Transform database data to match expected format
                leaderboard = realData.map((user, index) => ({
                    id: user.id,
                    address: user.wallet_address || user.id,
                    username: user.handle || user.name || `User${user.id.slice(0, 6)}`,
                    correctPredictions: Math.floor(user.total_predictions * (user.win_rate / 100)),
                    totalPredictions: user.total_predictions,
                    totalSpent: parseInt(user.total_volume) || 0,
                    rank: index + 1,
                    winRate: user.win_rate,
                    currentStreak: user.current_streak,
                    bestStreak: user.best_streak,
                    profitLoss: user.profit_loss,
                    joinedAt: user.created_at || new Date().toISOString(),
                }));
            } else {
                throw new Error('No real data available');
            }
        } catch (dbError) {
            console.log('Using mock data, database error:', dbError);
            // Fallback to enhanced mock data
            leaderboard = [
                {
                    id: '1',
                    address: '0x1234...5678',
                    username: 'CryptoProphet',
                    correctPredictions: 89,
                    totalPredictions: 112,
                    totalSpent: 112,
                    rank: 1,
                    winRate: 79.5,
                    currentStreak: 12,
                    bestStreak: 18,
                    profitLoss: 45.50,
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
                    currentStreak: 8,
                    bestStreak: 15,
                    profitLoss: 32.80,
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
                    currentStreak: 15,
                    bestStreak: 22,
                    profitLoss: 67.20,
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
                    currentStreak: 5,
                    bestStreak: 11,
                    profitLoss: 28.75,
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
                    currentStreak: 3,
                    bestStreak: 9,
                    profitLoss: 18.40,
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
                    currentStreak: 20,
                    bestStreak: 25,
                    profitLoss: 15.60,
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
                    currentStreak: 1,
                    bestStreak: 6,
                    profitLoss: 8.10,
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
                    currentStreak: 7,
                    bestStreak: 12,
                    profitLoss: 22.50,
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
                    currentStreak: 4,
                    bestStreak: 7,
                    profitLoss: 12.60,
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
                    currentStreak: 2,
                    bestStreak: 8,
                    profitLoss: 15.20,
                    joinedAt: '2024-02-25T10:00:00Z',
                },
            ];
        }

        // Sort by specified criteria
        let sortedLeaderboard = [...leaderboard];
        switch (sortBy) {
            case 'totalSpent':
                sortedLeaderboard.sort((a, b) => b.totalSpent - a.totalSpent);
                break;
            case 'totalPredictions':
                sortedLeaderboard.sort((a, b) => b.totalPredictions - a.totalPredictions);
                break;
            case 'currentStreak':
                sortedLeaderboard.sort((a, b) => b.currentStreak - a.currentStreak);
                break;
            case 'profitLoss':
                sortedLeaderboard.sort((a, b) => b.profitLoss - a.profitLoss);
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
        const limitedLeaderboard = sortedLeaderboard.slice(0, limit ? parseInt(String(limit)) : sortedLeaderboard.length);

        return NextResponse.json({
            success: true,
            data: limitedLeaderboard,
            total: sortedLeaderboard.length,
            sortBy,
            realTime: realTime,
            timestamp: new Date().toISOString(),
            globalStats: {
                totalUsers: sortedLeaderboard.length,
                totalPredictions: sortedLeaderboard.reduce((sum, user) => sum + user.totalPredictions, 0),
                totalVolume: sortedLeaderboard.reduce((sum, user) => sum + user.totalSpent, 0),
                averageAccuracy: sortedLeaderboard.length > 0 ?
                    sortedLeaderboard.reduce((sum, user) => sum + user.winRate, 0) / sortedLeaderboard.length : 0,
                topStreaker: sortedLeaderboard.reduce((max, user) =>
                    user.currentStreak > (max.currentStreak || 0) ? user : max, sortedLeaderboard[0])
            }
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch leaderboard' },
            { status: 500 }
        );
    }
}
