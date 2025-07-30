import type { DateTime } from "neo4j-driver";
import { OffchainMarkTypeEnum, OnchainMarkTypeEnum } from "src/type";

export interface IBaseMark {
  id?: string;
  fromParticipantId: string;
  toParticipantId: string;
  value: boolean;
  markType: OnchainMarkTypeEnum | OffchainMarkTypeEnum;
  createdAt?: DateTime;
  updatedAt?: DateTime;
}
