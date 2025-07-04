import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Test, TestingModule } from "@nestjs/testing";
import { Cache } from "cache-manager";
import { RedisService } from "./redis.service";

describe("RedisService", () => {
  let service: RedisService;
  let _cacheManager: Cache;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    _cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("get", () => {
    it("should return cached value when exists", async () => {
      const key = "test-key";
      const value = { test: "value" };
      mockCacheManager.get.mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it("should return null when cache is empty", async () => {
      const key = "test-key";
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.get(key);

      expect(result).toBeNull();
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it("should return null when cache error occurs", async () => {
      const key = "test-key";
      mockCacheManager.get.mockRejectedValue(new Error("Cache error"));

      const result = await service.get(key);

      expect(result).toBeNull();
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });
  });

  describe("set", () => {
    it("should set value in cache", async () => {
      const key = "test-key";
      const value = { test: "value" };
      const ttl = 3600;

      await service.set(key, value, ttl);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });

    it("should throw error when cache error occurs", async () => {
      const key = "test-key";
      const value = { test: "value" };
      mockCacheManager.set.mockRejectedValue(new Error("Cache error"));

      await expect(service.set(key, value)).rejects.toThrow("Cache error");
    });
  });

  describe("del", () => {
    it("should delete value from cache", async () => {
      const key = "test-key";

      await service.del(key);

      expect(mockCacheManager.del).toHaveBeenCalledWith(key);
    });

    it("should throw error when cache error occurs", async () => {
      const key = "test-key";
      mockCacheManager.del.mockRejectedValue(new Error("Cache error"));

      await expect(service.del(key)).rejects.toThrow("Cache error");
    });
  });

  describe("exists", () => {
    it("should return true when key exists", async () => {
      const key = "test-key";
      mockCacheManager.get.mockResolvedValue({ test: "value" });

      const result = await service.exists(key);

      expect(result).toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it("should return false when key does not exist", async () => {
      const key = "test-key";
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.exists(key);

      expect(result).toBe(false);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it("should return false when cache error occurs", async () => {
      const key = "test-key";
      mockCacheManager.get.mockRejectedValue(new Error("Cache error"));

      const result = await service.exists(key);

      expect(result).toBe(false);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });
  });
});
