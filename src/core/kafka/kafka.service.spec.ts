import { KAFKA_TOPICS } from "@metastate-is/proto-models";
import { ClientKafka } from "@nestjs/microservices";
import { Test, TestingModule } from "@nestjs/testing";
import { KafkaService } from "./kafka.service";

describe("KafkaService", () => {
  let service: KafkaService;
  let clientKafkaMock: Partial<ClientKafka>;

  beforeEach(async () => {
    // Создаем мок для ClientKafka
    clientKafkaMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn().mockReturnValue({
        toPromise: jest.fn().mockResolvedValue({ status: "ok" }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaService,
        {
          provide: "KAFKA_CLIENT",
          useValue: clientKafkaMock,
        },
      ],
    }).compile();

    service = module.get<KafkaService>(KafkaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("onModuleInit", () => {
    it("should connect to Kafka", async () => {
      await service.onModuleInit();
      expect(clientKafkaMock.connect).toHaveBeenCalled();
    });

    it("should handle connection error", async () => {
      const error = new Error("Connection error");
      clientKafkaMock.connect = jest.fn().mockRejectedValue(error);

      // Мокаем console.error для предотвращения вывода ошибки в тестах
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await service.onModuleInit();

      expect(clientKafkaMock.connect).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("onModuleDestroy", () => {
    it("should close Kafka connection", async () => {
      await service.onModuleDestroy();
      expect(clientKafkaMock.close).toHaveBeenCalled();
    });

    it("should handle disconnection error", async () => {
      const error = new Error("Disconnection error");
      clientKafkaMock.close = jest.fn().mockRejectedValue(error);

      // Мокаем console.error для предотвращения вывода ошибки в тестах
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      await service.onModuleDestroy();

      expect(clientKafkaMock.close).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("send", () => {
    it("should send message to Kafka", async () => {
      const topic = "test-topic";
      const message = { key: "value" };

      const result = await service.send(topic, message);

      expect(clientKafkaMock.emit).toHaveBeenCalledWith(topic, message);
      expect(result).toEqual({ status: "ok" });
    });

    it("should handle send error", async () => {
      const topic = "test-topic";
      const message = { key: "value" };
      const error = new Error("Send error");

      clientKafkaMock.emit = jest.fn().mockReturnValue({
        toPromise: jest.fn().mockRejectedValue(error),
      });

      // Мокаем console.error для предотвращения вывода ошибки в тестах
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const result = await service.send(topic, message);

      expect(result).toBeNull();
      expect(clientKafkaMock.emit).toHaveBeenCalledWith(topic, message);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("sendAchievementCreated", () => {
    it("should send achievement created message to Kafka", async () => {
      const message = {
        achievementId: "123",
        createdAt: { milliseconds: Date.now() },
        metadata: {
          eventId: "123",
          schemaVersion: "1",
          eventTime: { milliseconds: Date.now() },
        },
        telegram: {
          userId: 123,
        },
      };
      const sendSpy = jest.spyOn(service, "send").mockResolvedValue({ status: "ok" });

      const result = await service.sendAchievementCreated(message);

      expect(sendSpy).toHaveBeenCalledWith(KAFKA_TOPICS.QUEST.ACHIEVEMENT.CREATED,message);
      expect(result).toEqual({ status: "ok" });
    });
  });
});
