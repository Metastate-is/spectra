import { RedisClientType } from "redis";

let redisClient: RedisClientType;

export async function setupTestRedis(): Promise<void> {
  const { createClient } = require("redis");

  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not set in environment variables");
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 5) {
            console.error("Redis connection failed after 5 retries");
            return new Error("Redis connection failed");
          }
          return Math.min(retries * 1000, 5000);
        },
      },
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis Client Connected");
    });

    await redisClient.connect();
    console.log("Redis Client Ready");
  } catch (error) {
    console.error("Failed to setup Redis:", error);
    throw error;
  }
}

export async function teardownTestRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.flushAll();
      await redisClient.disconnect();
      console.log("Redis Client Disconnected");
    } catch (error) {
      console.error("Error during Redis teardown:", error);
      throw error;
    }
  }
}

export async function clearRedisCache(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.flushAll();
      console.log("Redis Cache Cleared");
    } catch (error) {
      console.error("Error clearing Redis cache:", error);
      throw error;
    }
  }
}
