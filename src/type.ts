import { OffchainMarkType, OnchainMarkType } from "@metastate-is/proto-models/generated/metastate/grpc/spectra/v1/reputation_context";

/**
 * Типы оценок для офф-чейн
 * ПОРЯДОК ВАЖЕН!!!
 */
export enum OffchainMarkTypeEnum {
  RELATION = "RelationMark",
  BUSINESS_FEEDBACK = "BusinessFeedback",
}

/**
 * Типы оценок для он-чейн
 * ПОРЯДОК ВАЖЕН!!!
 */
export enum OnchainMarkTypeEnum {
  TRUST = "TrustMark",
}

/**
 * Другие типы нодов  
 */
export enum OtherTypeNodes {
  CHANGELOG = "Changelog"
}

export const OffchainMarkTypeMap: Record<number, OffchainMarkTypeEnum | null> = {
  0: null, // UNSPECIFIED
  1: OffchainMarkTypeEnum.RELATION,
  2: OffchainMarkTypeEnum.BUSINESS_FEEDBACK,
};

export const OnchainMarkTypeMap: Record<number, OnchainMarkTypeEnum | null> = {
  0: null, // UNSPECIFIED
  1: OnchainMarkTypeEnum.TRUST,
};

export const OffchainMarkTypeMapInx: Record<OffchainMarkTypeEnum, OffchainMarkType> = {
  [OffchainMarkTypeEnum.RELATION]: OffchainMarkType.OFFCHAIN_MARK_TYPE_RELATION,
  [OffchainMarkTypeEnum.BUSINESS_FEEDBACK]: OffchainMarkType.OFFCHAIN_MARK_TYPE_BUSINESS_FEEDBACK,
}

export const OnchainMarkTypeMapInx: Record<OnchainMarkTypeEnum, OnchainMarkType> = {
  [OnchainMarkTypeEnum.TRUST]: OnchainMarkType.ONCHAIN_MARK_TYPE_TRUST,
}

