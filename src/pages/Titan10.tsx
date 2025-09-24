import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, TrendingUp, Crown, Sparkles, ChevronRight, Eye, Shield, Target, Zap, Clock, Users, ArrowRight } from 'lucide-react';
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
    category: 'Digital Gold',
    marketCap: '$1.9T',
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
    category: 'High Performance',
    marketCap: '$82B',
    insights: 'Memecoin ecosystem and DeFi resurgence positioning for explosive growth'
  },
  {
    symbol: '???',
    name: 'Mystery Meme King',
    logo: DOGELogo,
    targetPrice: '$?.??',
    currentPrice: '$?.??',
    potential: '???%',
    rating: 95,
    isRevealed: true,
    category: '🔥 REVEALED',
    marketCap: '$??B',
    insights: 'Our latest multi-billion dollar meme pick with celebrity backing and institutional interest'
  },
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    logo: BNBLogo,
    targetPrice: '$1,200',
    currentPrice: '$580',
    potential: '107%',
    rating: 85,
    category: 'Exchange Token',
    marketCap: '$87B'
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
    marketCap: '$9.3B'
  },
  {
    symbol: 'JUP',
    name: 'Jupiter',
    logo: () => <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />,
    targetPrice: '$4.50',
    currentPrice: '$1.20',
    potential: '275%',
    rating: 87,
    category: 'DEX Aggregator',
    marketCap: '$1.6B'
  },
  {
    symbol: 'PENDLE',
    name: 'Pendle',
    logo: () => <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full" />,
    targetPrice: '$15',
    currentPrice: '$4.80',
    potential: '212%',
    rating: 89,
    category: 'Yield Trading',
    marketCap: '$782M'
  },
  {
    symbol: 'ETHFI',
    name: 'Ether.fi',
    logo: () => <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full" />,
    targetPrice: '$12',
    currentPrice: '$3.50',
    potential: '242%',
    rating: 86,
    category: 'Liquid Staking',
    marketCap: '$420M'
  },
  {
    symbol: 'AURA',
    name: 'Aura Finance',
    logo: () => <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full" />,
    targetPrice: '$8',
    currentPrice: '$1.80',
    potential: '344%',
    rating: 84,
    category: 'Yield Optimizer',
    marketCap: '$89M'
  }
];

export default function Titan10() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleUpgradeClick = () => {
    navigate('/pricing');
    toast({
      title: "Unlock Titan 10 Portfolio",
      description: "Get instant access to our expert-curated portfolio",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/30 p-12 mb-12">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-primary/30 rounded-2xl backdrop-blur">
                <Crown className="w-12 h-12 text-primary" />
              </div>
            </div>
            
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              IgniteX Titan 10
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Our Expert Research Team's Top 10 Picks for the 2025 Bull Run
            </p>
            
            <div className="grid md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
              <div className="bg-background/60 backdrop-blur rounded-xl p-4 border border-primary/20">
                <Target className="w-6 h-6 text-primary mb-2 mx-auto" />
                <p className="text-3xl font-bold text-primary">195%</p>
                <p className="text-sm text-muted-foreground">Avg. Return</p>
              </div>
              
              <div className="bg-background/60 backdrop-blur rounded-xl p-4 border border-primary/20">
                <Shield className="w-6 h-6 text-accent mb-2 mx-auto" />
                <p className="text-3xl font-bold text-accent">A+</p>
                <p className="text-sm text-muted-foreground">Risk Rating</p>
              </div>
              
              <div className="bg-background/60 backdrop-blur rounded-xl p-4 border border-primary/20">
                <Users className="w-6 h-6 text-yellow-500 mb-2 mx-auto" />
                <p className="text-3xl font-bold text-yellow-500">2,847</p>
                <p className="text-sm text-muted-foreground">Members</p>
              </div>
              
              <div className="bg-background/60 backdrop-blur rounded-xl p-4 border border-primary/20">
                <Clock className="w-6 h-6 text-green-500 mb-2 mx-auto" />
                <p className="text-3xl font-bold text-green-500">24/7</p>
                <p className="text-sm text-muted-foreground">Updates</p>
              </div>
            </div>

            {/* Mystery Coin Teaser */}
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border border-yellow-500/30 mb-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-bold text-yellow-500 uppercase tracking-wide">Breaking: New Addition</span>
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2">🚀 Our Latest Multi-Billion Dollar Meme Pick</h3>
              <p className="text-muted-foreground mb-4">
                Celebrity-backed • Institutional interest • 300%+ potential • Revealed below for premium members only
              </p>
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                Limited Time: First 100 Members Get 50% Off
              </Badge>
            </div>
          </div>
        </div>

        {/* Coins Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {titanCoins.map((coin, index) => (
            <Card 
              key={index}
              className={`relative overflow-hidden transition-all duration-500 ${
                coin.isRevealed 
                  ? 'ring-2 ring-yellow-500 shadow-2xl shadow-yellow-500/20 transform scale-105' 
                  : 'hover:shadow-xl hover:shadow-primary/10'
              }`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {!coin.isRevealed && (
                <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/95 to-background backdrop-blur-xl z-10 flex flex-col items-center justify-center">
                  <Lock className="w-10 h-10 text-muted-foreground mb-3 opacity-60" />
                  <span className="text-xs text-muted-foreground">Premium Only</span>
                </div>
              )}
              
              {coin.isRevealed && (
                <div className="absolute top-2 right-2 z-20">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 animate-pulse">
                    REVEALED
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-3 rounded-xl ${
                    coin.isRevealed 
                      ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20' 
                      : 'bg-primary/10'
                  }`}>
                    <coin.logo className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className={`text-xl ${!coin.isRevealed && 'blur-md'}`}>
                      {coin.symbol}
                    </CardTitle>
                    <CardDescription className={`text-sm ${!coin.isRevealed && 'blur-md'}`}>
                      {coin.name}
                    </CardDescription>
                  </div>
                </div>
                
                <Badge 
                  variant={coin.isRevealed ? "default" : "secondary"} 
                  className={`w-fit ${!coin.isRevealed && 'blur-sm'}`}
                >
                  {coin.category}
                </Badge>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Target</span>
                    <span className={`font-bold text-primary ${!coin.isRevealed && 'blur-md'}`}>
                      {coin.targetPrice}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Potential</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className={`font-bold text-green-500 ${!coin.isRevealed && 'blur-md'}`}>
                        {coin.potential}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Market Cap</span>
                    <span className={`text-sm font-medium ${!coin.isRevealed && 'blur-md'}`}>
                      {coin.marketCap}
                    </span>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">IgniteX Score</span>
                      <span className={`text-sm font-bold ${!coin.isRevealed && 'blur-sm'}`}>
                        {coin.rating}/100
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
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
                
                {coin.insights && coin.isRevealed && (
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    {coin.insights}
                  </p>
                )}
                
                {!coin.isRevealed && hoveredIndex === index && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/30 to-transparent p-3 z-20">
                    <p className="text-xs text-center text-primary font-medium">
                      Unlock for full analysis
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border-primary/30">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <h3 className="text-3xl font-bold">Unlock All 10 Titan Picks Now</h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join 2,847+ smart investors who are already profiting from our expert research. 
                Get instant access to all coin analyses, entry points, and real-time updates.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 my-6">
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