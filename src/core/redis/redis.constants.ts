/**
 * Константы для ключей кэша Redis
 * Формат ключа: {prefix}_{context}_{identifier}
 */
export const REDIS_KEYS = {} as const;

/**
 * Префиксы для разных типов данных
 */
export const REDIS_PREFIXES = {
  SPECTRA: "spectra",
} as const;

/**
 * Контексты для разных типов данных
 */
export const REDIS_CONTEXTS = {} as const;
