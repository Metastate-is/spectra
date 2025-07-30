import { MarkCreated } from "@metastate-is/proto-models/generated/metastate/kafka/spectra/v1/mark_created";
import {
  OffchainMarkTypeEnum,
  OffchainMarkTypeMapInx,
  OnchainMarkTypeEnum,
  OnchainMarkTypeMapInx,
} from "../../type";

export const formatEventPayload = (
  mark: any,
  markType: OffchainMarkTypeEnum | OnchainMarkTypeEnum,
  onchain: boolean,
  e?: Error,
): MarkCreated => {
  const KSUID = require("ksuid");
  const eventId = KSUID.randomSync().string;

  const payload: MarkCreated = {
    fromParticipantId: mark.fromParticipantId,
    toParticipantId: mark.toParticipantId,
    isOnchain: onchain,
    value: mark.value,
    metadata: {
      eventId: eventId,
      schemaVersion: "1.0.0",
      eventTime: { milliseconds: Date.now() },
    },
  };

  if (onchain) {
    payload.onchainMarkType = OnchainMarkTypeMapInx[markType]; 
  } else {
    payload.offchainMarkType = OffchainMarkTypeMapInx[markType];
  }

  if (e) {
    payload.error = {
      message: e.message,
      code: (e as any).code ?? "UNKNOWN",
      details: JSON.stringify({
        name: e.name,
        stack: e.stack,
      }),
    };
  } else {
    if (mark.id && mark.createdAt) {
      payload.id = mark.id;
      payload.createdAt = { milliseconds: mark.createdAt.toStandardDate().getTime() };
    }
  }

  return payload;
};
