-- Create profit_guard_positions table
CREATE TABLE public.profit_guard_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coin_id TEXT NOT NULL,
  coin_symbol TEXT NOT NULL,
  coin_name TEXT NOT NULL,
  coin_image TEXT,
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  ai_enabled BOOLEAN NOT NULL DEFAULT false,
  profit_levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  last_notification_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profit_guard_positions ENABLE ROW LEVEL SECURITY;

-- Create policies for profit_guard_positions
CREATE POLICY "Users can view their own profit guards"
ON public.profit_guard_positions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profit guards"
ON public.profit_guard_positions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profit guards"
ON public.profit_guard_positions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profit guards"
ON public.profit_guard_positions
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profit_guard_positions_updated_at
BEFORE UPDATE ON public.profit_guard_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();