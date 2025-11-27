/**
 * Custom Balance Dialog
 * Allows users to set a custom starting balance for testing
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";

interface CustomBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  onSetBalance: (balance: number) => void;
}

export function CustomBalanceDialog({
  open,
  onOpenChange,
  currentBalance,
  onSetBalance
}: CustomBalanceDialogProps) {
  const [customBalance, setCustomBalance] = useState(currentBalance.toString());

  const handleSetBalance = () => {
    const balance = parseFloat(customBalance);
    if (!isNaN(balance) && balance > 0) {
      onSetBalance(balance);
      onOpenChange(false);
    }
  };

  const presetBalances = [1000, 5000, 10000, 50000, 100000];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Set Custom Balance
          </DialogTitle>
          <DialogDescription>
            Choose a custom starting balance for paper trading
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="balance">Custom Amount</Label>
            <Input
              id="balance"
              type="number"
              value={customBalance}
              onChange={(e) => setCustomBalance(e.target.value)}
              placeholder="Enter amount"
              className="text-lg font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Select</Label>
            <div className="grid grid-cols-3 gap-2">
              {presetBalances.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomBalance(amount.toString())}
                  className="text-xs"
                >
                  ${amount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSetBalance}>
            Set Balance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
