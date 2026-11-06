const Redis = require('ioredis');
const RedisMock = require('ioredis-mock');

let redisClient = null;

const connectRedis = async () => {
  const realClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    retryStrategy: () => null,
    lazyConnect: false,
  });

  return new Promise((resolve) => {
    let resolved = false;

    const useMock = (reason) => {
      if (resolved) return;
      resolved = true;
      try { realClient.disconnect(); } catch (_) {}
      console.warn(`[Redis] Could not connect to external Redis (${reason}). Using in-memory Redis store.`);
      redisClient = new RedisMock();
      resolve(redisClient);
    };

    realClient.on('connect', () => {
      if (resolved) return;
      resolved = true;
      console.log('[Redis] Connected successfully');
      redisClient = realClient;
      resolve(redisClient);
    });

    realClient.on('error', (err) => {
      useMock(err.message);
    });

    setTimeout(() => {
      useMock('Connection timed out');
    }, 2500);
  });
};

const getRedis = () => {
  if (!redisClient) {
    redisClient = new RedisMock();
  }
  return redisClient;
};

module.exports = { connectRedis, getRedis };
