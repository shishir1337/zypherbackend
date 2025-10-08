// Example file showing how to use Redis in your routes
// This file is for reference only - not imported anywhere

import { redis } from '../config/redis';

// Basic key-value operations
export const setValue = async (key: string, value: string, ttl?: number) => {
  if (ttl) {
    return await redis.setex(key, ttl, value);
  }
  return await redis.set(key, value);
};

export const getValue = async (key: string) => {
  return await redis.get(key);
};

export const deleteKey = async (key: string) => {
  return await redis.del(key);
};

export const keyExists = async (key: string) => {
  return await redis.exists(key);
};

// List operations
export const pushToList = async (key: string, values: string[]) => {
  return await redis.lpush(key, ...values);
};

export const popFromList = async (key: string) => {
  return await redis.rpop(key);
};

export const getListRange = async (key: string, start: number = 0, stop: number = -1) => {
  return await redis.lrange(key, start, stop);
};

// Set operations
export const addToSet = async (key: string, members: string[]) => {
  return await redis.sadd(key, members);
};

export const getSetMembers = async (key: string) => {
  return await redis.smembers(key);
};

export const isSetMember = async (key: string, member: string) => {
  return await redis.sismember(key, member);
};

// Hash operations
export const setHashField = async (key: string, field: string, value: string) => {
  return await redis.hset(key, { [field]: value });
};

export const getHashField = async (key: string, field: string) => {
  return await redis.hget(key, field);
};

export const getAllHashFields = async (key: string) => {
  return await redis.hgetall(key);
};

export const deleteHashField = async (key: string, field: string) => {
  return await redis.hdel(key, field);
};

// Numeric operations
export const increment = async (key: string, amount: number = 1) => {
  return await redis.incrby(key, amount);
};

export const decrement = async (key: string, amount: number = 1) => {
  return await redis.decrby(key, amount);
};

// Expiration operations
export const setExpiration = async (key: string, seconds: number) => {
  return await redis.expire(key, seconds);
};

export const getTTL = async (key: string) => {
  return await redis.ttl(key);
};

// Pattern matching
export const findKeys = async (pattern: string = '*') => {
  return await redis.keys(pattern);
};

// Batch operations
export const multiSet = async (keyValuePairs: Record<string, string>) => {
  const pipeline = redis.pipeline();
  
  for (const [key, value] of Object.entries(keyValuePairs)) {
    pipeline.set(key, value);
  }
  
  return await pipeline.exec();
};

export const multiGet = async (keys: string[]) => {
  const pipeline = redis.pipeline();
  
  for (const key of keys) {
    pipeline.get(key);
  }
  
  return await pipeline.exec();
};

// JSON operations (if you want to store JSON objects)
export const setJSON = async (key: string, obj: any, ttl?: number) => {
  const jsonString = JSON.stringify(obj);
  if (ttl) {
    return await redis.setex(key, ttl, jsonString);
  }
  return await redis.set(key, jsonString);
};

export const getJSON = async (key: string) => {
  const jsonString = await redis.get(key);
  if (jsonString && typeof jsonString === 'string') {
    return JSON.parse(jsonString);
  }
  return null;
};

// Cache helper functions
export const cacheWithTTL = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> => {
  // Try to get from cache first
  const cached = await redis.get(key);
  if (cached && typeof cached === 'string') {
    return JSON.parse(cached);
  }

  // If not in cache, fetch the data
  const data = await fetchFn();
  
  // Store in cache with TTL
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  
  return data;
};

// Session management example
export const createSession = async (sessionId: string, userId: string, ttl: number = 86400) => {
  const sessionData = {
    userId,
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
  };
  
  return await redis.setex(`session:${sessionId}`, ttl, JSON.stringify(sessionData));
};

export const getSession = async (sessionId: string) => {
  const sessionData = await redis.get(`session:${sessionId}`);
  if (sessionData && typeof sessionData === 'string') {
    const parsed = JSON.parse(sessionData);
    // Update last accessed time
    parsed.lastAccessed = new Date().toISOString();
    await redis.setex(`session:${sessionId}`, 86400, JSON.stringify(parsed));
    return parsed;
  }
  return null;
};

export const deleteSession = async (sessionId: string) => {
  return await redis.del(`session:${sessionId}`);
};

// Rate limiting example
export const checkRateLimit = async (
  identifier: string,
  limit: number = 100,
  windowSeconds: number = 3600
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> => {
  const key = `rate_limit:${identifier}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  
  const ttl = await redis.ttl(key);
  const remaining = Math.max(0, limit - current);
  const resetTime = Date.now() + (ttl * 1000);
  
  return {
    allowed: current <= limit,
    remaining,
    resetTime,
  };
};
