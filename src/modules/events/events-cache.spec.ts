import { ServiceUnavailableException } from "@nestjs/common";
import { EventsCache } from "./events-cache";

describe("EventsCache", () => {
  const cache = {
    del: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  };
  let eventsCache: EventsCache;

  beforeEach(() => {
    jest.clearAllMocks();
    eventsCache = new EventsCache(cache as any);
  });

  it("claims a new event for 24 hours", async () => {
    cache.get.mockResolvedValue(undefined);
    cache.set.mockResolvedValue(true);

    await expect(
      eventsCache.checkAndSetEventId({
        eventId: "event-1",
        schemaVersion: "1.0.0",
        eventTime: { milliseconds: 1 },
      }),
    ).resolves.toBe(false);
    expect(cache.set).toHaveBeenCalledWith("event-1", true, 86400000);
  });

  it("fails closed when the idempotency cache is unavailable", async () => {
    cache.get.mockRejectedValue(new Error("redis unavailable"));

    await expect(
      eventsCache.checkAndSetEventId({
        eventId: "event-2",
        schemaVersion: "1.0.0",
        eventTime: { milliseconds: 2 },
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(cache.set).not.toHaveBeenCalled();
  });
});
