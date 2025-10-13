import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cryptoDataService } from '@/services/cryptoDataService';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddHoldingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddHoldingDialog({ open, onOpenChange, onSuccess }: AddHoldingDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [coins, setCoins] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Calculate average entry price
  const avgEntryPrice = quantity && totalAmount ? parseFloat(totalAmount) / parseFloat(quantity) : 0;

  useEffect(() => {
    if (open) {
      fetchTopCoins();
    }
  }, [open]);

  const fetchTopCoins = async () => {
    try {
      const data = await cryptoDataService.getTopCryptos(250);
      setCoins(data);
    } catch (error) {
      console.error('Error fetching coins:', error);
    }
  };

  const filteredCoins = coins.filter(coin =>
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedCoin || !quantity || !totalAmount) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (parseFloat(quantity) <= 0 || parseFloat(totalAmount) <= 0) {
      toast({
        title: 'Error',
        description: 'Quantity and Total Amount must be greater than zero',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to add holdings',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Calculate average entry price
      const calculatedAvgPrice = parseFloat(totalAmount) / parseFloat(quantity);
      
      const { error } = await supabase.from('portfolio_holdings').insert({
        user_id: user.id,
        coin_id: selectedCoin.id,
        coin_symbol: selectedCoin.symbol,
        coin_name: selectedCoin.name,
        coin_image: selectedCoin.image,
        quantity: parseFloat(quantity),
        purchase_price: calculatedAvgPrice,
        purchase_date: purchaseDate.toISOString(),
        notes: notes || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Holding added successfully',
      });

      // Reset form
      setSelectedCoin(null);
      setQuantity('');
      setTotalAmount('');
      setPurchaseDate(new Date());
      setNotes('');
      setSearchTerm('');
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding holding:', error);
      toast({
        title: 'Error',
        description: 'Failed to add holding',
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
          <DialogTitle>Add New Holding</DialogTitle>
          <DialogDescription>
            Add a cryptocurrency holding to your portfolio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Cryptocurrency</Label>
            <Popover open={showSearch} onOpenChange={setShowSearch}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={showSearch}
                  className="w-full justify-between"
                >
                  {selectedCoin ? (
                    <div className="flex items-center gap-2">
                      <img 
                        src={selectedCoin.image} 
                        alt={selectedCoin.name}
                        className="h-5 w-5 rounded-full"
                      />
                      <span>{selectedCoin.name}</span>
                      <span className="text-muted-foreground uppercase">({selectedCoin.symbol})</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select a cryptocurrency...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full sm:w-[450px] p-0" align="start">
                <div className="flex flex-col max-h-[400px]">
                  <div className="border-b p-2 sticky top-0 bg-background z-10">
                    <Input
                      placeholder="Search cryptocurrency..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <ScrollArea className="h-[320px]">
                    <div className="p-2 space-y-1">
                      {filteredCoins.slice(0, 100).length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          No cryptocurrency found.
                        </div>
                      ) : (
                        filteredCoins.slice(0, 100).map((coin) => (
                          <button
                            key={coin.id}
                            onClick={() => {
                              setSelectedCoin(coin);
                              setShowSearch(false);
                              setSearchTerm('');
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left",
                              selectedCoin?.id === coin.id && "bg-accent"
                            )}
                          >
                            <img 
                              src={coin.image} 
                              alt={coin.name}
                              className="h-6 w-6 rounded-full flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{coin.name}</div>
                              <div className="text-xs text-muted-foreground uppercase">{coin.symbol}</div>
                            </div>
                            <div className="text-sm font-medium flex-shrink-0">${coin.current_price.toLocaleString()}</div>
                            {selectedCoin?.id === coin.id && (
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
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
              <Label htmlFor="totalAmount">Total Amount (USD)</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
          </div>

          {quantity && totalAmount && avgEntryPrice > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Calculated Avg Entry Price:</span>
                <span className="text-lg font-semibold text-primary">
                  ${avgEntryPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 8
                  })}
                </span>
              </div>
            </div>
          )}

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

          {selectedCoin && quantity && totalAmount && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Investment:</span>
                <span className="font-medium">
                  ${parseFloat(totalAmount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Value:</span>
                <span className="font-medium">
                  ${(parseFloat(quantity) * selectedCoin.current_price).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Unrealized P/L:</span>
                <span className={cn(
                  "font-semibold",
                  (parseFloat(quantity) * selectedCoin.current_price - parseFloat(totalAmount)) >= 0 
                    ? "text-green-600" 
                    : "text-red-600"
                )}>
                  {(parseFloat(quantity) * selectedCoin.current_price - parseFloat(totalAmount)) >= 0 ? '+' : ''}
                  ${((parseFloat(quantity) * selectedCoin.current_price) - parseFloat(totalAmount)).toLocaleString(undefined, {
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
            {loading ? 'Adding...' : 'Add Holding'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}