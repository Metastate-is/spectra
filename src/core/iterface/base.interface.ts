import type { DateTime } from "neo4j-driver";

export interface IBaseMark {
  id?: string;
  fromParticipantId: string;
  toParticipantId: string;
  value: boolean;
  createdAt?: DateTime;
  updatedAt?: DateTime;
}
