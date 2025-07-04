/**
 * Типы оценок для офф-чейн
 * ПОРЯДОК ВАЖЕН!!!
 */
export enum OffchainMarkType {
  RELATION = 'RelationMark',
  BUSINESS_FEEDBACK = 'BusinessFeedback',
}

/**
 * Типы оценок для он-чейн
 * ПОРЯДОК ВАЖЕН!!!
 */
export enum OnchainMarkType {
  TRUST = 'TrustMark',
}


export const OffchainMarkTypeMap: Record<number, OffchainMarkType | null> = {
  0: null, // UNSPECIFIED
  1: OffchainMarkType.RELATION,
  2: OffchainMarkType.BUSINESS_FEEDBACK,
};

export const OnchainMarkTypeMap: Record<number, OnchainMarkType | null> = {
  0: null, // UNSPECIFIED
  1: OnchainMarkType.TRUST,
};