import { supabase } from '../config/supabase';
import { redis } from '../config/redis';
import { CandleGenerator } from './candleGenerator';
import { WebSocketService } from './websocketService';
import { 
  Candle, 
  ManualControl, 
  TradingConfig, 
  SystemStatus, 
  TradingMode,
  REDIS_KEYS,
  TRADING_CONSTANTS 
} from '../types/trading';

export class TradingService {
  private candleGenerator: CandleGenerator;
  private wsService: WebSocketService | null = null;
  private isRunning: boolean = false;
  private autoInterval: NodeJS.Timeout | null = null;
  private priceStreamInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();
  private currentPrice: number = TRADING_CONSTANTS.DEFAULT_BASE_PRICE;
  
  // Live OHLC tracking for current candle
  private currentCandleOpen: number = TRADING_CONSTANTS.DEFAULT_BASE_PRICE;
  private currentCandleHigh: number = TRADING_CONSTANTS.DEFAULT_BASE_PRICE;
  private currentCandleLow: number = TRADING_CONSTANTS.DEFAULT_BASE_PRICE;
  private currentCandleVolume: number = 0;
  private currentCandleStartTime: number = Date.now();

  constructor() {
    this.candleGenerator = new CandleGenerator();
  }

  /**
   * Set the WebSocket service for broadcasting updates
   */
  setWebSocketService(wsService: WebSocketService): void {
    this.wsService = wsService;
  }

  /**
   * Start the trading service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Trading service is already running');
      return;
    }

    console.log('Starting Zypher Trading Service...');
    this.isRunning = true;
    this.startTime = Date.now();

    // Load configuration from database
    await this.loadConfiguration();

    // Start auto mode
    await this.startAutoMode();

    console.log('Trading service started successfully');
  }

  /**
   * Stop the trading service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Trading service is not running');
      return;
    }

    console.log('Stopping Zypher Trading Service...');
    this.isRunning = false;

    if (this.autoInterval) {
      clearInterval(this.autoInterval);
      this.autoInterval = null;
    }

    if (this.priceStreamInterval) {
      clearInterval(this.priceStreamInterval);
      this.priceStreamInterval = null;
    }

    console.log('Trading service stopped');
  }

  /**
   * Load configuration from database
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const { data: configs, error } = await supabase
        .from('trading_config')
        .select('*');

      if (error) {
        console.error('Error loading configuration:', error);
        return;
      }

      const configMap = new Map(configs?.map(c => [c.key, c.value]) || []);

      this.candleGenerator.updateParameters({
        basePrice: parseFloat(configMap.get('base_price') || TRADING_CONSTANTS.DEFAULT_BASE_PRICE.toString()),
        volatility: parseFloat(configMap.get('volatility') || TRADING_CONSTANTS.DEFAULT_VOLATILITY.toString()),
        trendStrength: parseFloat(configMap.get('trend_strength') || TRADING_CONSTANTS.DEFAULT_TREND_STRENGTH.toString()),
        volumeBase: parseFloat(configMap.get('volume_base') || TRADING_CONSTANTS.DEFAULT_VOLUME_BASE.toString())
      });

      console.log('Configuration loaded successfully');
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  }

  /**
   * Start auto mode candle generation
   */
  private async startAutoMode(): Promise<void> {
    // Generate 1-minute candles (60,000ms = 60 seconds)
    const interval = parseInt(process.env.AUTO_INTERVAL_MS || '60000');

    this.autoInterval = setInterval(async () => {
      try {
        await this.generateAndStoreCandle();
      } catch (error) {
        console.error('Error generating candle:', error);
      }
    }, interval);

    // Start real-time price streaming (every 1 second)
    this.startPriceStreaming();

    console.log(`Auto mode started with ${interval}ms interval (${interval/1000} seconds)`);
  }

  /**
   * Start real-time price streaming
   */
  private startPriceStreaming(): void {
    this.priceStreamInterval = setInterval(() => {
      try {
        this.updateRealTimePrice();
      } catch (error) {
        console.error('Error updating real-time price:', error);
      }
    }, 1000); // Update every 1 second

    console.log('Real-time price streaming started (1 second intervals)');
  }

  /**
   * Update real-time price with small fluctuations
   */
  private updateRealTimePrice(): void {
    // Get the last candle's close price as base
    const basePrice = this.currentPrice;
    
    // Add small random fluctuation (±0.1% to ±0.5%)
    const fluctuation = basePrice * (Math.random() * 0.006 - 0.003); // -0.3% to +0.3%
    const newPrice = basePrice + fluctuation;
    
    // Ensure price doesn't go below minimum
    this.currentPrice = Math.max(newPrice, 0.01);
    
    // Update live OHLC for current candle
    this.updateLiveOHLC();
    
    // Broadcast real-time price update via WebSocket
    if (this.wsService) {
      this.wsService.broadcastPriceUpdate({
        symbol: TRADING_CONSTANTS.SYMBOL,
        price: this.currentPrice,
        timestamp: Date.now(),
        change: fluctuation,
        changePercent: (fluctuation / basePrice) * 100
      });
    }
    
    // Cache current price in Redis
    redis.set(REDIS_KEYS.CURRENT_PRICE, this.currentPrice.toString());
  }

  /**
   * Update live OHLC for current candle and broadcast
   */
  private updateLiveOHLC(): void {
    const now = Date.now();
    const candleStartTime = Math.floor(now / TRADING_CONSTANTS.DEFAULT_AUTO_INTERVAL) * TRADING_CONSTANTS.DEFAULT_AUTO_INTERVAL;
    
    // Check if we need to start a new candle
    if (candleStartTime !== this.currentCandleStartTime) {
      this.currentCandleStartTime = candleStartTime;
      this.currentCandleOpen = this.currentPrice;
      this.currentCandleHigh = this.currentPrice;
      this.currentCandleLow = this.currentPrice;
      this.currentCandleVolume = 0;
    }
    
    // Update high and low
    this.currentCandleHigh = Math.max(this.currentCandleHigh, this.currentPrice);
    this.currentCandleLow = Math.min(this.currentCandleLow, this.currentPrice);
    
    // Add small volume increment
    this.currentCandleVolume += Math.random() * 10 + 5; // 5-15 volume per update
    
    // Calculate time remaining until candle closes
    const timeRemaining = Math.max(0, (candleStartTime + TRADING_CONSTANTS.DEFAULT_AUTO_INTERVAL - now) / 1000);
    
    // Broadcast live OHLC update
    if (this.wsService) {
      this.wsService.broadcastLiveOHLC({
        symbol: TRADING_CONSTANTS.SYMBOL,
        timestamp: now,
        open: this.currentCandleOpen,
        high: this.currentCandleHigh,
        low: this.currentCandleLow,
        close: this.currentPrice,
        volume: this.currentCandleVolume,
        resolution: '1',
        timeRemaining: Math.floor(timeRemaining)
      });
    }
  }

  /**
   * Generate and store a new candle
   */
  async generateAndStoreCandle(): Promise<Candle> {
    // Get the last candle
    const lastCandle = await this.getLastCandle();
    
    // Check for active manual control
    const manualControl = await this.getActiveManualControl();
    
    // Generate new candle
    const newCandle = this.candleGenerator.generateCandle({
      previousCandle: lastCandle || undefined,
      manualDirection: manualControl?.direction,
      manualSpeed: manualControl?.speed,
      manualIntensity: manualControl?.intensity
    });

    // Store in database
    await this.storeCandle(newCandle);

    // Cache in Redis
    await this.cacheCandle(newCandle);

    // Update current price for real-time streaming
    this.currentPrice = newCandle.close;

    // Reset live OHLC tracking for new candle
    this.currentCandleOpen = newCandle.open;
    this.currentCandleHigh = newCandle.high;
    this.currentCandleLow = newCandle.low;
    this.currentCandleVolume = newCandle.volume;
    this.currentCandleStartTime = newCandle.timestamp;

    // Broadcast new candle via WebSocket
    if (this.wsService) {
      this.wsService.broadcastCandle(newCandle);
    }

    // Update system status
    await this.updateSystemStatus(newCandle);

    return newCandle;
  }

  /**
   * Get the last candle from database
   */
  private async getLastCandle(): Promise<Candle | null> {
    try {
      const { data, error } = await supabase
        .from('candles')
        .select('*')
        .eq('symbol', TRADING_CONSTANTS.SYMBOL)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error getting last candle:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error getting last candle:', error);
      return null;
    }
  }

  /**
   * Get active manual control
   */
  private async getActiveManualControl(): Promise<ManualControl | null> {
    try {
      const { data, error } = await supabase
        .from('manual_control')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting manual control:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error getting manual control:', error);
      return null;
    }
  }

  /**
   * Store candle in database
   */
  private async storeCandle(candle: Candle): Promise<void> {
    try {
      const { error } = await supabase
        .from('candles')
        .insert([candle]);

      if (error) {
        console.error('Error storing candle:', error);
      }
    } catch (error) {
      console.error('Error storing candle:', error);
    }
  }

  /**
   * Cache candle in Redis
   */
  private async cacheCandle(candle: Candle): Promise<void> {
    try {
      await Promise.all([
        redis.set(REDIS_KEYS.LAST_CANDLE, JSON.stringify(candle)),
        redis.set(REDIS_KEYS.CURRENT_PRICE, candle.close.toString()),
        redis.setex(REDIS_KEYS.LIVE_TICKS, 60, JSON.stringify(candle)) // Cache for 60 seconds
      ]);
    } catch (error) {
      console.error('Error caching candle:', error);
    }
  }

  /**
   * Update system status
   */
  private async updateSystemStatus(candle: Candle): Promise<void> {
    try {
      const status: SystemStatus = {
        mode: candle.mode,
        isRunning: this.isRunning,
        lastCandleTime: candle.timestamp,
        currentPrice: candle.close,
        totalCandles: await this.getTotalCandlesCount(),
        uptime: Date.now() - this.startTime,
        activeManualControl: await this.getActiveManualControl() || undefined
      };

      await redis.set(REDIS_KEYS.SYSTEM_STATUS, JSON.stringify(status));

      // Broadcast system status via WebSocket
      if (this.wsService) {
        this.wsService.broadcastSystemStatus(status);
      }
    } catch (error) {
      console.error('Error updating system status:', error);
    }
  }

  /**
   * Get total candles count
   */
  private async getTotalCandlesCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('candles')
        .select('*', { count: 'exact', head: true })
        .eq('symbol', TRADING_CONSTANTS.SYMBOL);

      if (error) {
        console.error('Error getting candles count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting candles count:', error);
      return 0;
    }
  }

  /**
   * Set trading mode
   */
  async setMode(mode: 'auto' | 'manual'): Promise<void> {
    try {
      await supabase
        .from('trading_config')
        .update({ value: mode })
        .eq('key', 'current_mode');

      await redis.set(REDIS_KEYS.TRADING_MODE, JSON.stringify({
        mode,
        lastUpdated: new Date().toISOString()
      }));

      // Broadcast mode change via WebSocket
      if (this.wsService) {
        this.wsService.broadcastModeChange(mode);
      }

      console.log(`Trading mode set to: ${mode}`);
    } catch (error) {
      console.error('Error setting mode:', error);
      throw error;
    }
  }

  /**
   * Get current trading mode
   */
  async getMode(): Promise<TradingMode> {
    try {
      const cached = await redis.get(REDIS_KEYS.TRADING_MODE);
      if (cached && typeof cached === 'string') {
        return JSON.parse(cached);
      }

      const { data, error } = await supabase
        .from('trading_config')
        .select('value')
        .eq('key', 'current_mode')
        .single();

      if (error) {
        throw error;
      }

      const mode: TradingMode = {
        mode: data.value as 'auto' | 'manual',
        lastUpdated: new Date().toISOString()
      };

      await redis.set(REDIS_KEYS.TRADING_MODE, JSON.stringify(mode));
      return mode;
    } catch (error) {
      console.error('Error getting mode:', error);
      return {
        mode: 'auto',
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Create manual control
   */
  async createManualControl(control: Omit<ManualControl, 'id' | 'created_at' | 'expires_at'>): Promise<ManualControl> {
    try {
      const expiresAt = new Date(Date.now() + (control.duration_seconds * 1000));

      const { data, error } = await supabase
        .from('manual_control')
        .insert([{
          ...control,
          expires_at: expiresAt.toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Cache the manual control
      await redis.set(REDIS_KEYS.MANUAL_CONTROL, JSON.stringify(data));

      // Broadcast manual control via WebSocket
      if (this.wsService) {
        this.wsService.broadcastManualControl(data);
      }

      console.log(`Manual control created: ${control.direction} at ${control.speed} speed`);
      return data;
    } catch (error) {
      console.error('Error creating manual control:', error);
      throw error;
    }
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const cached = await redis.get(REDIS_KEYS.SYSTEM_STATUS);
      if (cached && typeof cached === 'string') {
        return JSON.parse(cached);
      }

      // Generate status if not cached
      const lastCandle = await this.getLastCandle();
      const activeManualControl = await this.getActiveManualControl();

      const status: SystemStatus = {
        mode: lastCandle?.mode || 'auto',
        isRunning: this.isRunning,
        lastCandleTime: lastCandle?.timestamp || 0,
        currentPrice: lastCandle?.close || TRADING_CONSTANTS.DEFAULT_BASE_PRICE,
        totalCandles: await this.getTotalCandlesCount(),
        uptime: Date.now() - this.startTime,
        activeManualControl: activeManualControl || undefined
      };

      await redis.set(REDIS_KEYS.SYSTEM_STATUS, JSON.stringify(status));
      return status;
    } catch (error) {
      console.error('Error getting system status:', error);
      throw error;
    }
  }

  /**
   * Get historical candles
   */
  async getHistoricalCandles(
    symbol: string,
    resolution: string,
    from: number,
    to: number,
    limit: number = 1000
  ): Promise<Candle[]> {
    try {
      // Convert seconds to milliseconds for database query
      const fromMs = from * 1000;
      const toMs = to * 1000;
      
      console.log(`Querying candles: symbol=${symbol}, resolution=${resolution}, from=${fromMs}, to=${toMs}`);
      
      // First, let's check what data exists without filters
      const { data: allData, error: allError } = await supabase
        .from('candles')
        .select('symbol, resolution, timestamp')
        .order('timestamp', { ascending: false })
        .limit(5);
      
      console.log('Sample data in database:', allData);
      
      // Try a simpler query first - just get candles for the symbol and resolution
      const { data: simpleData, error: simpleError } = await supabase
        .from('candles')
        .select('*')
        .eq('symbol', symbol)
        .eq('resolution', resolution)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      console.log('Simple query result:', simpleData);
      
      const { data, error } = await supabase
        .from('candles')
        .select('*')
        .eq('symbol', symbol)
        .eq('resolution', resolution)
        .gte('timestamp', fromMs)
        .lte('timestamp', toMs)
        .order('timestamp', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Database query error:', error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} candles in database`);
      
      // If no data found with time filters, try without time filters
      if (!data || data.length === 0) {
        console.log('No data with time filters, trying without time filters...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('candles')
          .select('*')
          .eq('symbol', symbol)
          .eq('resolution', resolution)
          .order('timestamp', { ascending: true })
          .limit(limit);
        
        if (fallbackError) {
          console.error('Fallback query error:', fallbackError);
        } else {
          console.log(`Fallback query found ${fallbackData?.length || 0} candles`);
          return fallbackData || [];
        }
      }
      
      return data || [];
    } catch (error) {
      console.error('Error getting historical candles:', error);
      throw error;
    }
  }

  /**
   * Get current price
   */
  async getCurrentPrice(): Promise<number> {
    try {
      const cached = await redis.get(REDIS_KEYS.CURRENT_PRICE);
      if (cached && typeof cached === 'string') {
        return parseFloat(cached as string);
      }

      const lastCandle = await this.getLastCandle();
      return lastCandle?.close || TRADING_CONSTANTS.DEFAULT_BASE_PRICE;
    } catch (error) {
      console.error('Error getting current price:', error);
      return TRADING_CONSTANTS.DEFAULT_BASE_PRICE;
    }
  }
}
