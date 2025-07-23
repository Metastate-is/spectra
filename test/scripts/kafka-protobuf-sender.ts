#!/usr/bin/env ts-node

import { Kafka, logLevel } from "kafkajs";
import { KAFKA_TOPICS } from "@metastate-is/proto-models";
import { MarkRequest } from "@metastate-is/proto-models/generated/metastate/kafka/spectra/v1/mark_request";
import { OffchainMarkType } from "@metastate-is/proto-models/generated/metastate/kafka/spectra/v1/mark_types";

/**
 * Script for sending messages to Kafka topics related to relations
 *
 * Usage:
 * ts-node kafka-protobuf-sender.ts [request]
 *
 * Parameters:
 * - request: send to spectra.mark.request.v1 (default)
 */

const samplePayload: MarkRequest = {
  fromParticipantId: "user123",
  toParticipantId: "test-participant-123",
  isOnchain: false,
  offchainMarkType: OffchainMarkType.OFFCHAIN_MARK_TYPE_BUSINESS_FEEDBACK,
  value: false,
  metadata: {
    eventId: "test-event-123",
    schemaVersion: "1.0.0",
    eventTime: { milliseconds: Date.now() },
  }
};

async function produceMessage() {
  const kafka = new Kafka({
    clientId: "protobuf-producer-client",
    brokers: ["localhost:9092"],
    logLevel: logLevel.INFO,
  });

  const producer = kafka.producer();
  await producer.connect();

  const topicName = KAFKA_TOPICS.SPECTRA.MARK.REQUEST;

  await producer.send({
    topic: topicName,
    messages: [
      {
        value: Buffer.from(JSON.stringify(samplePayload)),
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
