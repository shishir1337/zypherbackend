import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error('Missing Redis environment variables');
}

// Create Redis client using Upstash REST API
export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

export default redis;
