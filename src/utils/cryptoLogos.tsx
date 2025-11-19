/**
 * Crypto Logo Component
 *
 * Uses the EXACT SAME logo system as Dashboard, Portfolio, Mock Trading, etc.
 * Accepts CoinGecko image URLs from globalHubService (100+ cryptocurrencies)
 *
 * Priority System:
 * 1. Image URL from signal data (provided by globalHubService.getCryptoImageUrl())
 * 2. Local SVG components (10 major cryptos - instant rendering)
 * 3. Fallback circle with symbol letter
 */

import React from 'react';
import { BTCLogo } from '@/components/ui/btc-logo';
import { ETHLogo } from '@/components/ui/eth-logo';
import { SOLLogo } from '@/components/ui/sol-logo';
import { BNBLogo } from '@/components/ui/bnb-logo';
import { ADALogo } from '@/components/ui/ada-logo';
import { XRPLogo } from '@/components/ui/xrp-logo';
import { DOGELogo } from '@/components/ui/doge-logo';
import { LINKLogo } from '@/components/ui/link-logo';
import { TRXLogo } from '@/components/ui/trx-logo';
import { HYPELogo } from '@/components/ui/hype-logo';

interface CryptoLogoProps {
  symbol: string;
  className?: string;
  imageUrl?: string; // CoinGecko image URL from signal data (globalHubService provides this)
}

/**
 * CryptoLogo Component - Same system used across entire platform
 *
 * This component uses the EXACT SAME logic as:
 * - Dashboard (crypto.image)
 * - Portfolio (coin_image)
 * - Mock Trading (selectedCoin.image)
 * - AI Analysis (crypto.image)
 * - All other pages
 *
 * The imageUrl comes from globalHubService.getCryptoImageUrl() which has
 * a comprehensive map of 100+ cryptocurrencies with working CoinGecko URLs.
 */
export const CryptoLogo: React.FC<CryptoLogoProps> = ({
  symbol,
  className = "w-12 h-12",
  imageUrl // This is the key - same as crypto.image from Dashboard
}) => {
  const symbolUpper = symbol.toUpperCase();
  const symbolClean = symbolUpper.replace(/USDT|USDC|USD|PERP|\//g, '').trim();

  // Debug: Log imageUrl prop received
  console.log(`[CryptoLogo] 🎨 ${symbol} → cleaned: ${symbolClean} | imageUrl: "${imageUrl}"`);

  // Priority 1: Try local SVG logo components (10 major cryptos - instant, no HTTP)
  const logoMap: Record<string, React.FC<{ className?: string }>> = {
    'BTC': BTCLogo,
    'BITCOIN': BTCLogo,
    'ETH': ETHLogo,
    'ETHEREUM': ETHLogo,
    'SOL': SOLLogo,
    'SOLANA': SOLLogo,
    'BNB': BNBLogo,
    'BINANCE': BNBLogo,
    'ADA': ADALogo,
    'CARDANO': ADALogo,
    'XRP': XRPLogo,
    'RIPPLE': XRPLogo,
    'DOGE': DOGELogo,
    'DOGECOIN': DOGELogo,
    'LINK': LINKLogo,
    'CHAINLINK': LINKLogo,
    'TRX': TRXLogo,
    'TRON': TRXLogo,
    'HYPE': HYPELogo,
    'HYPERLIQUID': HYPELogo,
  };

  const LogoComponent = logoMap[symbolClean];

  if (LogoComponent) {
    return <LogoComponent className={className} />;
  }

  // Priority 2: Use CoinGecko image URL from signal data
  // This is the SAME system used in Dashboard, Portfolio, etc.
  // The URL comes from globalHubService.getCryptoImageUrl() which has 100+ coins
  if (imageUrl) {
    return (
      <div className={className}>
        <img
          src={imageUrl}
          alt={symbolClean}
          className="w-full h-full rounded-full object-cover"
          loading="lazy"
          onError={(e) => {
            // If image fails to load, replace with fallback
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              // Show first letter in a circle (same as fallback below)
              const firstLetter = symbolClean.charAt(0);
              parent.innerHTML = `
                <div class="w-full h-full rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center border-2 border-slate-300">
                  <span class="text-white font-bold text-sm">${firstLetter}</span>
                </div>
              `;
            }
          }}
        />
      </div>
    );
  }

  // Priority 3: Fallback - Circle with first letter (for coins without image URL)
  const firstLetter = symbolClean.charAt(0);

  return (
    <div className={`${className} rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center border-2 border-slate-300`}>
      <span className="text-white font-bold text-sm">{firstLetter}</span>
    </div>
  );
};

/**
 * Check if a custom logo exists for a symbol
 */
export const hasCustomLogo = (symbol: string): boolean => {
  const symbolClean = symbol.toUpperCase().replace(/USDT|USDC|USD|PERP|\//g, '').trim();
  const supportedCoins = ['BTC', 'BITCOIN', 'ETH', 'ETHEREUM', 'SOL', 'SOLANA', 'BNB', 'BINANCE',
                          'ADA', 'CARDANO', 'XRP', 'RIPPLE', 'DOGE', 'DOGECOIN', 'LINK',
                          'CHAINLINK', 'TRX', 'TRON', 'HYPE', 'HYPERLIQUID'];
  return supportedCoins.includes(symbolClean);
};
