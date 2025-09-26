import { Test, TestingModule } from "@nestjs/testing";
import { IOffchainMark } from "src/core/iterface/offchain.interface";
import { KafkaService } from "src/core/kafka/kafka.service";
import { Neo4jService } from "src/core/neo4j/neo4j.service";
import { OffchainMarkTypeEnum } from "src/type";
import { OffchainService } from "./offchain.service";

describe("OffchainService", () => {
  let service: OffchainService;
  let module: TestingModule;

  const mockMark: IOffchainMark = {
    fromParticipantId: "TEST_USER_1",
    toParticipantId: "TEST_USER_2",
    markType: OffchainMarkTypeEnum.RELATION,
    value: true,
  };

  const mockKafkaService = {
    sendMarkCreated: jest.fn(),
  };

  const mockTx = {
    run: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
  } as any;

  const mockSession = {
    beginTransaction: jest.fn().mockReturnValue(mockTx),
    close: jest.fn(),
  } as any;

  const mockNeo4jService = {
    initSession: jest.fn().mockReturnValue(mockSession),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        OffchainService,
        { provide: Neo4jService, useValue: mockNeo4jService },
        { provide: KafkaService, useValue: mockKafkaService },
      ],
    }).compile();

    service = module.get<OffchainService>(OffchainService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("process", () => {
    it("should create new mark if not exists", async () => {
      mockTx.run
        .mockResolvedValueOnce({}) // fromParticipant MERGE
        .mockResolvedValueOnce({}) // toParticipant MERGE
        .mockResolvedValueOnce({ records: [] }) // findOne — нет марка
        .mockResolvedValueOnce({
          records: [
            {
              get: () => ({
                properties: {
                  id: "some-uuid",
                  value: true,
                  createdAt: "2025-07-09T09:00:00Z",
                  updatedAt: "2025-07-09T09:00:00Z",
                },
              }),
              has: (key: string) => key === "mark",
            },
          ],
        }) // create mark
        .mockResolvedValueOnce({}); // createChangelog
    
      const result = await service.process(mockMark);
    
      expect(result).toBe(true);
    
      expect(mockTx.run).toHaveBeenCalledTimes(5);
    
      // Проверяем, что Changelog создаётся после create
      expect(mockTx.run).toHaveBeenNthCalledWith(
        5,
        expect.stringContaining("CREATE (cl:Changelog"),
        expect.objectContaining({
          fromId: mockMark.fromParticipantId,
          toId: mockMark.toParticipantId,
          value: mockMark.value,
          markType: mockMark.markType,
        }),
      );
    
      expect(mockTx.commit).toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });
    

    it("should update mark if already exists", async () => {
      const existingMark = { id: "some-id", value: true };
    
      mockTx.run
        .mockResolvedValueOnce({}) // createParticipantIfNotExists (from)
        .mockResolvedValueOnce({}) // createParticipantIfNotExists (to)
        .mockResolvedValueOnce({
          // findOne возвращает существующую метку
          records: [
            {
              get: () => ({ properties: existingMark }),
              has: () => true,
            },
          ],
        })
        .mockResolvedValueOnce({
          records: [
            {
              get: () => ({
                properties: {
                  id: "some-uuid",
                  value: false,
                  createdAt: "2025-07-09T09:00:00Z",
                  updatedAt: "2025-07-09T09:00:00Z",
                },
              }),
              has: () => true,
            },
          ],
        }) // update mark
        .mockResolvedValueOnce({}); // createChangelog
    
      const markToUpdate = { ...mockMark, value: false };
      const result = await service.process(markToUpdate);
    
      expect(result).toBe(true);
    
      expect(mockTx.run).toHaveBeenCalledWith(
        expect.stringContaining("SET mark.value = $value"),
        expect.objectContaining({ value: false }),
      );
    
      expect(mockTx.run).toHaveBeenCalledTimes(5);
    
      expect(mockTx.commit).toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });
    

    it("should rollback if error thrown", async () => {
      mockTx.run.mockImplementationOnce(() => {
        throw new Error("Simulated error");
      });

      const result = await service.process(mockMark);

      expect(result).toBe(false);
      expect(mockTx.rollback).toHaveBeenCalled();
      expect(mockSession.close).toHaveBeenCalled();
    });
  });
});
