-- Create portfolio_holdings table
CREATE TABLE public.portfolio_holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coin_id TEXT NOT NULL,
  coin_symbol TEXT NOT NULL,
  coin_name TEXT NOT NULL,
  coin_image TEXT,
  quantity DECIMAL(20, 8) NOT NULL,
  purchase_price DECIMAL(20, 8) NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own holdings" 
ON public.portfolio_holdings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own holdings" 
ON public.portfolio_holdings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holdings" 
ON public.portfolio_holdings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holdings" 
ON public.portfolio_holdings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_portfolio_holdings_user_id ON public.portfolio_holdings(user_id);
CREATE INDEX idx_portfolio_holdings_coin_id ON public.portfolio_holdings(coin_id);

-- Add trigger for updated_at
CREATE TRIGGER update_portfolio_holdings_updated_at
BEFORE UPDATE ON public.portfolio_holdings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();