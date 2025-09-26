import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, TrendingUp, Crown, ArrowRight, AlertCircle } from 'lucide-react';
import { BTCLogo } from '@/components/ui/btc-logo';
import { ETHLogo } from '@/components/ui/eth-logo';
import { SOLLogo } from '@/components/ui/sol-logo';
import { BNBLogo } from '@/components/ui/bnb-logo';
import { HYPELogo } from '@/components/ui/hype-logo';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface TitanCoin {
  symbol: string;
  name: string;
  logo: React.ComponentType<{ className?: string }>;
  targetPrice: string;
  currentPrice: string;
  potential: string;
  rating: number;
  isRevealed?: boolean;
  insights?: string;
  category: string;
  marketCap?: string;
  volume24h?: string;
}

const titanCoins: TitanCoin[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    logo: BTCLogo,
    targetPrice: '$150,000',
    currentPrice: '$98,750',
    potential: '52%',
    rating: 95,
    category: 'Store of Value',
    marketCap: '$1.9T',
    volume24h: '$32.8B',
    insights: 'Institutional adoption accelerating with ETF flows exceeding $1B daily'
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    logo: ETHLogo,
    targetPrice: '$8,500',
    currentPrice: '$3,420',
    potential: '148%',
    rating: 92,
    category: 'Smart Contracts',
    marketCap: '$412B',
    volume24h: '$18.2B',
    insights: 'Layer 2 scaling solutions driving unprecedented network activity'
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    logo: SOLLogo,
    targetPrice: '$450',
    currentPrice: '$175',
    potential: '157%',
    rating: 88,
    category: 'DeFi Hub',
    marketCap: '$82B',
    volume24h: '$4.3B',
    insights: 'Memecoin ecosystem and DeFi resurgence positioning for explosive growth'
  },
  {
    symbol: 'TRUMP',
    name: 'The Presidential Play',
    logo: () => (
      <div className="relative w-6 h-6">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full" />
        <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[8px]">$T</span>
      </div>
    ),
    targetPrice: 'Target 2025/2026',
    currentPrice: '$47.20',
    potential: '4,634.78%',
    rating: 98,
    isRevealed: true,
    category: 'SOVEREIGN WEALTH',
    marketCap: '$47.2B',
    volume24h: '$8.9B Daily',
    insights: 'The first memecoin to enter national strategic reserves. Congressional backing secured. BlackRock accumulating $2.8B position. Binance listing confirmed for January 2025.'
  },
  {
    symbol: 'BNB',
    name: 'BNB Chain',
    logo: BNBLogo,
    targetPrice: '$1,200',
    currentPrice: '$580',
    potential: '107%',
    rating: 85,
    category: 'Exchange Token',
    marketCap: '$87B',
    volume24h: '$1.8B'
  },
  {
    symbol: 'HYPE',
    name: 'Hyperliquid',
    logo: HYPELogo,
    targetPrice: '$85',
    currentPrice: '$28',
    potential: '203%',
    rating: 90,
    category: 'Perp DEX',
    marketCap: '$9.3B',
    volume24h: '$892M'
  },
  {
    symbol: 'JUP',
    name: 'Jupiter',
    logo: () => <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
      <span className="text-muted-foreground font-bold text-[10px]">JUP</span>
    </div>,
    targetPrice: '$4.50',
    currentPrice: '$1.20',
    potential: '275%',
    rating: 87,
    category: 'DEX Aggregator',
    marketCap: '$1.6B',
    volume24h: '$142M'
  },
  {
    symbol: 'PENDLE',
    name: 'Pendle',
    logo: () => <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
      <span className="text-muted-foreground font-bold text-[10px]">PEN</span>
    </div>,
    targetPrice: '$15',
    currentPrice: '$4.80',
    potential: '212%',
    rating: 89,
    category: 'Yield Trading',
    marketCap: '$782M',
    volume24h: '$58M'
  },
  {
    symbol: 'ETHFI',
    name: 'Ether.fi',
    logo: () => <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
      <span className="text-muted-foreground font-bold text-[10px]">ETHFI</span>
    </div>,
    targetPrice: '$12',
    currentPrice: '$3.50',
    potential: '242%',
    rating: 86,
    category: 'Liquid Staking',
    marketCap: '$420M',
    volume24h: '$32M'
  },
  {
    symbol: 'AURA',
    name: 'Aura Finance',
    logo: () => <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
      <span className="text-muted-foreground font-bold text-[10px]">AURA</span>
    </div>,
    targetPrice: '$8',
    currentPrice: '$1.80',
    potential: '344%',
    rating: 84,
    category: 'Yield Optimizer',
    marketCap: '$89M',
    volume24h: '$12M'
  }
];

export default function Titan10() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleUpgradeClick = () => {
    navigate('/pricing');
    toast({
      title: "Unlock Titan 10 Portfolio",
      description: "Get instant access to our expert-curated portfolio",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">IgniteX Titan 10</h1>
            </div>
            <Button 
              size="sm" 
              onClick={handleUpgradeClick}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              Unlock All Coins
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Hero Section - Simplified */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Expert-Curated Portfolio for 2025 Bull Run
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              10 meticulously researched coins with maximum growth potential. 
              Backed by institutional-grade analysis and real-time monitoring.
            </p>
            
            {/* Key Metrics - Clean and Professional */}
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-3xl font-bold text-primary">4,634%</p>
                <p className="text-sm text-muted-foreground">Current Leader</p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-3xl font-bold text-primary">72hrs</p>
                <p className="text-sm text-muted-foreground">Next Catalyst</p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-3xl font-bold text-primary">$2.8B</p>
                <p className="text-sm text-muted-foreground">Smart Money In</p>
              </div>
            </div>
          </div>

          {/* Mystery Coin Alert - Strategic Positioning */}
          <Card className="bg-primary/5 border-primary/20 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary rounded-lg">
                    <AlertCircle className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Breaking: The $47B Ecosystem Play</p>
                    <p className="text-muted-foreground">
                      Confirmed: BlackRock accumulation detected. Congressional backing secured. 
                      Strategic reserves announcement pending Q1 2025.
                    </p>
                  </div>
                </div>
                <Badge className="bg-primary text-primary-foreground">
                  Live Now
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Professional Table Header */}
          <div className="bg-card rounded-t-xl border border-b-0 p-4">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Target</div>
              <div className="col-span-2">Potential</div>
              <div className="col-span-2">Market Cap</div>
              <div className="col-span-1">Score</div>
              <div className="col-span-1">Status</div>
            </div>
          </div>

          {/* Coins List - Professional Table Format */}
          <div className="bg-card rounded-b-xl border divide-y mb-8">
            {titanCoins.map((coin, index) => (
              <div
                key={index}
                className={`relative transition-all duration-300 p-4 ${
                  coin.isRevealed 
                    ? 'bg-primary/5' 
                    : 'hover:bg-muted/20'
                }`}
              >
                {/* Blur overlay for locked coins */}
                {!coin.isRevealed && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/60 backdrop-blur-sm">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                
                <div className={`grid grid-cols-12 gap-4 items-center ${!coin.isRevealed && 'filter blur-[2px]'}`}>
                  <div className="col-span-1 text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </div>
                  
                  <div className="col-span-3 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      coin.isRevealed 
                        ? 'bg-primary/10' 
                        : 'bg-muted/50'
                    }`}>
                      <coin.logo className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-medium">{coin.symbol}</p>
                      <p className="text-xs text-muted-foreground">{coin.name}</p>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <p className="font-bold text-primary">{coin.targetPrice}</p>
                    <p className="text-xs text-muted-foreground">from {coin.currentPrice}</p>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-primary" />
                      <span className="font-bold text-primary">{coin.potential}</span>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <p className="font-medium">{coin.marketCap}</p>
                    <p className="text-xs text-muted-foreground">Vol: {coin.volume24h}</p>
                  </div>
                  
                  <div className="col-span-1">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold">{coin.rating}</span>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            coin.isRevealed 
                              ? 'bg-primary' 
                              : 'bg-muted-foreground'
                          }`}
                          style={{ width: `${coin.rating}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-1 text-right">
                    {coin.isRevealed ? (
                      <Badge className="bg-primary text-primary-foreground text-[10px]">
                        REVEALED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        LOCKED
                      </Badge>
                    )}
                  </div>
                </div>
                
                {coin.insights && coin.isRevealed && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">{coin.insights}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA Section - Simplified and Professional */}
          <Card className="bg-card border-primary/20">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <h3 className="text-2xl font-bold">Ready to Access All 10 Titan Picks?</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Join thousands of smart investors already profiting from our institutional-grade research. 
                  Get instant access to all analyses, entry points, and real-time alerts.
                </p>
                
                <Button 
                  size="lg" 
                  onClick={handleUpgradeClick}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground text-lg px-8 py-6"
                >
                  Get Instant Access
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  ✓ Cancel anytime • ✓ 7-day money-back guarantee • ✓ Instant access
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 bg-background border-t border-border py-4">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Limited time offer - 9 coins locked for premium members only
            </p>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleUpgradeClick}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Unlock Now
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}