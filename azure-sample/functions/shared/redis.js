/**
 * Shared Module: Redis Cache Client
 * Provides Redis connection for caching and session management
 */

const redis = require('redis');

// Redis client (reused across function invocations)
let client = null;

/**
 * Get or create Redis client
 * @returns {Promise<redis.RedisClientType>}
 */
async function getRedisClient() {
  if (client && client.isOpen) {
    return client;
  }
  
  try {
    // Parse connection string from environment
    const connectionString = process.env.REDIS_CONNECTION_STRING;
    
    if (!connectionString) {
      throw new Error('REDIS_CONNECTION_STRING not configured');
    }
    
    // Create Redis client
    client = redis.createClient({
      url: `redis://${connectionString}`
    });
    
    // Handle errors
    client.on('error', (err) => {
      console.error('Redis client error:', err);
    });
    
    // Connect
    await client.connect();
    console.log('Redis client connected');
    
    return client;
    
  } catch (error) {
    console.error('Redis connection failed:', error);
    throw error;
  }
}

/**
 * Close Redis connection (for cleanup)
 */
async function closeRedis() {
  if (client) {
    await client.quit();
    client = null;
    console.log('Redis client disconnected');
  }
}

module.exports = {
  getRedisClient,
  closeRedis
};
