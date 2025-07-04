import { OffchainMarkType } from "src/type";
import type { IBaseMark } from "./base.interface";

export interface IOffchainMark extends IBaseMark {
  markType: OffchainMarkType;
}
