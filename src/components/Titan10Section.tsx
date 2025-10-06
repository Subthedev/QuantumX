import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, ArrowRight, TrendingUp, DollarSign, Target, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export default function Titan10Section() {
  const navigate = useNavigate();
  const handleViewPortfolio = () => {
    navigate('/titan10');
  };
  return <div className="space-y-6">
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
                  <p className="text-2xl font-bold">23,879%</p>
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
          
          {/* Latest Picks - 2 Column Grid */}
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">🔓 Get Access to Our Latest Picks for 2025</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* RWA Pick */}
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-semibold text-blue-500 border-blue-500/50">
                        💎 RWA PICK
                      </Badge>
                      <Badge variant="secondary" className="text-xs">Locked</Badge>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 blur-sm"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground blur-sm">HBAR</p>
                        <p className="text-xs text-muted-foreground">Enterprise DLT</p>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Return Till Date:</span>
                        <span className="text-lg font-bold text-blue-500">+962%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* MEME Pick */}
              <Card className="border-purple-500/20 bg-purple-500/5">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-semibold text-purple-500 border-purple-500/50">
                        🚀 MEME PICK
                      </Badge>
                      <Badge variant="secondary" className="text-xs">Locked</Badge>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 blur-sm"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground blur-sm">HYPE</p>
                        <p className="text-xs text-muted-foreground">Perp DEX</p>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Return Till Date:</span>
                        <span className="text-lg font-bold text-purple-500">+4,900%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* CTA */}
          <Button onClick={handleViewPortfolio} size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            View Complete Titan 10 Portfolio
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Get instant access to 2 exclusive picks • 8 more coins available for members
          </p>
        </div>
      </div>
    </div>;
}