import { OffchainMarkType } from "@metastate-is/proto-models/generated/metastate/kafka/spectra/v1/mark_types";
import { MarkHandler } from "./mark.handler";

describe("MarkHandler REST contract", () => {
  const eventsCache = {
    checkAndSetEventId: jest.fn(),
    forgetEventId: jest.fn(),
  };
  const onchainService = { process: jest.fn() };
  const offchainService = { process: jest.fn() };
  let handler: MarkHandler;

  const request = {
    fromParticipantId: "from",
    toParticipantId: "to",
    isOnchain: false,
    offchainMarkType: OffchainMarkType.OFFCHAIN_MARK_TYPE_RELATION,
    value: true,
    metadata: { eventId: "event-1" },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    eventsCache.checkAndSetEventId.mockResolvedValue(false);
    offchainService.process.mockResolvedValue(true);
    handler = new MarkHandler(eventsCache as any, onchainService as any, offchainService as any);
  });

  it("returns success only after the mark is processed", async () => {
    await expect(handler.handleMarkRequestEvent(request)).resolves.toEqual({ processed: true });
    expect(offchainService.process).toHaveBeenCalled();
  });

  it("does not process a duplicate event", async () => {
    eventsCache.checkAndSetEventId.mockResolvedValue(true);
    await expect(handler.handleMarkRequestEvent(request)).resolves.toEqual({
      duplicate: true,
      processed: true,
    });
    expect(offchainService.process).not.toHaveBeenCalled();
  });

  it("releases the event id when mark processing fails", async () => {
    offchainService.process.mockResolvedValue(false);
    await expect(handler.handleMarkRequestEvent(request)).rejects.toThrow("Mark was not processed");
    expect(eventsCache.forgetEventId).toHaveBeenCalledWith(request.metadata);
  });
});
