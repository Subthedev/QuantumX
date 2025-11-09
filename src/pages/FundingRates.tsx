// Legacy page - disabled
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FundingRates() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Funding Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This feature is temporarily disabled.</p>
        </CardContent>
      </Card>
    </div>
  );
}
