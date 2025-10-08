import { Router, Request, Response } from 'express';
import { TradingService } from '../services/tradingService';
import { ApiResponse } from '../types';
import { 
  TradingViewConfig, 
  TradingViewSymbol, 
  TradingViewHistoryResponse,
  TRADING_CONSTANTS 
} from '../types/trading';

const router: Router = Router();

// Helper to get TradingService instance from app.locals
const getTradingService = (req: Request): TradingService => {
  return req.app.locals.tradingService as TradingService;
};

// TradingView configuration endpoint
router.get('/config', (req: Request, res: Response) => {
  const config: TradingViewConfig = {
    supports_search: true,
    supports_group_request: false,
    supports_marks: false,
    supports_timescale_marks: false,
    supports_time: true,
    exchanges: [
      {
        value: 'ZPH',
        name: 'Zypher',
        desc: 'Zypher (ZPH) Trading Data'
      }
    ],
    symbols_types: [
      {
        name: 'Crypto',
        value: 'crypto'
      }
    ],
    supported_resolutions: [...TRADING_CONSTANTS.SUPPORTED_RESOLUTIONS]
  };

  const response: ApiResponse = {
    success: true,
    data: config
  };

  return res.json(response);
});

// TradingView symbols endpoint
router.get('/symbols', (req: Request, res: Response) => {
  const symbol: TradingViewSymbol = {
    name: 'Zypher',
    ticker: TRADING_CONSTANTS.SYMBOL,
    type: 'crypto',
    session: '24x7',
    timezone: 'Etc/UTC',
    pricescale: TRADING_CONSTANTS.PRICE_SCALE,
    minmov: TRADING_CONSTANTS.MIN_MOVEMENT,
    fractional: false,
    has_intraday: true,
    has_weekly_and_monthly: false,
    supported_resolutions: [...TRADING_CONSTANTS.SUPPORTED_RESOLUTIONS],
    volume_precision: 2,
    data_status: 'streaming'
  };

  const response: ApiResponse = {
    success: true,
    data: symbol
  };

  return res.json(response);
});

// TradingView history endpoint
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { 
      symbol = TRADING_CONSTANTS.SYMBOL,
      resolution = '1',
      from,
      to,
      countback = 1000
    } = req.query;

    if (!from || !to) {
      const response: ApiResponse = {
        success: false,
        error: 'from and to parameters are required'
      };
      return res.status(400).json(response);
    }

    const fromTime = parseInt(from as string);
    const toTime = parseInt(to as string);
    const limit = Math.min(parseInt(countback as string), 1000);

    // Get historical candles
    const tradingService = getTradingService(req);
    const candles = await tradingService.getHistoricalCandles(
      symbol as string,
      resolution as string,
      fromTime,
      toTime,
      limit
    );

    if (candles.length === 0) {
      const response: TradingViewHistoryResponse = {
        s: 'no_data',
        t: [],
        o: [],
        h: [],
        l: [],
        c: [],
        v: []
      };
      return res.json(response);
    }

    // Format for TradingView (convert timestamps from milliseconds to seconds)
    const historyResponse: TradingViewHistoryResponse = {
      s: 'ok',
      t: candles.map(c => Math.floor(c.timestamp / 1000)), // Convert to seconds
      o: candles.map(c => c.open),
      h: candles.map(c => c.high),
      l: candles.map(c => c.low),
      c: candles.map(c => c.close),
      v: candles.map(c => c.volume)
    };

    return res.json(historyResponse);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get historical data',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
    return res.status(500).json(response);
  }
});

// TradingView time endpoint
router.get('/time', (req: Request, res: Response) => {
  const currentTime = Math.floor(Date.now() / 1000);
  
  const response: ApiResponse = {
    success: true,
    data: currentTime
  };

  return res.json(response);
});

// Get current price
router.get('/price', async (req: Request, res: Response) => {
  try {
    const tradingService = getTradingService(req);
    const currentPrice = await tradingService.getCurrentPrice();
    
    const response: ApiResponse = {
      success: true,
      data: {
        symbol: TRADING_CONSTANTS.SYMBOL,
        price: currentPrice,
        timestamp: Date.now()
      }
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get current price',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
    return res.status(500).json(response);
  }
});

// Get system status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const tradingService = getTradingService(req);
    const status = await tradingService.getSystemStatus();
    
    const response: ApiResponse = {
      success: true,
      data: status
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get system status',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
    return res.status(500).json(response);
  }
});

// Get trading mode
router.get('/mode', async (req: Request, res: Response) => {
  try {
    const tradingService = getTradingService(req);
    const mode = await tradingService.getMode();
    
    const response: ApiResponse = {
      success: true,
      data: mode
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get trading mode',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
    return res.status(500).json(response);
  }
});

// Set trading mode
router.post('/mode', async (req: Request, res: Response) => {
  try {
    const { mode } = req.body;

    if (!mode || !['auto', 'manual'].includes(mode)) {
      const response: ApiResponse = {
        success: false,
        error: 'Mode must be either "auto" or "manual"'
      };
      return res.status(400).json(response);
    }

    const tradingService = getTradingService(req);
    await tradingService.setMode(mode);
    
    const response: ApiResponse = {
      success: true,
      message: `Trading mode set to ${mode}`,
      data: { mode }
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to set trading mode',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
    return res.status(500).json(response);
  }
});

// Manual control endpoint
router.post('/manual-control', async (req: Request, res: Response) => {
  try {
    const { 
      direction, 
      speed = 0.01, 
      intensity = 1.0, 
      duration_seconds = 300 
    } = req.body;

    if (!direction || !['up', 'down', 'neutral'].includes(direction)) {
      const response: ApiResponse = {
        success: false,
        error: 'Direction must be "up", "down", or "neutral"'
      };
      return res.status(400).json(response);
    }

    if (speed < 0 || speed > 1) {
      const response: ApiResponse = {
        success: false,
        error: 'Speed must be between 0 and 1'
      };
      return res.status(400).json(response);
    }

    if (intensity < 0 || intensity > 10) {
      const response: ApiResponse = {
        success: false,
        error: 'Intensity must be between 0 and 10'
      };
      return res.status(400).json(response);
    }

    const tradingService = getTradingService(req);
    const manualControl = await tradingService.createManualControl({
      direction,
      speed,
      intensity,
      duration_seconds,
      is_active: true
    });
    
    const response: ApiResponse = {
      success: true,
      message: 'Manual control created successfully',
      data: manualControl
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create manual control',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
    return res.status(500).json(response);
  }
});

// Start trading service
router.post('/start', async (req: Request, res: Response) => {
  try {
    const tradingService = getTradingService(req);
    await tradingService.start();
    
    const response: ApiResponse = {
      success: true,
      message: 'Trading service started successfully'
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to start trading service',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
    return res.status(500).json(response);
  }
});

// Stop trading service
router.post('/stop', async (req: Request, res: Response) => {
  try {
    const tradingService = getTradingService(req);
    await tradingService.stop();
    
    const response: ApiResponse = {
      success: true,
      message: 'Trading service stopped successfully'
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to stop trading service',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
    return res.status(500).json(response);
  }
});

        /**
         * @swagger
         * /api/tradingview/init-db:
         *   post:
         *     summary: Initialize database tables and schema
         *     tags: [TradingView]
         *     responses:
         *       200:
         *         description: Database initialized successfully
         *       500:
         *         description: Database initialization failed
         */
        router.post('/init-db', async (req: Request, res: Response) => {
          try {
            const { initializeDatabase } = await import('../scripts/initDatabase');
            await initializeDatabase();
            return res.json({ success: true, message: 'Database initialized successfully' });
          } catch (error) {
            console.error('Error initializing database:', error);
            return res.status(500).json({ success: false, error: 'Failed to initialize database' });
          }
        });

        /**
         * @swagger
         * /api/tradingview/debug-candles:
         *   get:
         *     summary: Debug endpoint to check candles in database
         *     tags: [TradingView]
         *     responses:
         *       200:
         *         description: Debug information about candles
         */
        router.get('/debug-candles', async (req: Request, res: Response) => {
          try {
            const { supabase } = await import('../config/supabase');
            
            // Get sample data from database
            const { data: sampleData, error: sampleError } = await supabase
              .from('candles')
              .select('symbol, resolution, timestamp, close')
              .order('timestamp', { ascending: false })
              .limit(5);

            if (sampleError) {
              return res.status(500).json({ success: false, error: sampleError.message });
            }

            // Get total count
            const { count, error: countError } = await supabase
              .from('candles')
              .select('*', { count: 'exact', head: true });

            if (countError) {
              return res.status(500).json({ success: false, error: countError.message });
            }

            return res.json({
              success: true,
              data: {
                totalCandles: count,
                sampleCandles: sampleData,
                currentTime: Date.now(),
                currentTimeSeconds: Math.floor(Date.now() / 1000)
              }
            });
          } catch (error) {
            console.error('Error in debug endpoint:', error);
            return res.status(500).json({ success: false, error: 'Debug failed' });
          }
        });

        /**
         * @swagger
         * /api/tradingview/test-history:
         *   get:
         *     summary: Test endpoint to get latest candles
         *     tags: [TradingView]
         *     responses:
         *       200:
         *         description: Latest candles data
         */
        router.get('/test-history', async (req: Request, res: Response) => {
          try {
            const { supabase } = await import('../config/supabase');
            
            // Get latest 10 candles
            const { data, error } = await supabase
              .from('candles')
              .select('*')
              .eq('symbol', 'ZPHUSD')
              .eq('resolution', '1')
              .order('timestamp', { ascending: false })
              .limit(10);

            if (error) {
              return res.status(500).json({ success: false, error: error.message });
            }

            // Convert to TradingView format
            const response = {
              s: 'ok',
              t: data?.map(c => Math.floor(c.timestamp / 1000)) || [],
              o: data?.map(c => parseFloat(c.open)) || [],
              h: data?.map(c => parseFloat(c.high)) || [],
              l: data?.map(c => parseFloat(c.low)) || [],
              c: data?.map(c => parseFloat(c.close)) || [],
              v: data?.map(c => parseFloat(c.volume)) || [],
            };

            return res.json(response);
          } catch (error) {
            console.error('Error in test-history endpoint:', error);
            return res.status(500).json({ success: false, error: 'Test failed' });
          }
        });

        export default router;
