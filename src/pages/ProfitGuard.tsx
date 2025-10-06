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
  ai_enabled: boolean;
  profit_levels: Array<{
    percentage: number;
    target_price: number;
    quantity_to_sell: number;
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
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold">IgniteX ProfitGuard</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Lock in your profits intelligently. Never lose gains to greed again.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <Target className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Manual Targets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Set custom profit levels and let ProfitGuard alert you when targets are hit
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <Zap className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">AI-Powered</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Let AI analyze market conditions and recommend optimal profit-taking levels
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <Bell className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Smart Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get notified when it's time to secure profits based on market movements
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Button */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Active Guards</h2>
            <p className="text-muted-foreground">
              {activePositions.length} position{activePositions.length !== 1 ? "s" : ""} protected
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Position
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
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Active Guards</h3>
              <p className="text-muted-foreground text-center mb-4">
                Start protecting your profits by adding your first position
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Position
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
