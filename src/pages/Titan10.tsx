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
  logo: React.ComponentType<{
    className?: string;
  }>;
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
const titanCoins: TitanCoin[] = [{
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
}, {
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
}, {
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
}, {
  symbol: '???',
  name: 'Our Latest Pick',
  logo: () => <div className="relative w-6 h-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 rounded-full animate-pulse" />
        <span className="absolute inset-0 flex items-center justify-center text-primary-foreground font-bold text-xs">?</span>
      </div>,
  targetPrice: 'Locked',
  currentPrice: 'Locked',
  potential: '5789%',
  rating: 98,
  isRevealed: false,
  category: 'EXCLUSIVE',
  marketCap: 'Locked',
  volume24h: 'Locked',
  insights: 'Institutional accumulation detected. Entry window closing Q1 2025. Premium members only.'
}, {
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
}, {
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
}, {
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
}, {
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
}, {
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
}, {
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
}];
export default function Titan10() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const handleUpgradeClick = () => {
    navigate('/pricing');
    toast({
      title: "Unlock Titan 10 Portfolio",
      description: "Get instant access to our expert-curated portfolio"
    });
  };
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">IgniteX Titan 10</h1>
            </div>
            <Button size="sm" onClick={handleUpgradeClick} className="bg-primary hover:bg-primary-hover text-primary-foreground">
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
            
            {/* Key Metrics - Static Professional Design */}
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
              <div className="bg-card border border-border rounded p-4">
                <p className="text-3xl font-bold text-foreground">8,763%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Avg. Returns</p>
              </div>
              
              <div className="bg-card border border-border rounded p-4">
                <p className="text-3xl font-bold text-foreground">87%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Success Rate</p>
              </div>
              
              <div className="bg-card border border-border rounded p-4">
                <p className="text-3xl font-bold text-foreground">A-</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Risk Score</p>
              </div>
            </div>
          </div>

          {/* Strategic Alert - Clean Professional Design */}
          <Card className="bg-card border-primary/20 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg text-foreground">Our Latest Pick: Premium Exclusive</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      5,789% projected returns • Institutional accumulation detected • Limited access
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                    LOCKED
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Premium Only</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Table Header */}
          <div className="bg-card rounded-t-xl border border-b-0 p-4">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Target 25/26</div>
              <div className="col-span-2">Return Till Date</div>
              <div className="col-span-2">Market Cap</div>
              <div className="col-span-1">Entry Price</div>
              <div className="col-span-1">Held by Team</div>
            </div>
          </div>

          {/* Coins List - Clean Professional Table */}
          <div className="bg-card rounded-b-xl border divide-y mb-8">
            {titanCoins.map((coin, index) => {
              const isLatestPick = coin.name === 'Our Latest Pick';
              
              return (
                <div key={index} className={`relative transition-none p-4 ${isLatestPick ? 'bg-primary/5' : ''}`}>
                  {/* Special overlay for Latest Pick */}
                  {isLatestPick && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/90 backdrop-blur-sm">
                      <div className="text-center">
                        <Lock className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="text-sm font-semibold text-foreground">Our Latest Pick</p>
                        <p className="text-xs text-muted-foreground mt-1">Unlock to reveal</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Regular blur overlay for other locked coins */}
                  {!coin.isRevealed && !isLatestPick && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/80">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className={`grid grid-cols-12 gap-4 items-center ${(!coin.isRevealed && !isLatestPick) && 'filter blur-[2px]'}`}>
                    <div className="col-span-1 text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </div>
                    
                    <div className="col-span-3 flex items-center gap-3">
                      <div className={`p-2 rounded ${isLatestPick ? 'bg-primary/20' : 'bg-muted'}`}>
                        <coin.logo className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{coin.symbol}</p>
                        <p className="text-xs text-muted-foreground">{coin.name}</p>
                        {isLatestPick && (
                          <Badge className="mt-1 bg-primary/10 text-primary border-0 text-[9px] px-1.5 py-0">
                            EXCLUSIVE
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <p className="font-semibold text-foreground">{coin.targetPrice}</p>
                      {coin.currentPrice !== 'Locked' && (
                        <p className="text-xs text-muted-foreground">from {coin.currentPrice}</p>
                      )}
                    </div>
                    
                    <div className="col-span-2">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-primary" />
                        <span className="font-semibold text-primary">{coin.potential}</span>
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <p className="font-medium text-foreground">{coin.marketCap}</p>
                      {coin.volume24h !== 'Locked' && (
                        <p className="text-xs text-muted-foreground">Vol: {coin.volume24h}</p>
                      )}
                    </div>
                    
                    <div className="col-span-1">
                      <p className="font-medium text-foreground">
                        {coin.currentPrice === 'Locked' ? '—' : coin.currentPrice}
                      </p>
                    </div>
                    
                    <div className="col-span-1 text-right">
                      <Badge variant="outline" className="text-[10px] border-muted-foreground">
                        YES
                      </Badge>
                    </div>
                  </div>
                  
                  {coin.insights && !isLatestPick && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">{coin.insights}</p>
                    </div>
                  )}
                </div>
              );
            })}
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
                
                <Button size="lg" onClick={handleUpgradeClick} className="bg-primary hover:bg-primary-hover text-primary-foreground text-lg px-8 py-6">
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
            <Button size="sm" variant="outline" onClick={handleUpgradeClick} className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              Unlock Now
            </Button>
          </div>
        </div>
      </footer>
    </div>;
}