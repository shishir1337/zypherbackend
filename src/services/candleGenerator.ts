import { Candle, CandleGenerationParams, ManualControl } from '../types/trading';
import { TRADING_CONSTANTS } from '../types/trading';

export class CandleGenerator {
  private basePrice: number;
  private volatility: number;
  private trendStrength: number;
  private volumeBase: number;
  private currentTrend: number = 0;
  private lastPrice: number;

  constructor(
    basePrice: number = TRADING_CONSTANTS.DEFAULT_BASE_PRICE,
    volatility: number = TRADING_CONSTANTS.DEFAULT_VOLATILITY,
    trendStrength: number = TRADING_CONSTANTS.DEFAULT_TREND_STRENGTH,
    volumeBase: number = TRADING_CONSTANTS.DEFAULT_VOLUME_BASE
  ) {
    this.basePrice = basePrice;
    this.volatility = volatility;
    this.trendStrength = trendStrength;
    this.volumeBase = volumeBase;
    this.lastPrice = basePrice;
  }

  /**
   * Generate a new candle based on previous candle and current parameters
   */
  generateCandle(params: CandleGenerationParams): Candle {
    const {
      previousCandle,
      basePrice = this.basePrice,
      volatility = this.volatility,
      trendStrength = this.trendStrength,
      volumeBase = this.volumeBase,
      manualDirection,
      manualSpeed = 0.01,
      manualIntensity = 1.0
    } = params;

    // Round timestamp to the nearest minute for proper 1-minute candles
    const now = Date.now();
    const timestamp = Math.floor(now / 60000) * 60000; // Round to nearest minute
    const previousClose = previousCandle?.close || basePrice;
    
    // Calculate price movement
    let priceChange = this.calculatePriceChange(
      previousClose,
      volatility,
      trendStrength,
      manualDirection,
      manualSpeed,
      manualIntensity
    );

    const open = previousClose;
    const close = Math.max(0.01, open + priceChange); // Ensure price never goes below 0.01

    // Generate realistic high and low
    const { high, low } = this.generateHighLow(open, close, volatility);

    // Generate volume
    const volume = this.generateVolume(volumeBase, Math.abs(priceChange));

    return {
      symbol: TRADING_CONSTANTS.SYMBOL,
      timestamp,
      open: this.roundPrice(open),
      high: this.roundPrice(high),
      low: this.roundPrice(low),
      close: this.roundPrice(close),
      volume: this.roundVolume(volume),
      mode: manualDirection ? 'manual' : 'auto',
      resolution: '1' // Default to 1 minute
    };
  }

  /**
   * Calculate price change based on various factors
   */
  private calculatePriceChange(
    currentPrice: number,
    volatility: number,
    trendStrength: number,
    manualDirection?: 'up' | 'down' | 'neutral',
    manualSpeed?: number,
    manualIntensity?: number
  ): number {
    let change = 0;

    if (manualDirection && manualDirection !== 'neutral') {
      // Manual mode - controlled direction
      const direction = manualDirection === 'up' ? 1 : -1;
      const speed = manualSpeed || 0.01;
      const intensity = manualIntensity || 1.0;
      
      change = currentPrice * direction * speed * intensity;
    } else {
      // Auto mode - realistic market behavior
      
      // 1. Random fluctuation (main component)
      const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
      const randomChange = currentPrice * volatility * randomFactor;

      // 2. Trend component (momentum)
      this.updateTrend(randomFactor, trendStrength);
      const trendChange = currentPrice * this.currentTrend * trendStrength;

      // 3. Mean reversion (prevents extreme price movements)
      const meanReversion = (this.basePrice - currentPrice) * 0.001;

      change = randomChange + trendChange + meanReversion;
    }

    // Add some noise for realism
    const noise = currentPrice * (Math.random() - 0.5) * 0.001;
    change += noise;

    return change;
  }

  /**
   * Update internal trend based on recent movements
   */
  private updateTrend(randomFactor: number, trendStrength: number): void {
    // Trend decays over time
    this.currentTrend *= 0.95;
    
    // Add new trend component
    this.currentTrend += randomFactor * 0.1;
    
    // Limit trend strength
    this.currentTrend = Math.max(-1, Math.min(1, this.currentTrend));
  }

  /**
   * Generate realistic high and low prices
   */
  private generateHighLow(open: number, close: number, volatility: number): { high: number; low: number } {
    const priceRange = Math.max(open, close) * volatility * 0.5;
    
    // High is at least the max of open/close, plus some random increment
    const highIncrement = Math.random() * priceRange;
    const high = Math.max(open, close) + highIncrement;
    
    // Low is at most the min of open/close, minus some random decrement
    const lowDecrement = Math.random() * priceRange;
    const low = Math.min(open, close) - lowDecrement;
    
    return { high, low };
  }

  /**
   * Generate realistic volume based on price movement
   */
  private generateVolume(baseVolume: number, priceChange: number): number {
    // Higher price changes = higher volume
    const volatilityMultiplier = 1 + (priceChange / this.basePrice) * 10;
    
    // Random volume variation
    const randomMultiplier = 0.5 + Math.random();
    
    return baseVolume * volatilityMultiplier * randomMultiplier;
  }

  /**
   * Round price to appropriate decimal places
   */
  private roundPrice(price: number): number {
    return Math.round(price * TRADING_CONSTANTS.PRICE_SCALE) / TRADING_CONSTANTS.PRICE_SCALE;
  }

  /**
   * Round volume to appropriate decimal places
   */
  private roundVolume(volume: number): number {
    return Math.round(volume * 100) / 100;
  }

  /**
   * Generate multiple candles for a time range
   */
  generateCandles(
    count: number,
    startTime: number,
    params: CandleGenerationParams
  ): Candle[] {
    const candles: Candle[] = [];
    let currentTime = startTime;
    let lastCandle: Candle | undefined;

    for (let i = 0; i < count; i++) {
      const candle = this.generateCandle({
        ...params,
        previousCandle: lastCandle
      });
      
      candle.timestamp = currentTime;
      candles.push(candle);
      
      lastCandle = candle;
      currentTime += 60000; // Add 1 minute (60 seconds * 1000 ms)
    }

    return candles;
  }

  /**
   * Update generator parameters
   */
  updateParameters(params: {
    basePrice?: number;
    volatility?: number;
    trendStrength?: number;
    volumeBase?: number;
  }): void {
    if (params.basePrice !== undefined) this.basePrice = params.basePrice;
    if (params.volatility !== undefined) this.volatility = params.volatility;
    if (params.trendStrength !== undefined) this.trendStrength = params.trendStrength;
    if (params.volumeBase !== undefined) this.volumeBase = params.volumeBase;
  }

  /**
   * Reset trend to neutral
   */
  resetTrend(): void {
    this.currentTrend = 0;
  }

  /**
   * Get current generator state
   */
  getState() {
    return {
      basePrice: this.basePrice,
      volatility: this.volatility,
      trendStrength: this.trendStrength,
      volumeBase: this.volumeBase,
      currentTrend: this.currentTrend,
      lastPrice: this.lastPrice
    };
  }
}
