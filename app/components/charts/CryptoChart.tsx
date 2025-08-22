"use client";

import { useMemo } from 'react';

interface CryptoChartProps {
  data: {
    timestamps: number[];
    prices: number[];
  };
  currentPrice: number;
  priceChange: number;
  className?: string;
}

export function CryptoChart({ data, currentPrice, priceChange, className = '' }: CryptoChartProps) {
  const { pathData, minPrice, maxPrice, width, height } = useMemo(() => {
    if (!data.prices || data.prices.length === 0) {
      return { pathData: '', minPrice: 0, maxPrice: 0, width: 200, height: 60 };
    }

    const prices = data.prices;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    const width = 200;
    const height = 60;
    const padding = 4;
    
    // Generate SVG path
    const points = prices.map((price, index) => {
      const x = (index / (prices.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((price - minPrice) / priceRange) * (height - padding * 2);
      return [x, y];
    });
    
    const pathData = points.reduce((path, [x, y], index) => {
      return index === 0 ? `M ${x} ${y}` : `${path} L ${x} ${y}`;
    }, '');

    return { pathData, minPrice, maxPrice, width, height };
  }, [data.prices]);

  if (!data.prices || data.prices.length === 0) {
    return (
      <div className={`flex items-center justify-center h-16 text-white/40 text-xs ${className}`}>
        No chart data available
      </div>
    );
  }

  const isPositive = priceChange >= 0;
  const strokeColor = isPositive ? '#10b981' : '#ef4444';
  const fillColor = isPositive ? 'url(#greenGradient)' : 'url(#redGradient)';

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/60 text-xs">24h Chart</span>
        <span className="text-white/60 text-xs">
          ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}
        </span>
      </div>
      
      <svg width={width} height={height} className="w-full h-auto">
        <defs>
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Fill area under the line */}
        <path
          d={`${pathData} L ${width - 4} ${height - 4} L 4 ${height - 4} Z`}
          fill={fillColor}
        />
        
        {/* Price line */}
        <path
          d={pathData}
          stroke={strokeColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Current price indicator dot */}
        {data.prices.length > 0 && (
          <circle
            cx={width - 4}
            cy={height - 4 - ((currentPrice - minPrice) / (maxPrice - minPrice)) * (height - 8)}
            r="3"
            fill={strokeColor}
            className="drop-shadow-sm"
          />
        )}
      </svg>
    </div>
  );
}