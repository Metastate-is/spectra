import { KAFKA_TOPICS } from "@metastate-is/proto-models";
import { MarkRequest } from "@metastate-is/proto-models/generated/metastate/kafka/spectra/v1/mark_request";
import { Deserializer } from "@nestjs/microservices";
import { StructuredLoggerService } from "src/core/logger";

export interface IKafkaMessage {
  topic: string,
  value: Buffer,
  magicByte: number,
  attributes: number,
  timestamp: string,
  offset: string,
  key: null,
  headers: {},
  isControlRecord: boolean,
  batchContext: {
    firstOffset: string,
    firstTimestamp: string,
    partitionLeaderEpoch: number,
    inTransaction: boolean,
    isControlBatch: boolean,
    lastOffsetDelta: number,
    producerId: string,
    producerEpoch: number,
    firstSequence: number,
    maxTimestamp: string,
    timestampType: number,
    magicByte: number
  },
  partition: number
}

export interface IKafkaOptions {
  channel: string
}

export class ProtobufDeserializer implements Deserializer {
  deserialize(message: IKafkaMessage, options?: IKafkaOptions): any {
    const logger = new StructuredLoggerService();
    logger.setContext(ProtobufDeserializer.name); 
    if (!message || !message.value) {
      logger.warn("Deserializer: No value");
      return null;
    }

    console.log("message", message)

    try { 
      const pattern = options?.channel || message?.topic;
      let decoded: unknown;
      
      let uint8Value: Uint8Array;

      // Конвертация value в Uint8Array
      let buffer: Buffer;
      if (typeof message.value === 'string') {
        buffer = Buffer.from(message.value, 'latin1');
      } else if (Buffer.isBuffer(message.value)) {
        buffer = message.value;
      } else {
        logger.warn('Deserializer: Invalid value type, skipping:', { meta: { message } });
        return {};
      }

      uint8Value = new Uint8Array(buffer);

      switch (pattern) {
        case KAFKA_TOPICS.SPECTRA.MARK.REQUEST:
          decoded = MarkRequest.decode(uint8Value);
          break;
        default:
          logger.warn('Deserializer: Unknown pattern, skipping decode:', { meta: { pattern } });
          return null;
      }

      console.log("Decoded message:");
      console.log(JSON.stringify(decoded, null, 2));

      console.log("Deserializer: decoded", decoded);

      logger.warn('Deserializer: decoded', { meta: { decoded } });

      return decoded;
    } catch (error) {
      console.error(error)
      return null;
    }
  }
}