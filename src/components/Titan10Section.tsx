import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, ArrowRight, TrendingUp, DollarSign, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Titan10Section() {
  const navigate = useNavigate();

  const handleViewPortfolio = () => {
    navigate('/titan10');
  };

  return (
    <div className="space-y-6">
      {/* Professional Hero Section */}
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  IgniteX Titan 10
                </h2>
                <p className="text-sm text-muted-foreground">Expert-Curated Portfolio for 2025 Bull Run</p>
              </div>
            </div>
            
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              EXCLUSIVE
            </Badge>
          </div>
          
          {/* Key Metrics - Clean Professional Grid */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-border bg-background">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <p className="text-2xl font-bold">8,763%</p>
                </div>
                <p className="text-xs text-muted-foreground">Avg. Returns</p>
              </CardContent>
            </Card>
            
            <Card className="border-border bg-background">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                  <DollarSign className="w-4 h-4" />
                  <p className="text-2xl font-bold">$2.8M</p>
                </div>
                <p className="text-xs text-muted-foreground">Total Volume</p>
              </CardContent>
            </Card>
            
            <Card className="border-border bg-background">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                  <Target className="w-4 h-4" />
                  <p className="text-2xl font-bold">87%</p>
                </div>
                <p className="text-xs text-muted-foreground">Hit Rate</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Strategic Alert */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-primary">🔥 Top Performer Alert</p>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    +2,566% YTD
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Our latest pick ETHFI: Liquid staking protocol with massive growth potential. Entry at $0.45, now trading significantly higher. 
                  <span className="font-medium text-foreground"> Institutional accumulation confirmed.</span>
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* CTA */}
          <Button 
            onClick={handleViewPortfolio}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            View Complete Titan 10 Portfolio
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Limited access • 9 coins locked for premium members • Instant unlock available
          </p>
        </div>
      </div>
    </div>
  );
}