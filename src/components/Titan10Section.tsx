import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, TrendingUp, Crown, Sparkles, ChevronRight, Eye, Shield, Target } from 'lucide-react';
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
  isLocked?: boolean;
  insights?: string;
  category: string;
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
    insights: 'Memecoin ecosystem and DeFi resurgence positioning for explosive growth'
  },
  {
    symbol: 'BNB',
    name: 'Binance Coin',
    logo: BNBLogo,
    targetPrice: '$1,200',
    currentPrice: '$580',
    potential: '107%',
    rating: 85,
    isLocked: true,
    category: 'Exchange Token'
  },
  {
    symbol: 'HYPE',
    name: 'Hyperliquid',
    logo: HYPELogo,
    targetPrice: '$85',
    currentPrice: '$28',
    potential: '203%',
    rating: 90,
    isLocked: true,
    category: 'Perp DEX'
  },
  {
    symbol: 'JUP',
    name: 'Jupiter',
    logo: () => <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full" />,
    targetPrice: '$4.50',
    currentPrice: '$1.20',
    potential: '275%',
    rating: 87,
    isLocked: true,
    category: 'DEX Aggregator'
  },
  {
    symbol: 'PENDLE',
    name: 'Pendle',
    logo: () => <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full" />,
    targetPrice: '$15',
    currentPrice: '$4.80',
    potential: '212%',
    rating: 89,
    isLocked: true,
    category: 'Yield Trading'
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    logo: DOGELogo,
    targetPrice: '$0.85',
    currentPrice: '$0.32',
    potential: '165%',
    rating: 82,
    isLocked: true,
    category: 'Memecoin King'
  },
  {
    symbol: 'ETHFI',
    name: 'Ether.fi',
    logo: () => <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full" />,
    targetPrice: '$12',
    currentPrice: '$3.50',
    potential: '242%',
    rating: 86,
    isLocked: true,
    category: 'Liquid Staking'
  },
  {
    symbol: 'AURA',
    name: 'Aura Finance',
    logo: () => <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full" />,
    targetPrice: '$8',
    currentPrice: '$1.80',
    potential: '344%',
    rating: 84,
    isLocked: true,
    category: 'Yield Optimizer'
  }
];

export default function Titan10Section() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleUpgradeClick = () => {
    navigate('/pricing');
    toast({
      title: "Unlock Titan 10",
      description: "Get access to our expert-curated portfolio and exclusive insights",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                IgniteX Titan 10
              </h2>
              <p className="text-muted-foreground mt-1">Elite Portfolio for the 2025 Bull Run</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <div className="bg-background/50 backdrop-blur rounded-lg p-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Avg. Target Return</span>
              </div>
              <p className="text-2xl font-bold text-primary">195%</p>
            </div>
            
            <div className="bg-background/50 backdrop-blur rounded-lg p-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium text-muted-foreground">Risk-Adjusted</span>
              </div>
              <p className="text-2xl font-bold text-accent">A+ Rating</p>
            </div>
            
            <div className="bg-background/50 backdrop-blur rounded-lg p-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium text-muted-foreground">Expert Curated</span>
              </div>
              <p className="text-2xl font-bold text-yellow-500">10 Gems</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coins Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {titanCoins.map((coin, index) => (
          <Card 
            key={coin.symbol}
            className={`relative overflow-hidden transition-all duration-300 ${
              coin.isLocked 
                ? 'bg-muted/30 backdrop-blur hover:shadow-lg hover:shadow-primary/10' 
                : 'hover:shadow-xl hover:shadow-primary/20 border-primary/20'
            }`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {coin.isLocked && (
              <div className="absolute inset-0 bg-gradient-to-br from-background/80 to-background/95 backdrop-blur-sm z-10 flex items-center justify-center">
                <Lock className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${coin.isLocked ? 'bg-muted' : 'bg-primary/10'}`}>
                    <coin.logo className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{coin.symbol}</CardTitle>
                    <CardDescription className="text-xs">{coin.name}</CardDescription>
                  </div>
                </div>
                <Badge variant={coin.isLocked ? "secondary" : "default"} className="text-xs">
                  {coin.category}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Target Price</span>
                  <span className={`font-bold ${coin.isLocked ? 'blur-sm' : 'text-primary'}`}>
                    {coin.targetPrice}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Potential</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className={`font-bold text-green-500 ${coin.isLocked ? 'blur-sm' : ''}`}>
                      {coin.potential}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">IgniteX Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${coin.isLocked ? 'bg-muted-foreground/50' : 'bg-gradient-to-r from-primary to-accent'}`}
                        style={{ width: `${coin.rating}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${coin.isLocked ? 'blur-sm' : ''}`}>
                      {coin.rating}
                    </span>
                  </div>
                </div>
              </div>
              
              {coin.insights && !coin.isLocked && (
                <p className="text-xs text-muted-foreground border-t pt-2">
                  {coin.insights}
                </p>
              )}
              
              {coin.isLocked && hoveredIndex === index && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/20 to-transparent p-3 z-20">
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
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Unlock Full Titan 10 Portfolio</h3>
              <p className="text-muted-foreground">
                Get exclusive access to all 10 expert-researched coins with detailed entry points, 
                technical analysis, and weekly updates from our research team.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  Real-time alerts
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Risk management
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Target className="w-3 h-3 mr-1" />
                  Entry/Exit points
                </Badge>
              </div>
            </div>
            
            <Button 
              size="lg" 
              onClick={handleUpgradeClick}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              Upgrade to Premium
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}