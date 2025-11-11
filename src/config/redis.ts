import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('Missing Redis environment variable `REDIS_URL`');
}

export const redis = new Redis(redisUrl);

export default redis;
