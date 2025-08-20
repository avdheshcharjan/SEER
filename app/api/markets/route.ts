import { NextRequest, NextResponse } from 'next/server';
import { predictionMarkets, getMarketsByCategory, getRandomMarkets } from '@/lib/prediction-markets';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const count = searchParams.get('count');
        const random = searchParams.get('random');

        let markets = predictionMarkets;

        // Filter by category if specified
        if (category && category !== 'all') {
            markets = getMarketsByCategory(category as 'crypto' | 'tech' | 'celebrity' | 'sports' | 'politics');
        }

        // Get random markets if specified
        if (random === 'true' && count) {
            markets = getRandomMarkets(parseInt(count));
        } else if (count) {
            markets = markets.slice(0, parseInt(count));
        }

        return NextResponse.json({
            success: true,
            data: markets,
            total: markets.length,
        });
    } catch (error) {
        console.error('Error fetching markets:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch markets' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { question, description, category, endDate } = body;

        // Validate required fields
        if (!question || !description || !category || !endDate) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // In a real implementation, you would save this to a database
        // For now, we'll just return a success response
        const newMarket = {
            id: `market_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            question,
            description,
            category,
            endDate,
            currentPrice: 0,
            priceChange: 0,
            marketCap: '$0',
            volume: '$0 Volume',
            yesOdds: 50,
            noOdds: 50,
            tags: [],
            timeframe: 'daily' as const,
        };

        return NextResponse.json({
            success: true,
            data: newMarket,
        });
    } catch (error) {
        console.error('Error creating market:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create market' },
            { status: 500 }
        );
    }
}
