/**
 * CRYPTO LOGOS UTILITY
 *
 * Utility for fetching and displaying cryptocurrency logos
 */

import React from 'react';

// Common crypto logo URLs (using CoinGecko CDN)
const logoUrls: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  ADA: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  DOT: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  UNI: 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',
  ATOM: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
  LTC: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
  NEAR: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg'
};

export function getLogoUrl(symbol: string): string {
  const upperSymbol = symbol.toUpperCase().replace('USDT', '').replace('USD', '');
  return logoUrls[upperSymbol] || '';
}

export function CryptoLogo({
  symbol,
  size = 24,
  className = ''
}: {
  symbol: string;
  size?: number;
  className?: string
}) {
  const url = getLogoUrl(symbol);

  if (!url) {
    // Return a fallback with the symbol initials
    return React.createElement('div', {
      className: `flex items-center justify-center rounded-full bg-slate-700 text-white font-bold ${className}`,
      style: { width: size, height: size, fontSize: size * 0.4 }
    }, symbol.slice(0, 2).toUpperCase());
  }

  return React.createElement('img', {
    src: url,
    alt: symbol,
    className: `rounded-full ${className}`,
    style: { width: size, height: size },
    onError: (e: any) => {
      e.target.style.display = 'none';
    }
  });
}

export default { getLogoUrl, CryptoLogo };
