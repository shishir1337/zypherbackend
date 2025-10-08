-- Fix Database Numeric Field Overflow
-- Update schema to handle larger price values

-- Drop existing constraints and indexes that might prevent the change
DROP INDEX IF EXISTS idx_candles_symbol_timestamp;
DROP INDEX IF EXISTS idx_candles_timestamp;
DROP INDEX IF EXISTS idx_candles_mode;
DROP INDEX IF EXISTS idx_candles_resolution;

-- Update candles table to use larger numeric precision
ALTER TABLE candles 
ALTER COLUMN open TYPE NUMERIC(30,8),
ALTER COLUMN high TYPE NUMERIC(30,8),
ALTER COLUMN low TYPE NUMERIC(30,8),
ALTER COLUMN close TYPE NUMERIC(30,8),
ALTER COLUMN volume TYPE NUMERIC(30,8);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_candles_symbol_timestamp ON candles(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_candles_timestamp ON candles(timestamp);
CREATE INDEX IF NOT EXISTS idx_candles_mode ON candles(mode);
CREATE INDEX IF NOT EXISTS idx_candles_resolution ON candles(resolution);

-- Add price limits to prevent future overflow
ALTER TABLE candles ADD CONSTRAINT check_price_limits 
CHECK (
    open > 0 AND open < 1000000000000 AND  -- 1 trillion max
    high > 0 AND high < 1000000000000 AND
    low > 0 AND low < 1000000000000 AND
    close > 0 AND close < 1000000000000 AND
    volume > 0 AND volume < 1000000000000
);

-- Update manual control to have more reasonable limits
ALTER TABLE manual_control 
ALTER COLUMN speed TYPE NUMERIC(6,4),
ALTER COLUMN intensity TYPE NUMERIC(6,4);

-- Add constraints to prevent extreme manual control values
ALTER TABLE manual_control ADD CONSTRAINT check_manual_limits
CHECK (
    speed >= 0.001 AND speed <= 0.1 AND  -- 0.1% to 10% max
    intensity >= 0.1 AND intensity <= 10.0 AND  -- 10% to 1000% max
    duration_seconds >= 10 AND duration_seconds <= 3600  -- 10 seconds to 1 hour
);

-- Insert price reset configuration
INSERT INTO trading_config (key, value, description) VALUES
('max_price', '1000000', 'Maximum allowed price (1 million)'),
('min_price', '0.01', 'Minimum allowed price'),
('price_reset_threshold', '100000', 'Reset price if it exceeds this value'),
('auto_reset_enabled', 'true', 'Enable automatic price reset when threshold is exceeded')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Create a function to reset prices if they get too high
CREATE OR REPLACE FUNCTION reset_price_if_needed()
RETURNS TRIGGER AS $$
DECLARE
    max_price_threshold NUMERIC := 100000; -- 100k threshold
    reset_price NUMERIC := 10.00; -- Reset to $10
BEGIN
    -- Check if any price field exceeds the threshold
    IF NEW.close > max_price_threshold OR 
       NEW.high > max_price_threshold OR 
       NEW.low > max_price_threshold OR 
       NEW.open > max_price_threshold THEN
        
        -- Reset all prices to a reasonable value
        NEW.open := reset_price;
        NEW.high := reset_price * 1.01; -- 1% higher
        NEW.low := reset_price * 0.99;  -- 1% lower
        NEW.close := reset_price;
        NEW.volume := 100; -- Reset volume
        
        -- Log the reset
        RAISE NOTICE 'Price reset triggered: candle % had price % exceeding threshold %', 
                     NEW.id, NEW.close, max_price_threshold;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically reset prices
DROP TRIGGER IF EXISTS trigger_reset_price ON candles;
CREATE TRIGGER trigger_reset_price
    BEFORE INSERT OR UPDATE ON candles
    FOR EACH ROW
    EXECUTE FUNCTION reset_price_if_needed();

-- Update the schema version
INSERT INTO trading_config (key, value, description) VALUES
('schema_version', '2.0', 'Database schema version with overflow protection')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();
