import { OnchainMarkType } from "src/type";
import type { IBaseMark } from "./base.interface";

export interface IOnchainMark extends IBaseMark {
  markType: OnchainMarkType;
  txHash?: string;
  confirmedAt?: Date;
}
