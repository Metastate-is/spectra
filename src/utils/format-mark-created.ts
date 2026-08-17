import { MarkCreated } from "@metastate-is/proto-models/generated/metastate/kafka/spectra/v1/mark_created";
import {
  OffchainMarkTypeEnum,
  OffchainMarkTypeMapInx,
  OnchainMarkTypeEnum,
  OnchainMarkTypeMapInx,
} from "../type";

export const formatEventPayload = (
  mark: any,
  markType: OffchainMarkTypeEnum | OnchainMarkTypeEnum,
  onchain: boolean,
): MarkCreated => {
  const KSUID = require("ksuid");
  const payload: MarkCreated = {
    fromParticipantId: mark.fromParticipantId,
    toParticipantId: mark.toParticipantId,
    isOnchain: onchain,
    value: mark.value,
    metadata: {
      eventId: KSUID.randomSync().string,
      schemaVersion: "1.0.0",
      eventTime: { milliseconds: Date.now() },
    },
  };

  if (onchain) {
    payload.onchainMarkType = OnchainMarkTypeMapInx[markType];
  } else {
    payload.offchainMarkType = OffchainMarkTypeMapInx[markType];
  }

  if (mark.id && mark.createdAt) {
    const createdAt =
      typeof mark.createdAt.toStandardDate === "function"
        ? mark.createdAt.toStandardDate().getTime()
        : new Date(mark.createdAt).getTime();
    if (Number.isFinite(createdAt)) {
      payload.id = mark.id;
      payload.createdAt = { milliseconds: createdAt };
    }
  }

  return payload;
};
