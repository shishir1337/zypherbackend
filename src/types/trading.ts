// Trading Data API Types

export interface Candle {
  id?: number;
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  mode: 'auto' | 'manual';
  resolution: string;
  created_at?: string;
  updated_at?: string;
}

export interface ManualControl {
  id?: number;
  direction: 'up' | 'down' | 'neutral';
  speed: number;
  intensity: number;
  duration_seconds: number;
  is_active: boolean;
  created_at?: string;
  expires_at?: string;
}

export interface TradingConfig {
  id?: number;
  key: string;
  value: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TradingViewSymbol {
  name: string;
  ticker: string;
  type: string;
  session: string;
  timezone: string;
  pricescale: number;
  minmov: number;
  fractional: boolean;
  has_intraday: boolean;
  has_weekly_and_monthly: boolean;
  supported_resolutions: string[];
  volume_precision: number;
  data_status: string;
}

export interface TradingViewConfig {
  supports_search: boolean;
  supports_group_request: boolean;
  supports_marks: boolean;
  supports_timescale_marks: boolean;
  supports_time: boolean;
  exchanges: Array<{
    value: string;
    name: string;
    desc: string;
  }>;
  symbols_types: Array<{
    name: string;
    value: string;
  }>;
  supported_resolutions: string[];
}

export interface TradingViewHistoryResponse {
  s: 'ok' | 'no_data' | 'error';
  t: number[]; // timestamps
  o: number[]; // open prices
  h: number[]; // high prices
  l: number[]; // low prices
  c: number[]; // close prices
  v: number[]; // volumes
  nextTime?: number;
}

export interface TradingViewBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface WebSocketCandleUpdate {
  symbol: string;
  t: number; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  mode: 'auto' | 'manual';
  resolution: string;
}

export interface CandleGenerationParams {
  previousCandle?: Candle;
  basePrice?: number;
  volatility?: number;
  trendStrength?: number;
  volumeBase?: number;
  manualDirection?: 'up' | 'down' | 'neutral';
  manualSpeed?: number;
  manualIntensity?: number;
}

export interface TradingMode {
  mode: 'auto' | 'manual';
  lastUpdated: string;
  activeManualControl?: ManualControl;
}

export interface SystemStatus {
  mode: 'auto' | 'manual';
  isRunning: boolean;
  lastCandleTime: number;
  currentPrice: number;
  totalCandles: number;
  uptime: number;
  activeManualControl?: ManualControl;
}

// Redis cache keys
export const REDIS_KEYS = {
  CURRENT_PRICE: 'zph:current_price',
  LAST_CANDLE: 'zph:last_candle',
  TRADING_MODE: 'zph:trading_mode',
  MANUAL_CONTROL: 'zph:manual_control',
  SYSTEM_STATUS: 'zph:system_status',
  LIVE_TICKS: 'zph:live_ticks',
} as const;

// Trading constants
export const TRADING_CONSTANTS = {
  DEFAULT_BASE_PRICE: 10.00,
  DEFAULT_VOLATILITY: 0.02, // 2%
  DEFAULT_TREND_STRENGTH: 0.1,
  DEFAULT_VOLUME_BASE: 100,
  DEFAULT_AUTO_INTERVAL: 60000, // 60 seconds (1 minute)
  DEFAULT_MANUAL_DURATION: 300, // 5 minutes
  SUPPORTED_RESOLUTIONS: ['1', '5', '15', '60', '1D'],
  SYMBOL: 'ZPHUSD',
  PRICE_SCALE: 100,
  MIN_MOVEMENT: 1,
} as const;
