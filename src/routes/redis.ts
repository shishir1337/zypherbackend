import { Router, Request, Response } from 'express';
import { redis } from '../config/redis';
import { ApiResponse } from '../types';

const router: Router = Router();

// Test Redis connection
router.get('/test', async (req: Request, res: Response) => {
  try {
    // Test connection by setting and getting a test value
    const testKey = 'test:connection';
    const testValue = `test-${Date.now()}`;
    
    await redis.set(testKey, testValue);
    const retrievedValue = await redis.get(testKey);
    
    // Clean up test key
    await redis.del(testKey);

    const response: ApiResponse = {
      success: true,
      message: 'Redis connection successful',
      data: { 
        connected: true,
        testValue: retrievedValue,
        url: process.env.UPSTASH_REDIS_REST_URL
      },
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to test Redis connection',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
    return res.status(500).json(response);
  }
});

// Set a key-value pair
router.post('/set', async (req: Request, res: Response) => {
  try {
    const { key, value, ttl } = req.body;

    if (!key || value === undefined) {
      const response: ApiResponse = {
        success: false,
        error: 'Key and value are required',
      };
      return res.status(400).json(response);
    }

    let result;
    if (ttl && typeof ttl === 'number') {
      // Set with TTL (time to live in seconds)
      result = await redis.setex(key, ttl, value);
    } else {
      // Set without TTL
      result = await redis.set(key, value);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Key set successfully',
      data: { key, value, ttl: ttl || null, result },
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to set key',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
    return res.status(500).json(response);
  }
});

// Get a value by key
router.get('/get/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const value = await redis.get(key);

    const response: ApiResponse = {
      success: true,
      data: { key, value },
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get key',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
    return res.status(500).json(response);
  }
});

// Delete a key
router.delete('/del/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const result = await redis.del(key);

    const response: ApiResponse = {
      success: true,
      message: 'Key deleted successfully',
      data: { key, deleted: result > 0 },
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete key',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
    return res.status(500).json(response);
  }
});

// Get all keys matching a pattern
router.get('/keys/:pattern?', async (req: Request, res: Response) => {
  try {
    const pattern = req.params.pattern || '*';

    const keys = await redis.keys(pattern);

    const response: ApiResponse = {
      success: true,
      data: { pattern, keys, count: keys.length },
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get keys',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
    return res.status(500).json(response);
  }
});

// Get TTL (time to live) for a key
router.get('/ttl/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const ttl = await redis.ttl(key);

    const response: ApiResponse = {
      success: true,
      data: { key, ttl },
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get TTL',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
    return res.status(500).json(response);
  }
});

// Increment a numeric value
router.post('/incr/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { amount = 1 } = req.body;

    const result = await redis.incrby(key, amount);

    const response: ApiResponse = {
      success: true,
      message: 'Value incremented successfully',
      data: { key, amount, newValue: result },
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to increment value',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
    return res.status(500).json(response);
  }
});

// Hash operations - Set hash field
router.post('/hset/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { field, value } = req.body;

    if (!field || value === undefined) {
      const response: ApiResponse = {
        success: false,
        error: 'Field and value are required',
      };
      return res.status(400).json(response);
    }

    const result = await redis.hset(key, { [field]: value });

    const response: ApiResponse = {
      success: true,
      message: 'Hash field set successfully',
      data: { key, field, value, result },
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to set hash field',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
    return res.status(500).json(response);
  }
});

// Hash operations - Get hash field
router.get('/hget/:key/:field', async (req: Request, res: Response) => {
  try {
    const { key, field } = req.params;

    const value = await redis.hget(key, field);

    const response: ApiResponse = {
      success: true,
      data: { key, field, value },
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get hash field',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
    return res.status(500).json(response);
  }
});

// Hash operations - Get all hash fields
router.get('/hgetall/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const hash = await redis.hgetall(key);

    const response: ApiResponse = {
      success: true,
      data: { key, hash },
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get hash',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
    return res.status(500).json(response);
  }
});

export default router;
