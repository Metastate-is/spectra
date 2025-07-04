#!/usr/bin/env ts-node

import { Kafka, logLevel } from "kafkajs";
import { KAFKA_TOPICS } from "@metastate-is/proto-models";
import { MarkCreate, OffchainMarkType } from "@metastate-is/proto-models/generated/metastate/kafka/citadel/v1/mark_create";
import { Timestamp } from "@metastate-is/proto-models/generated/google/protobuf/timestamp";

const timestamp: Timestamp = {
  seconds: Date.now() / 1000,
  nanos: 0,
}
const samplePayload: MarkCreate = {
  id: "test-mark-123",
  createdAt: timestamp,
  fromParticipantId: "test-participant-123",
  toParticipantId: "test-participant-456",
  isOnchain: false,
  offchainMarkType: OffchainMarkType.OFFCHAIN_MARK_TYPE_RELATION,
  value: true,
  metadata: {
    eventId: "test-event-123",
    schemaVersion: "1.0.0",
    eventTime: { milliseconds: Date.now() },
  },
};

async function produceMessage() {
  const kafka = new Kafka({
    clientId: "protobuf-producer-client",
    brokers: ["localhost:9092"],
    logLevel: logLevel.INFO,
  });

  const producer = kafka.producer();
  await producer.connect();

  const topicName = KAFKA_TOPICS.CITADEL.MARK.CREATED;

  // Create the protobuf message
  const message = MarkCreate.encode(samplePayload).finish();

  await producer.send({
    topic: topicName,
    messages: [
      {
        key: samplePayload.id,
        value: Buffer.from(message),
      },
    ],
  });

  console.log(`Message sent to topic ${topicName}`);
  await producer.disconnect();
}

produceMessage().catch((error) => {
  console.error("Error producing message:", error);
  process.exit(1);
});
