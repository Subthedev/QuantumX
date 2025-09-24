import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, TrendingUp, Crown, Sparkles, ChevronRight, Eye, Shield, Target, Zap, Clock, Users, ArrowRight, Star, Timer, AlertCircle } from 'lucide-react';
import { BTCLogo } from '@/components/ui/btc-logo';
import { ETHLogo } from '@/components/ui/eth-logo';
import { SOLLogo } from '@/components/ui/sol-logo';
import { BNBLogo } from '@/components/ui/bnb-logo';
import { HYPELogo } from '@/components/ui/hype-logo';
import { DOGELogo } from '@/components/ui/doge-logo';
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
    symbol: '???',
    name: 'Mystery Titan',
    logo: () => (
      <div className="relative w-6 h-6">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full animate-pulse" />
        <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[10px]">?</span>
      </div>
    ),
    targetPrice: 'Hidden',
    currentPrice: 'Hidden',
    potential: '1000%+',
    rating: 98,
    isRevealed: true,
    category: '🔥 EXCLUSIVE',
    marketCap: 'Multi-Billion',
    volume24h: 'High Volume',
    insights: '🚀 Celebrity-backed meme titan with confirmed institutional accumulation zones. Major exchange listings imminent.'
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
    logo: () => <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
      <span className="text-white font-bold text-[10px]">JUP</span>
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
    logo: () => <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
      <span className="text-white font-bold text-[10px]">PEN</span>
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
    logo: () => <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
      <span className="text-white font-bold text-[10px]">ETHFI</span>
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
    logo: () => <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center">
      <span className="text-white font-bold text-[10px]">AURA</span>
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 47 });

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUpgradeClick = () => {
    navigate('/pricing');
    toast({
      title: "Unlock Titan 10 Portfolio",
      description: "Get instant access to our expert-curated portfolio",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/10 border border-primary/20 p-8 mb-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl backdrop-blur">
                  <Crown className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    IgniteX Titan 10
                  </h1>
                  <p className="text-muted-foreground">Expert-Curated Portfolio for 2025 Bull Run</p>
                </div>
              </div>
              
              <div className="hidden lg:flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2">
                <Timer className="w-4 h-4 text-destructive" />
                <span className="text-sm font-mono">
                  {String(timeLeft.hours).padStart(2, '0')}:
                  {String(timeLeft.minutes).padStart(2, '0')}:
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20">
                <p className="text-2xl font-bold text-primary">8,763.24%</p>
                <p className="text-xs text-muted-foreground">Total Returns</p>
              </div>
              
              <div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-lg p-3 border border-accent/20">
                <p className="text-2xl font-bold text-accent">A+</p>
                <p className="text-xs text-muted-foreground">Risk Score</p>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                <p className="text-2xl font-bold text-yellow-500">12,847</p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-lg p-3 border border-green-500/20">
                <p className="text-2xl font-bold text-green-500">24/7</p>
                <p className="text-xs text-muted-foreground">Monitoring</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                <p className="text-2xl font-bold text-purple-500">98%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mystery Coin Alert Bar */}
        <div className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 rounded-xl p-4 mb-6 border border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full blur animate-pulse" />
                <div className="relative p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-yellow-500">🔥 EXCLUSIVE REVEAL</p>
                <p className="text-xs text-muted-foreground">One multi-billion dollar meme titan revealed below</p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 px-3 py-1">
              Limited Time: 50% OFF
            </Badge>
          </div>
        </div>

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
                  ? 'bg-gradient-to-r from-yellow-500/5 to-orange-500/5' 
                  : 'hover:bg-muted/20'
              }`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Blur overlay for locked coins */}
              {!coin.isRevealed && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50 backdrop-blur-[2px]">
                  <Lock className="w-5 h-5 text-muted-foreground/50" />
                </div>
              )}
              
              <div className={`grid grid-cols-12 gap-4 items-center ${!coin.isRevealed && 'filter blur-[3px]'}`}>
                <div className="col-span-1 text-sm font-medium text-muted-foreground">
                  {index + 1}
                </div>
                
                <div className="col-span-3 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    coin.isRevealed 
                      ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20' 
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
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="font-bold text-green-500">{coin.potential}</span>
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
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                            : 'bg-gradient-to-r from-primary to-accent'
                        }`}
                        style={{ width: `${coin.rating}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="col-span-1 text-right">
                  {coin.isRevealed ? (
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-[10px]">
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

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <h3 className="text-3xl font-bold">Unlock All 10 Titan Picks Now</h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join 12,847+ smart investors who are already profiting from our expert research. 
                Get instant access to all coin analyses, entry points, and real-time updates.
              </p>
              
              <div className="flex flex-wrap justify-center gap-6 my-6">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <span className="text-sm">Live Price Alerts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-sm">Risk Management</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <span className="text-sm">Entry/Exit Points</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <span className="text-sm">Weekly Updates</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  size="lg" 
                  onClick={handleUpgradeClick}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 text-lg px-8 py-6 shadow-lg hover:shadow-xl"
                >
                  Get Instant Access
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Limited Time Offer</p>
                  <p className="text-2xl font-bold text-primary">50% OFF</p>
                  <p className="text-xs text-muted-foreground">First 100 members only</p>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-4">
                ✓ Cancel anytime • ✓ 7-day money-back guarantee • ✓ Instant access
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}