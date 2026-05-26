export interface CurrencySpec {
  readonly code: string;
  readonly decimals: number;
  readonly symbol: string;
}

const REGISTRY = {
  BRL: { code: 'BRL', decimals: 2, symbol: 'R$' },
  USD: { code: 'USD', decimals: 2, symbol: '$' },
  EUR: { code: 'EUR', decimals: 2, symbol: '€' },
  JPY: { code: 'JPY', decimals: 0, symbol: '¥' },
} as const satisfies Record<string, CurrencySpec>;

export type CurrencyCode = keyof typeof REGISTRY;

export const CURRENCIES: Record<CurrencyCode, CurrencySpec> = REGISTRY;

export function isCurrencyCode(value: string): value is CurrencyCode {
  return value in REGISTRY;
}
