-- Zypher (ZPH) Trading Data API Database Schema
-- Supabase PostgreSQL Schema

-- Create candles table for storing OHLCV data
CREATE TABLE IF NOT EXISTS candles (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL DEFAULT 'ZPHUSD',
    timestamp BIGINT NOT NULL,
    open DECIMAL(20,8) NOT NULL,
    high DECIMAL(20,8) NOT NULL,
    low DECIMAL(20,8) NOT NULL,
    close DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) NOT NULL,
    mode VARCHAR(10) NOT NULL DEFAULT 'auto', -- 'auto' or 'manual'
    resolution VARCHAR(10) NOT NULL DEFAULT '1', -- '1', '5', '15', '60', '1D'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create manual_control table for admin interventions
CREATE TABLE IF NOT EXISTS manual_control (
    id SERIAL PRIMARY KEY,
    direction VARCHAR(10) NOT NULL, -- 'up', 'down', 'neutral'
    speed DECIMAL(5,4) NOT NULL DEFAULT 0.01, -- Rate of change (0.01 = 1%)
    intensity DECIMAL(5,4) NOT NULL DEFAULT 1.0, -- Multiplier for effect
    duration_seconds INTEGER DEFAULT 300, -- How long the manual control lasts
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- Create trading_config table for system settings
CREATE TABLE IF NOT EXISTS trading_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_candles_symbol_timestamp ON candles(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_candles_timestamp ON candles(timestamp);
CREATE INDEX IF NOT EXISTS idx_candles_mode ON candles(mode);
CREATE INDEX IF NOT EXISTS idx_candles_resolution ON candles(resolution);
CREATE INDEX IF NOT EXISTS idx_manual_control_active ON manual_control(is_active);
CREATE INDEX IF NOT EXISTS idx_manual_control_expires ON manual_control(expires_at);

-- Insert default trading configuration
INSERT INTO trading_config (key, value, description) VALUES
('current_mode', 'auto', 'Current trading mode: auto or manual'),
('base_price', '10.00', 'Starting price for ZPH'),
('volatility', '0.02', 'Base volatility percentage (2%)'),
('trend_strength', '0.1', 'Trend strength multiplier'),
('volume_base', '100', 'Base volume for candles'),
('auto_interval_ms', '1000', 'Auto mode candle generation interval in milliseconds'),
('manual_duration_default', '300', 'Default manual control duration in seconds')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security (RLS) for production
ALTER TABLE candles ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_config ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access to candles" ON candles FOR SELECT USING (true);
CREATE POLICY "Allow public read access to manual_control" ON manual_control FOR SELECT USING (true);
CREATE POLICY "Allow public read access to trading_config" ON trading_config FOR SELECT USING (true);

-- Create policies for authenticated write access (adjust as needed)
CREATE POLICY "Allow authenticated insert to candles" ON candles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update to manual_control" ON manual_control FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated insert to manual_control" ON manual_control FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update to trading_config" ON trading_config FOR UPDATE USING (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_candles_updated_at BEFORE UPDATE ON candles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_config_updated_at BEFORE UPDATE ON trading_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
