import { Test, TestingModule } from "@nestjs/testing";
import { OnchainService } from "./onchain.service";
import { IOnchainMark } from "src/core/iterface/onchain.interface";
import { OnchainMarkType } from "src/type";
import { Neo4jService } from "src/core/neo4j/neo4j.service";

describe("OnchainService", () => {
  let service: OnchainService;
  let neo4jService: Neo4jService;
  let module: TestingModule;

  const mockMark: IOnchainMark = {
    fromParticipantId: "1",
    toParticipantId: "2",
    markType: OnchainMarkType.TRUST,
    value: true,
    txHash: "1",
    confirmedAt: new Date(),
    createdAt: new Date(),
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
      providers: [OnchainService, { provide: Neo4jService, useValue: mockNeo4jService }],
    }).compile();

    service = module.get<OnchainService>(OnchainService);
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
        .mockResolvedValueOnce({}); // create mark

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
