import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Plus, TrendingUp, Target, Bell, Zap } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AddProfitGuardDialog } from "@/components/profit-guard/AddProfitGuardDialog";
import { ProfitGuardCard } from "@/components/profit-guard/ProfitGuardCard";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfitGuardPosition {
  id: string;
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
  coin_image: string | null;
  entry_price: number;
  current_price: number;
  quantity: number;
  timeframe: string;
  investment_period: number;
  ai_analysis: string | null;
  profit_levels: Array<{
    percentage: number;
    target_price: number;
    quantity_to_sell: number;
    reasoning?: string;
    triggered: boolean;
  }>;
  status: string;
  created_at: string;
}

export default function ProfitGuard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [positions, setPositions] = useState<ProfitGuardPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPositions();
  }, [user, navigate]);

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from("profit_guard_positions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPositions((data || []) as unknown as ProfitGuardPosition[]);
    } catch (error) {
      console.error("Error fetching positions:", error);
      toast({
        title: "Error",
        description: "Failed to load profit guard positions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("profit_guard_positions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profit guard position deleted",
      });
      fetchPositions();
    } catch (error) {
      console.error("Error deleting position:", error);
      toast({
        title: "Error",
        description: "Failed to delete position",
        variant: "destructive",
      });
    }
  };

  const activePositions = positions.filter((p) => p.status === "active");
  const completedPositions = positions.filter((p) => p.status === "completed");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Shield className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-primary leading-tight pb-2">
            IgniteX ProfitGuard
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            AI-powered profit protection. Secure your gains before greed takes them away.
          </p>
          <div className="flex items-center justify-center gap-6 pt-4 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span>AI Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span>Smart Targets</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Profit Protection</span>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-3">
              <Zap className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">IgniteX AI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Advanced AI analyzes market conditions, volatility, and your timeframe to recommend optimal profit levels
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-3">
              <Target className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Strategic Targets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get 3-5 optimized profit levels with clear reasoning based on technical analysis and market momentum
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-3">
              <Bell className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Profit Protection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track your positions and secure profits before greed turns gains into losses
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Active ProfitGuards</h2>
            <p className="text-muted-foreground mt-1">
              {activePositions.length} {activePositions.length === 1 ? "position" : "positions"} protected with AI-optimized profit levels
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Add New Guard
          </Button>
        </div>

        {/* Active Positions */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activePositions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePositions.map((position) => (
              <ProfitGuardCard
                key={position.id}
                position={position}
                onDelete={handleDelete}
                onRefresh={fetchPositions}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">No Active ProfitGuards</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Protect your profits with AI-powered analysis. Never lose gains to greed again.
              </p>
              <Button onClick={() => setAddDialogOpen(true)} size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Create Your First ProfitGuard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Completed Positions */}
        {completedPositions.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Completed Guards</h2>
              <p className="text-muted-foreground">
                Positions where all profit targets have been reached
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedPositions.map((position) => (
                <ProfitGuardCard
                  key={position.id}
                  position={position}
                  onDelete={handleDelete}
                  onRefresh={fetchPositions}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <AddProfitGuardDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchPositions}
      />
    </div>
  );
}
