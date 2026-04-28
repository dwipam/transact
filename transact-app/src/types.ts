export interface Transaction {
  date: Date;
  description: string;
  amount: number; // positive = expense, negative = credit/refund
  category: string;
  source: string; // filename / card label
}

export type CardFormat = 'chase' | 'amex' | 'citi' | 'capitalOne' | 'unknown';
