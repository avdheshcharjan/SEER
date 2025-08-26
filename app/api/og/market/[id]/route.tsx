import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { SupabaseService } from '@/lib/supabase';
import { SchemaTransformer } from '@/lib/types';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    // Fetch market data
    const marketData = await SupabaseService.getMarketWithInfluencer(resolvedParams.id);
    if (!marketData) {
      return new Response('Market not found', { status: 404 });
    }

    const market = SchemaTransformer.marketWithInfluencerToUnified(marketData);
    const influencer = market.influencer;
    
    const yesPercentage = SchemaTransformer.getYesPercentage(market);
    const noPercentage = SchemaTransformer.getNoPercentage(market);

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            fontSize: 32,
            fontWeight: 600,
          }}
        >
          {/* Background gradient */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            }}
          />
          
          {/* Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center',
              maxWidth: '800px',
              position: 'relative',
            }}
          >
            {/* Category Badge */}
            <div
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '16px',
                marginBottom: '20px',
                textTransform: 'uppercase',
              }}
            >
              {market.category}
            </div>

            {/* Market Question */}
            <div
              style={{
                color: 'white',
                fontSize: '36px',
                fontWeight: 'bold',
                lineHeight: '1.2',
                marginBottom: '30px',
                textAlign: 'center',
              }}
            >
              {market.question}
            </div>

            {/* Influencer Info */}
            {influencer && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#1e293b',
                  padding: '20px',
                  borderRadius: '16px',
                  marginBottom: '30px',
                  border: '1px solid #475569',
                }}
              >
                <div style={{ marginRight: '20px' }}>
                  <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
                    {influencer.name}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '18px' }}>
                    @{influencer.handle} • {influencer.winRate}% win rate
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#94a3b8', fontSize: '16px' }}>Predictions</div>
                  <div style={{ color: '#22c55e', fontSize: '20px', fontWeight: 'bold' }}>
                    {influencer.totalPredictions}
                  </div>
                </div>
              </div>
            )}

            {/* YES/NO Stats */}
            <div
              style={{
                display: 'flex',
                gap: '20px',
                width: '100%',
                maxWidth: '400px',
              }}
            >
              <div
                style={{
                  flex: 1,
                  backgroundColor: '#166534',
                  border: '1px solid #22c55e',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: '#22c55e', fontSize: '32px', fontWeight: 'bold' }}>
                  {yesPercentage}%
                </div>
                <div style={{ color: '#16a34a', fontSize: '18px' }}>YES</div>
              </div>
              <div
                style={{
                  flex: 1,
                  backgroundColor: '#7f1d1d',
                  border: '1px solid #ef4444',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: '#ef4444', fontSize: '32px', fontWeight: 'bold' }}>
                  {noPercentage}%
                </div>
                <div style={{ color: '#dc2626', fontSize: '18px' }}>NO</div>
              </div>
            </div>

            {/* SeerMarkets branding */}
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                color: '#64748b',
                fontSize: '18px',
              }}
            >
              SeerMarkets
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}