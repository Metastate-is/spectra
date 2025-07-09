import { Test, TestingModule } from "@nestjs/testing";
import { OnchainService } from "./onchain.service";
import { IOnchainMark } from "src/core/iterface/onchain.interface";
import { OnchainMarkType } from "src/type";
import { Neo4jService } from "src/core/neo4j/neo4j.service";
import { KafkaService } from "src/core/kafka/kafka.service";
import { DateTime } from "neo4j-driver";
import neo4j from "neo4j-driver";

describe("OnchainService", () => {
  let service: OnchainService;
  let neo4jService: Neo4jService;
  let kafkaService: KafkaService;
  let module: TestingModule;

  const mockMark: IOnchainMark = {
    fromParticipantId: "1",
    toParticipantId: "2",
    markType: OnchainMarkType.TRUST,
    value: true,
    txHash: "1",
    confirmedAt: new DateTime(
      neo4j.int(2025),
      neo4j.int(7),
      neo4j.int(9),
      neo4j.int(9),
      neo4j.int(0),
      neo4j.int(0),
      neo4j.int(0),
      neo4j.int(0),
    ),
    createdAt: new DateTime(
      neo4j.int(2025),
      neo4j.int(7),
      neo4j.int(9),
      neo4j.int(9),
      neo4j.int(0),
      neo4j.int(0),
      neo4j.int(0),
      neo4j.int(0),
    ),
  };

  const mockTx = {
    run: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
  } as any;

  const mockKafkaService = {
    sendMarkCreated: jest.fn(),
  };

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
        OnchainService,
        { provide: Neo4jService, useValue: mockNeo4jService },
        { provide: KafkaService, useValue: mockKafkaService },
      ],
    }).compile();

    service = module.get<OnchainService>(OnchainService);
    kafkaService = module.get(KafkaService);
    neo4jService = module.get(Neo4jService);

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
              get: (key: string) => ({
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
        }); // create mark

      const result = await service.process(mockMark);

      expect(result).toBe(true);

      expect(mockTx.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (:Participant"),
        expect.objectContaining({ participantId: mockMark.fromParticipantId }),
      );
      expect(mockTx.run).toHaveBeenCalledWith(
        expect.stringContaining("MERGE (:Participant"),
        expect.objectContaining({ participantId: mockMark.toParticipantId }),
      );
      expect(mockTx.run).toHaveBeenCalledWith(
        expect.stringContaining("MATCH (from:Participant"),
        expect.objectContaining({ fromParticipantId: mockMark.fromParticipantId }),
      );
      expect(mockTx.run).toHaveBeenCalledWith(
        expect.stringContaining("CREATE (mark:Mark"),
        expect.objectContaining({ value: mockMark.value }),
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
              get: () => ({
                properties: existingMark,
              }),
            },
          ],
        })
        .mockResolvedValueOnce({}); // update

      const markToUpdate = { ...mockMark, value: false };

      const result = await service.process(markToUpdate);

      expect(result).toBe(true);

      // Проверяем, что обновление произошло с нужным значением
      expect(mockTx.run).toHaveBeenCalledWith(
        expect.stringContaining("SET mark.value = $value"),
        expect.objectContaining({ value: false }),
      );

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
