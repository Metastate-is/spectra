import type { DateTime } from "neo4j-driver";
import { OffchainMarkType, OnchainMarkType } from "src/type";

export interface IBaseMark {
  id?: string;
  fromParticipantId: string;
  toParticipantId: string;
  value: boolean;
  markType: OnchainMarkType | OffchainMarkType;
  createdAt?: DateTime;
  updatedAt?: DateTime;
}
