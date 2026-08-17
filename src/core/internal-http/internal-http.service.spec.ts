import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { InternalHttpService } from "./internal-http.service";

describe("InternalHttpService", () => {
  let service: InternalHttpService;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InternalHttpService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              botUrl: "http://bot:3000",
              token: "test-internal-token-with-32-characters",
              timeoutMs: 1000,
            }),
          },
        },
      ],
    }).compile();
    service = module.get(InternalHttpService);
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it("sends mark-created to the bot REST endpoint", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ processed: true }),
    } as Response);

    await service.sendMarkCreated({
      fromParticipantId: "from",
      toParticipantId: "to",
      isOnchain: false,
      value: true,
      metadata: undefined,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("http://bot:3000/internal/events/mark-created"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer test-internal-token-with-32-characters",
        }),
      }),
    );
  });

  it("rejects a success response without a processed acknowledgement", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    await expect(
      service.sendMarkCreated({
        fromParticipantId: "from",
        toParticipantId: "to",
        isOnchain: false,
        value: true,
        metadata: undefined,
      }),
    ).rejects.toThrow("did not process");
  });
});
