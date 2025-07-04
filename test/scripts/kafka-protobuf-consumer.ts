#!/usr/bin/env ts-node

/**
 * Script for consuming messages from Kafka topics related to relations
 * and decoding them from Protobuf to JSON.
 *
 * Usage:
 * ts-node kafka-protobuf-consumer.ts [created]
 *
 * Parameters:
 * - created: subscribe to citadel.mark.created.v1 (default)
 */

import { KAFKA_TOPICS } from "@metastate-is/proto-models";
import { MarkCreate } from "@metastate-is/proto-models/generated/metastate/kafka/citadel/v1/mark_create";
import { Kafka, logLevel } from "kafkajs";

/**
 * Main function for connecting to Kafka and consuming messages
 */
async function consumeRelationMessages() {
  // Determine topic and decoder based on args
  const topicName = KAFKA_TOPICS.CITADEL.MARK.CREATED;
  const decoder = MarkCreate;

  console.log("Starting Kafka consumer for citadel.mark.created.v1 topic");

  // Creating Kafka client
  const kafka = new Kafka({
    clientId: "protobuf-decoder-client",
    brokers: ["localhost:9092"],
    logLevel: logLevel.INFO,
  });

  // Creating consumer
  const consumer = kafka.consumer({
    groupId: "protobuf-decoder-group",
  });

  try {
    // Connecting to Kafka
    await consumer.connect();
    console.log("Connected to Kafka");

    // Subscribing to topic
    await consumer.subscribe({
      topic: topicName,
      fromBeginning: true,
    });
    console.log(`Subscribed to topic: ${topicName}`);

    // Consuming messages
    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          if (!message.value) {
            console.log("Message has no value");
            return;
          }

          // Decoding message from Protobuf
          const decodedMessage = decoder.decode(message.value);

          console.log("decodedMessage", decodedMessage);

          // Displaying decoded message
          console.log("Decoded message:");
          console.log(JSON.stringify(decodedMessage, null, 2));
          console.log("-".repeat(80));
        } catch (error) {
          console.error("Error decoding message:", error);
        }
      },
    });
  } catch (error) {
    console.error("Error in Kafka consumer:", error);
  }

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down consumer...");
    await consumer.disconnect();
    console.log("Consumer disconnected");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Start the consumer
consumeRelationMessages().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
