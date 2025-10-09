import { Candle, CandleGenerationParams, ManualControl } from '../types/trading';
import { TRADING_CONSTANTS } from '../types/trading';

// Market regime types
type MarketRegime = 'accumulation' | 'markup' | 'distribution' | 'markdown';

interface SupportResistanceLevel {
  price: number;
  strength: number; // 0-1, how strong this level is
  touches: number; // how many times price touched this level
  lastTouch: number; // timestamp
}

export class CandleGenerator {
  private basePrice: number;
  private volatility: number;
  private trendStrength: number;
  private volumeBase: number;
  private currentTrend: number = 0;
  private lastPrice: number;
  
  // Hyper-realistic features
  private marketRegime: MarketRegime = 'accumulation';
  private regimeStartTime: number = Date.now();
  private regimeCandleCount: number = 0;
  private supportResistanceLevels: SupportResistanceLevel[] = [];
  private recentHighs: number[] = [];
  private recentLows: number[] = [];
  private volatilityHistory: number[] = []; // Track recent volatility
  private lastBigMove: number = 0; // Track when last big move happened
  private consolidationCounter: number = 0; // Force consolidation after big moves
  private eventCooldown: number = 0; // Cooldown for random events
  
  // Realistic limits (based on Solana analysis)
  private readonly MAX_NORMAL_CHANGE = 0.025; // 2.5% per candle (normal)
  private readonly MAX_VOLATILE_CHANGE = 0.05; // 5% per candle (volatile)
  private readonly MAX_EXTREME_CHANGE = 0.10; // 10% per candle (extreme events)
  private readonly MAX_DEVIATION_FROM_MA = 0.30; // 30% max from moving average
  private readonly CONSOLIDATION_PROBABILITY = 0.70; // 70% time sideways
  private readonly CRASH_SPEED_MULTIPLIER = 3.0; // Crashes 3x faster than rallies

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
    
    // Initialize support/resistance at base price
    this.addSupportResistance(basePrice, 1.0);
  }

  /**
   * Generate a new candle based on previous candle and current parameters
   * HYPER-REALISTIC SOLANA-STYLE ALGORITHM
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
    const timestamp = Math.floor(now / 60000) * 60000;
    const previousClose = previousCandle?.close || basePrice;
    
    this.regimeCandleCount++;
    this.lastPrice = previousClose;
    
    // Track recent highs/lows for support/resistance
    this.updatePriceHistory(previousClose);
    
    // Update market regime periodically
    if (this.regimeCandleCount > 30) {
      this.updateMarketRegime();
    }
    
    // Decrement cooldowns
    if (this.consolidationCounter > 0) this.consolidationCounter--;
    if (this.eventCooldown > 0) this.eventCooldown--;
    
    const open = previousClose;
    let priceChange = 0;
    
    // Manual mode overrides everything
    if (manualDirection && manualDirection !== 'neutral') {
      priceChange = this.calculateManualChange(
        previousClose,
        manualDirection,
        manualSpeed,
        manualIntensity
      );
    } else {
      // AUTO MODE - HYPER-REALISTIC
      priceChange = this.calculateRealisticPriceChange(
        previousClose,
        volatility,
        trendStrength
      );
    }
    
    // Apply circuit breakers and limits
    priceChange = this.applyCircuitBreakers(previousClose, priceChange);
    
    // Calculate close price
    let close = Math.max(0.01, open + priceChange);
    
    // Check for support/resistance levels
    close = this.applySupportResistance(close, previousClose);
    
    // Generate realistic high and low
    const { high, low } = this.generateRealisticHighLow(open, close, volatility);
    
    // Generate volume based on price action
    const volume = this.generateRealisticVolume(volumeBase, priceChange, previousClose);
    
    // Update support/resistance levels
    this.updateSupportResistance(high, low, close);
    
    // Track volatility
    const candleVolatility = Math.abs(priceChange / previousClose);
    this.volatilityHistory.push(candleVolatility);
    if (this.volatilityHistory.length > 20) this.volatilityHistory.shift();

    return {
      symbol: TRADING_CONSTANTS.SYMBOL,
      timestamp,
      open: this.roundPrice(open),
      high: this.roundPrice(high),
      low: this.roundPrice(low),
      close: this.roundPrice(close),
      volume: this.roundVolume(volume),
      mode: manualDirection ? 'manual' : 'auto',
      resolution: '1'
    };
  }

  /**
   * Calculate manual price change (user controlled)
   */
  private calculateManualChange(
    currentPrice: number,
    direction: 'up' | 'down',
    speed: number,
    intensity: number
  ): number {
    const dir = direction === 'up' ? 1 : -1;
    return currentPrice * dir * speed * intensity;
  }

  /**
   * HYPER-REALISTIC price change calculation
   * Based on real Solana market behavior
   */
  private calculateRealisticPriceChange(
    currentPrice: number,
    volatility: number,
    trendStrength: number
  ): number {
    // Check if in forced consolidation period
    if (this.consolidationCounter > 0) {
      return this.calculateConsolidationMove(currentPrice);
    }
    
    // Random event system (1% chance per candle)
    if (this.eventCooldown === 0 && Math.random() < 0.01) {
      return this.triggerRandomEvent(currentPrice);
    }
    
    // Determine if this should be a trending or consolidating candle
    const shouldTrend = Math.random() > this.CONSOLIDATION_PROBABILITY;
    
    if (!shouldTrend || this.marketRegime === 'accumulation' || this.marketRegime === 'distribution') {
      // Sideways/consolidation movement (70% of the time)
      return this.calculateConsolidationMove(currentPrice);
    }
    
    // Trending movement (30% of the time)
    return this.calculateTrendingMove(currentPrice, volatility, trendStrength);
  }

  /**
   * Calculate consolidation/sideways movement (small fluctuations)
   */
  private calculateConsolidationMove(currentPrice: number): number {
    // Very small random movements ±0.5-1%
    const maxMove = currentPrice * 0.01; // Max 1%
    const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
    return maxMove * randomFactor * 0.5; // ±0.5%
  }

  /**
   * Calculate trending movement based on market regime
   */
  private calculateTrendingMove(
    currentPrice: number,
    volatility: number,
    trendStrength: number
  ): number {
    let change = 0;
    
    // 1. Base random component
    const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
    
    // 2. Market regime determines direction bias
    let regimeBias = 0;
    switch (this.marketRegime) {
      case 'markup': // Bullish
        regimeBias = 0.6; // 60% bullish bias
        break;
      case 'markdown': // Bearish
        regimeBias = -0.6; // 60% bearish bias
        break;
      case 'accumulation':
      case 'distribution':
      default:
        regimeBias = 0; // Neutral
    }
    
    // 3. Update trend momentum
    this.updateRealisticTrend(randomFactor, regimeBias);
    
    // 4. Calculate change with regime bias
    const directionFactor = randomFactor * 0.4 + this.currentTrend * 0.6; // Weighted
    
    // 5. Apply asymmetric movement (crashes faster than rallies)
    let moveSize = currentPrice * volatility;
    if (directionFactor < 0) {
      moveSize *= this.CRASH_SPEED_MULTIPLIER; // Down moves 3x stronger
    }
    
    change = moveSize * directionFactor;
    
    // 6. Volatility clustering (high vol follows high vol)
    const avgVolatility = this.getAverageVolatility();
    if (avgVolatility > volatility * 1.5) {
      change *= 1.3; // Amplify moves during volatile periods
    }
    
    // 7. Mean reversion (stronger at extremes)
    const deviation = (currentPrice - this.basePrice) / this.basePrice;
    const meanReversionStrength = Math.abs(deviation) * 0.05; // Stronger further from base
    const meanReversion = -deviation * meanReversionStrength * currentPrice;
    change += meanReversion;
    
    return change;
  }

  /**
   * Update trend with regime bias and momentum
   */
  private updateRealisticTrend(randomFactor: number, regimeBias: number): void {
    // Trend decays over time (but slower than before)
    this.currentTrend *= 0.92;
    
    // Add new trend component with regime bias
    const trendIncrement = (randomFactor * 0.3 + regimeBias * 0.7) * 0.15;
    this.currentTrend += trendIncrement;
    
    // Limit trend strength
    this.currentTrend = Math.max(-1, Math.min(1, this.currentTrend));
  }

  /**
   * Trigger random market events (news, flash crashes, pumps)
   */
  private triggerRandomEvent(currentPrice: number): number {
    const eventType = Math.random();
    
    // Set cooldown to prevent consecutive events
    this.eventCooldown = 30 + Math.floor(Math.random() * 30); // 30-60 candles
    
    if (eventType < 0.4) {
      // Good news pump (+5-10%)
      console.log('🚀 Random EVENT: Good news pump!');
      const pumpSize = 0.05 + Math.random() * 0.05; // 5-10%
      this.consolidationCounter = 5; // Force consolidation after
      return currentPrice * pumpSize;
    } else if (eventType < 0.7) {
      // Bad news dump (-8-15%)
      console.log('📉 Random EVENT: Bad news dump!');
      const dumpSize = -(0.08 + Math.random() * 0.07); // -8-15%
      this.consolidationCounter = 8; // Force consolidation after
      return currentPrice * dumpSize;
    } else {
      // Flash crash/wick (-5-8% then will recover)
      console.log('⚡ Random EVENT: Flash crash!');
      const flashSize = -(0.05 + Math.random() * 0.03); // -5-8%
      this.consolidationCounter = 3;
      return currentPrice * flashSize;
    }
  }

  /**
   * Apply circuit breakers and realistic limits
   * PREVENTS 319 -> 17 CRASHES!
   */
  private applyCircuitBreakers(currentPrice: number, priceChange: number): number {
    const changePercent = Math.abs(priceChange / currentPrice);
    
    // Determine max allowed change based on volatility state
    const avgVolatility = this.getAverageVolatility();
    let maxChange = this.MAX_NORMAL_CHANGE; // Default 2.5%
    
    if (avgVolatility > 0.03) {
      // High volatility environment
      maxChange = this.MAX_VOLATILE_CHANGE; // 5%
    }
    
    // Allow extreme events rarely
    if (this.eventCooldown > 0 && this.eventCooldown > 25) {
      // Just triggered an event, allow bigger move
      maxChange = this.MAX_EXTREME_CHANGE; // 10%
    }
    
    // Cap the change
    if (changePercent > maxChange) {
      const direction = priceChange > 0 ? 1 : -1;
      priceChange = currentPrice * maxChange * direction;
      console.log(`⚠️ Circuit breaker! Capping move to ${(maxChange * 100).toFixed(1)}%`);
      
      // Force consolidation after hitting circuit breaker
      this.consolidationCounter = Math.max(this.consolidationCounter, 10);
    }
    
    // Check deviation from moving average (prevent runaway trends)
    const movingAverage = this.getMovingAverage();
    if (movingAverage > 0) {
      const newPrice = currentPrice + priceChange;
      const deviation = Math.abs(newPrice - movingAverage) / movingAverage;
      
      if (deviation > this.MAX_DEVIATION_FROM_MA) {
        // Too far from MA, pull back
        console.log(`⚠️ Emergency stop! Price too far from MA (${(deviation * 100).toFixed(1)}%)`);
        const maxPrice = movingAverage * (1 + this.MAX_DEVIATION_FROM_MA);
        const minPrice = movingAverage * (1 - this.MAX_DEVIATION_FROM_MA);
        const targetPrice = Math.max(minPrice, Math.min(maxPrice, currentPrice + priceChange));
        priceChange = targetPrice - currentPrice;
        
        // Force strong consolidation
        this.consolidationCounter = 20;
        // Reset trend
        this.currentTrend *= 0.5;
      }
    }
    
    return priceChange;
  }

  /**
   * Generate realistic high and low prices with wicks
   */
  private generateRealisticHighLow(open: number, close: number, volatility: number): { high: number; low: number } {
    const bodySize = Math.abs(close - open);
    const priceLevel = Math.max(open, close);
    
    // Wicks can be 0.5x to 2x the body size
    const wickMultiplier = 0.5 + Math.random() * 1.5;
    const maxWickSize = Math.max(bodySize, priceLevel * volatility * 0.3) * wickMultiplier;
    
    // High wick
    const highWickSize = Math.random() * maxWickSize;
    const high = Math.max(open, close) + highWickSize;
    
    // Low wick
    const lowWickSize = Math.random() * maxWickSize;
    const low = Math.min(open, close) - lowWickSize;
    
    return { high, low: Math.max(0.01, low) };
  }

  /**
   * Generate realistic volume based on price action and regime
   */
  private generateRealisticVolume(baseVolume: number, priceChange: number, currentPrice: number): number {
    // Base volume
    let volume = baseVolume;
    
    // Price movement impact (bigger moves = more volume)
    const priceChangePercent = Math.abs(priceChange / currentPrice);
    const priceImpact = 1 + priceChangePercent * 20; // Large moves have 2-3x volume
    volume *= priceImpact;
    
    // Market regime impact
    switch (this.marketRegime) {
      case 'markup': // Bull run = higher volume
        volume *= 1.3;
        break;
      case 'markdown': // Panic selling = highest volume
        volume *= 1.8;
        break;
      case 'distribution': // Smart money exiting = moderate volume
        volume *= 1.1;
        break;
      case 'accumulation': // Quiet accumulation = lower volume
        volume *= 0.7;
        break;
    }
    
    // Random variation
    volume *= 0.7 + Math.random() * 0.6; // 0.7-1.3x
    
    // Volume should be higher during volatility
    const avgVolatility = this.getAverageVolatility();
    if (avgVolatility > 0.03) {
      volume *= 1.2;
    }
    
    return volume;
  }

  /**
   * Apply support/resistance levels (price "sticks" to key levels)
   */
  private applySupportResistance(targetPrice: number, currentPrice: number): number {
    const direction = targetPrice > currentPrice ? 1 : -1;
    
    // Check if price is near a support/resistance level
    for (const level of this.supportResistanceLevels) {
      const distanceToLevel = Math.abs(targetPrice - level.price) / level.price;
      
      // If within 1% of a strong level
      if (distanceToLevel < 0.01 && level.strength > 0.5) {
        // Price "magnets" to the level
        const magnetStrength = level.strength * 0.5;
        if (Math.random() < magnetStrength) {
          console.log(`💫 Price magneted to S/R level: $${level.price.toFixed(2)}`);
          level.touches++;
          level.lastTouch = Date.now();
          return level.price;
        }
      }
      
      // If trying to break through a level
      if (direction > 0 && targetPrice > level.price && currentPrice <= level.price) {
        // Trying to break resistance
        if (Math.random() < level.strength * 0.6) {
          // Rejection at resistance
          console.log(`🔴 Rejected at resistance: $${level.price.toFixed(2)}`);
          return level.price * 0.998; // Slight pullback
        } else {
          // Breakout! Weaken the level
          level.strength *= 0.7;
          console.log(`🟢 Breakout above resistance: $${level.price.toFixed(2)}`);
        }
      } else if (direction < 0 && targetPrice < level.price && currentPrice >= level.price) {
        // Trying to break support
        if (Math.random() < level.strength * 0.6) {
          // Bounce at support
          console.log(`🟢 Bounced off support: $${level.price.toFixed(2)}`);
          return level.price * 1.002; // Slight bounce
        } else {
          // Breakdown! Weaken the level
          level.strength *= 0.7;
          console.log(`🔴 Breakdown below support: $${level.price.toFixed(2)}`);
        }
      }
    }
    
    return targetPrice;
  }

  /**
   * Update price history for S/R tracking
   */
  private updatePriceHistory(price: number): void {
    this.recentHighs.push(price);
    this.recentLows.push(price);
    
    // Keep only last 100 candles
    if (this.recentHighs.length > 100) this.recentHighs.shift();
    if (this.recentLows.length > 100) this.recentLows.shift();
  }

  /**
   * Update support/resistance levels from new candle
   */
  private updateSupportResistance(high: number, low: number, close: number): void {
    // Add significant high/low as potential S/R
    const recentHigh = Math.max(...this.recentHighs.slice(-20));
    const recentLow = Math.min(...this.recentLows.slice(-20));
    
    // New high - potential resistance
    if (high >= recentHigh) {
      this.addSupportResistance(high, 0.6);
    }
    
    // New low - potential support
    if (low <= recentLow) {
      this.addSupportResistance(low, 0.6);
    }
    
    // Round number support/resistance (psychological levels)
    const roundLevels = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500];
    for (const level of roundLevels) {
      if (Math.abs(close - level) / level < 0.05) {
        // Within 5% of round number
        this.addSupportResistance(level, 0.8); // Strong psychological level
      }
    }
    
    // Clean up old/weak levels
    this.supportResistanceLevels = this.supportResistanceLevels
      .filter(level => level.strength > 0.2) // Remove weak levels
      .slice(-15); // Keep only last 15 levels
  }

  /**
   * Add or strengthen a support/resistance level
   */
  private addSupportResistance(price: number, strength: number): void {
    // Check if level already exists nearby
    const existing = this.supportResistanceLevels.find(
      level => Math.abs(level.price - price) / price < 0.02 // Within 2%
    );
    
    if (existing) {
      // Strengthen existing level
      existing.strength = Math.min(1.0, existing.strength + strength * 0.2);
      existing.touches++;
      existing.lastTouch = Date.now();
    } else {
      // Add new level
      this.supportResistanceLevels.push({
        price,
        strength: Math.min(1.0, strength),
        touches: 1,
        lastTouch: Date.now()
      });
    }
  }

  /**
   * Update market regime (accumulation -> markup -> distribution -> markdown)
   */
  private updateMarketRegime(): void {
    const timeSinceRegimeStart = Date.now() - this.regimeStartTime;
    const candlesSinceStart = this.regimeCandleCount;
    
    // Calculate recent price trend
    const recentPrices = this.recentHighs.slice(-30);
    if (recentPrices.length < 10) return;
    
    const oldPrice = recentPrices[0];
    const newPrice = recentPrices[recentPrices.length - 1];
    const priceChange = (newPrice - oldPrice) / oldPrice;
    
    // Regime transition logic
    const shouldTransition = candlesSinceStart > 40 && Math.random() < 0.3; // 30% chance after 40 candles
    
    if (shouldTransition) {
      const oldRegime = this.marketRegime;
      
      switch (this.marketRegime) {
        case 'accumulation':
          // Accumulation -> Markup (start bull run)
          if (priceChange > 0.05 || Math.random() < 0.4) {
            this.marketRegime = 'markup';
            console.log('📊 Market Regime: ACCUMULATION -> MARKUP (Bull Run Starting!)');
          }
          break;
          
        case 'markup':
          // Markup -> Distribution (topping out)
          if (priceChange < 0.02 || Math.random() < 0.3) {
            this.marketRegime = 'distribution';
            console.log('📊 Market Regime: MARKUP -> DISTRIBUTION (Topping Out)');
          }
          break;
          
        case 'distribution':
          // Distribution -> Markdown (start bear)
          if (priceChange < -0.05 || Math.random() < 0.4) {
            this.marketRegime = 'markdown';
            console.log('📊 Market Regime: DISTRIBUTION -> MARKDOWN (Bear Market!)');
          }
          break;
          
        case 'markdown':
          // Markdown -> Accumulation (bottoming)
          if (priceChange > -0.02 || Math.random() < 0.3) {
            this.marketRegime = 'accumulation';
            console.log('📊 Market Regime: MARKDOWN -> ACCUMULATION (Bottoming)');
          }
          break;
      }
      
      if (oldRegime !== this.marketRegime) {
        this.regimeStartTime = Date.now();
        this.regimeCandleCount = 0;
        this.currentTrend = 0; // Reset trend on regime change
      }
    }
  }

  /**
   * Get average recent volatility
   */
  private getAverageVolatility(): number {
    if (this.volatilityHistory.length === 0) return this.volatility;
    const sum = this.volatilityHistory.reduce((a, b) => a + b, 0);
    return sum / this.volatilityHistory.length;
  }

  /**
   * Get moving average of recent prices
   */
  private getMovingAverage(): number {
    const prices = [...this.recentHighs, ...this.recentLows];
    if (prices.length === 0) return 0;
    
    // Use last 50 prices for MA
    const recentPrices = prices.slice(-50);
    const sum = recentPrices.reduce((a, b) => a + b, 0);
    return sum / recentPrices.length;
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
   * Get current generator state (for debugging)
   */
  getState() {
    return {
      basePrice: this.basePrice,
      volatility: this.volatility,
      trendStrength: this.trendStrength,
      volumeBase: this.volumeBase,
      currentTrend: this.currentTrend,
      lastPrice: this.lastPrice,
      marketRegime: this.marketRegime,
      regimeCandleCount: this.regimeCandleCount,
      supportResistanceLevels: this.supportResistanceLevels.length,
      consolidationCounter: this.consolidationCounter,
      eventCooldown: this.eventCooldown,
      averageVolatility: this.getAverageVolatility(),
      movingAverage: this.getMovingAverage()
    };
  }
}
