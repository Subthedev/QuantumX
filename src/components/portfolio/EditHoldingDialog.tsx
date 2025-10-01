import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Holding {
  id: string;
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
  coin_image: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  notes?: string;
}

interface EditHoldingDialogProps {
  holding: Holding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditHoldingDialog({ holding, open, onOpenChange, onSuccess }: EditHoldingDialogProps) {
  const [quantity, setQuantity] = useState(holding.quantity.toString());
  const [purchasePrice, setPurchasePrice] = useState(holding.purchase_price.toString());
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date(holding.purchase_date));
  const [notes, setNotes] = useState(holding.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!quantity || !purchasePrice) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('portfolio_holdings')
        .update({
          quantity: parseFloat(quantity),
          purchase_price: parseFloat(purchasePrice),
          purchase_date: purchaseDate.toISOString(),
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', holding.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Holding updated successfully',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating holding:', error);
      toast({
        title: 'Error',
        description: 'Failed to update holding',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Holding</DialogTitle>
          <DialogDescription>
            Update your {holding.coin_name} holding details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <img 
              src={holding.coin_image} 
              alt={holding.coin_name}
              className="h-10 w-10 rounded-full"
            />
            <div>
              <div className="font-medium">{holding.coin_name}</div>
              <div className="text-sm text-muted-foreground uppercase">{holding.coin_symbol}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.00000001"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Purchase Price (USD)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Purchase Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !purchaseDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {purchaseDate ? format(purchaseDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={purchaseDate}
                  onSelect={(date) => date && setPurchaseDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this transaction..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {quantity && purchasePrice && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Cost:</span>
                <span className="font-medium">
                  ${(parseFloat(quantity) * parseFloat(purchasePrice)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Updating...' : 'Update Holding'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}