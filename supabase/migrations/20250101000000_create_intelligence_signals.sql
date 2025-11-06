-- Create intelligence_signals table for tracking trading signals
-- IMPORTANT: Signals are system-wide, NOT user-specific
-- Same signal is shown to ALL users for full accountability

CREATE TABLE IF NOT EXISTS intelligence_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Signal Details
    symbol TEXT NOT NULL,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL')),
    timeframe TEXT NOT NULL DEFAULT '4H',

    -- Prices
    entry_min DECIMAL NOT NULL,
    entry_max DECIMAL NOT NULL,
    current_price DECIMAL NOT NULL,
    stop_loss DECIMAL,
    target_1 DECIMAL,
    target_2 DECIMAL,
    target_3 DECIMAL,

    -- Signal Metadata
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    strength TEXT NOT NULL CHECK (strength IN ('STRONG', 'MODERATE', 'WEAK')),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'EXTREME')),

    -- Status Tracking
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUCCESS', 'FAILED', 'EXPIRED')),
    hit_target INTEGER, -- Which target was hit (1, 2, or 3)
    hit_stop_loss BOOLEAN DEFAULT FALSE,

    -- Result Calculations
    entry_price DECIMAL, -- Actual entry price if manually tracked
    exit_price DECIMAL, -- Actual exit price
    profit_loss_percent DECIMAL, -- Calculated P/L %

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_intelligence_signals_status ON intelligence_signals(status);
CREATE INDEX IF NOT EXISTS idx_intelligence_signals_created_at ON intelligence_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_signals_symbol ON intelligence_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_intelligence_signals_active ON intelligence_signals(symbol, status, expires_at) WHERE status = 'ACTIVE';

-- Enable Row Level Security (but make signals public for all authenticated users)
ALTER TABLE intelligence_signals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view signals" ON intelligence_signals;
DROP POLICY IF EXISTS "Anyone can insert signals" ON intelligence_signals;
DROP POLICY IF EXISTS "Anyone can update signals" ON intelligence_signals;

-- Public read access for all authenticated users (same signal for everyone)
CREATE POLICY "Anyone can view signals"
    ON intelligence_signals FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert signals
-- Note: In production, this should be restricted to service role only
CREATE POLICY "Anyone can insert signals"
    ON intelligence_signals FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update signals (for validation system)
CREATE POLICY "Anyone can update signals"
    ON intelligence_signals FOR UPDATE
    TO authenticated
    USING (true);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_intelligence_signals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS intelligence_signals_updated_at ON intelligence_signals;
CREATE TRIGGER intelligence_signals_updated_at
    BEFORE UPDATE ON intelligence_signals
    FOR EACH ROW
    EXECUTE FUNCTION update_intelligence_signals_updated_at();
