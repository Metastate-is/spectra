import { TransactionPromise } from "neo4j-driver-core";
import { Neo4jService } from "src/core/neo4j/neo4j.service";
import { OffchainMarkType } from "src/type";
import { IOffchainMark } from "../iterface/offchain.interface";
import { BaseMarkService } from "./base-marks.service";

class TestMarkService extends BaseMarkService<IOffchainMark> {
  protected readonly onchain = false;

  public async findOnePublic(
    mark: IOffchainMark,
    tx: TransactionPromise,
  ): Promise<Record<string, any> | null> {
    return this.findOne(mark, tx);
  }

  public async createParticipantIfNotExistsPublic(
    participantId: string,
    tx: TransactionPromise,
  ): Promise<void> {
    return this.createParticipantIfNotExists(participantId, tx);
  }

  public async processMark(mark: IOffchainMark): Promise<boolean> {
    return this.process(mark);
  }

  async create(mark: IOffchainMark): Promise<IOffchainMark> {
    // Просто эмуляция успешного создания
    return Promise.resolve(mark);
  }

  async update(mark: IOffchainMark): Promise<IOffchainMark> {
    // Просто эмуляция успешного обновления
    return Promise.resolve(mark);
  }

  async sendEventCreateMark(): Promise<void> {
    return Promise.resolve();
  }
}

describe("BaseMarkService", () => {
  let service: TestMarkService;
  let mockNeo4jService: Partial<Neo4jService>;
  let mockSession: { beginTransaction: jest.Mock; close: jest.Mock };
  let mockTx: {
    run: jest.Mock;
    commit: jest.Mock;
    rollback: jest.Mock;
  };

  const mockMark: IOffchainMark = {
    fromParticipantId: "from-id",
    toParticipantId: "to-id",
    markType: OffchainMarkType.RELATION,
    value: true,
  };

  beforeEach(() => {
    mockTx = {
      run: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    mockSession = {
      beginTransaction: jest.fn(() => mockTx),
      close: jest.fn(),
    };

    mockNeo4jService = {
      initSession: jest.fn().mockReturnValue(mockSession),
    };

    service = new TestMarkService(mockNeo4jService as Neo4jService, "TestMarkService");
  });

  it("should create participant if not exists", async () => {
    mockTx.run.mockResolvedValue({}); // успешный вызов

    await service.createParticipantIfNotExistsPublic("participant-id-123", mockTx as any);

    expect(mockTx.run).toHaveBeenCalledWith(
      expect.stringContaining("MERGE (:Participant {participantId: $participantId})"),
      { participantId: "participant-id-123" },
    );
  });

  it("should create new mark if not exists", async () => {
    mockTx.run
      .mockResolvedValueOnce({}) // createParticipantIfNotExists (from)
      .mockResolvedValueOnce({}) // createParticipantIfNotExists (to)
      .mockResolvedValueOnce({ records: [] }) // findOne - не найдено
      .mockResolvedValueOnce({}); // create

    const result = await service.processMark(mockMark);

    expect(result).toBe(true);

    expect(mockTx.run).toHaveBeenCalledWith(
      expect.stringContaining("MERGE (:Participant {participantId: $participantId})"),
      expect.any(Object),
    );

    expect(mockTx.commit).toHaveBeenCalled();
    expect(mockSession.close).toHaveBeenCalled();
  });

  it("should update mark if exists", async () => {
    const existingMark = { id: "existing-id", value: 5 };

    mockTx.run
      .mockResolvedValueOnce({}) // createParticipantIfNotExists (from)
      .mockResolvedValueOnce({}) // createParticipantIfNotExists (to)
      .mockResolvedValueOnce({
        records: [
          {
            get: () => ({
              properties: existingMark,
            }),
          },
        ],
      }) // findOne - найден
      .mockResolvedValueOnce({}); // update

    const result = await service.processMark(mockMark);

    expect(result).toBe(true);

    expect(mockTx.run).toHaveBeenCalledWith(
      expect.stringContaining("MATCH (from:Participant"),
      expect.any(Object),
    );

    expect(mockTx.commit).toHaveBeenCalled();
    expect(mockSession.close).toHaveBeenCalled();
  });

  it("should rollback and return false on error", async () => {
    mockTx.run.mockRejectedValueOnce(new Error("DB error"));

    const result = await service.processMark(mockMark);

    expect(result).toBe(false);
    expect(mockTx.rollback).toHaveBeenCalled();
    expect(mockSession.close).toHaveBeenCalled();
  });

  it("should call createParticipantIfNotExists with correct ids", async () => {
    mockTx.run
      .mockResolvedValueOnce({}) // createParticipantIfNotExists (from)
      .mockResolvedValueOnce({}) // createParticipantIfNotExists (to)
      .mockResolvedValueOnce({ records: [] }) // findOne
      .mockResolvedValueOnce({}); // create

    // Чтобы не мешать, заглушим findOne и create
    jest.spyOn(service, "findOnePublic").mockResolvedValue(null);
    jest.spyOn(service, "create").mockResolvedValue(mockMark);

    const result = await service.processMark(mockMark);

    expect(result).toBe(true);

    expect(mockTx.run).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("MERGE (:Participant {participantId: $participantId})"),
      { participantId: mockMark.fromParticipantId },
    );
    expect(mockTx.run).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("MERGE (:Participant {participantId: $participantId})"),
      { participantId: mockMark.toParticipantId },
    );
  });
});
