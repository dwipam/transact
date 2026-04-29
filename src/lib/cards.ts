// Cash-back / rewards rules for major US credit cards.
//
// Rates last checked against issuer pages in Apr 2026. Issuers adjust rates
// and fees frequently; verify `sourceUrl` before relying on the numbers.
//
// Modeling notes:
//   - `categories` references the canonical names from `categories.ts`.
//     Use ['*'] for catch-all rules (also expressed via `baseRate`).
//   - `rate` is the cash-back equivalent. For points cards, `pointValue` is
//     applied later by the simulator (default 1¢/pt). E.g., Sapphire
//     Preferred earning 3x dining → rate: 0.03 with pointValue: 1 = 3% cash.
//   - Rotating quarterly bonuses (Freedom Flex, Discover) are NOT modeled —
//     too dynamic for a static table.
//   - Citi Custom Cash's "top eligible category each month" is also skipped
//     for v1; needs a per-month optimizer in the simulator.

export type CapPeriod = 'quarter' | 'year';
export type CreditPeriod = 'year' | 'four_years';

export interface RewardRule {
  categories: string[];          // canonical category names, or ['*'] for all
  rate: number;                  // cash-back equivalent, e.g. 0.04
  cap?: { amount: number; period: CapPeriod };
  note?: string;
}

export interface CardCredit {
  label: string;
  amount: number;
  period: CreditPeriod;
  note?: string;
}

export function creditKey(cardId: string, credit: CardCredit): string {
  return `${cardId}:${credit.label}`;
}

export type Issuer = 'Chase' | 'Amex' | 'Citi' | 'Capital One' | 'BoA';

export interface Card {
  id: string;
  name: string;
  issuer: Issuer;
  annualFee: number;
  baseRate: number;              // catch-all rate for non-bonus spend
  rules: RewardRule[];
  credits?: CardCredit[];
  pointValue?: number;           // cents per point; defaults to 1
  sourceUrl: string;
  notes?: string;
}

export const CARDS: Card[] = [
  // ── Chase ────────────────────────────────────────────────────────────────
  {
    id: 'chase-sapphire-preferred',
    name: 'Chase Sapphire Preferred',
    issuer: 'Chase',
    annualFee: 95,
    baseRate: 0.01,
    rules: [
      { categories: ['Dining'], rate: 0.03 },
      { categories: ['Travel', 'Transportation'], rate: 0.02 },
    ],
    credits: [
      { label: 'Chase Travel hotel credit', amount: 50, period: 'year', note: 'Hotel stays booked through Chase Travel.' },
    ],
    pointValue: 1,
    sourceUrl: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
    notes: '5x Chase Travel, 3x online grocery, and 3x select streaming are not modeled separately; points worth 1.25¢ in Chase Travel, but this uses a 1¢ cash baseline.',
  },
  {
    id: 'chase-freedom-unlimited',
    name: 'Chase Freedom Unlimited',
    issuer: 'Chase',
    annualFee: 0,
    baseRate: 0.015,
    rules: [
      { categories: ['Dining'], rate: 0.03 },
      { categories: ['Health'], rate: 0.03, note: 'Drugstore purchases.' },
    ],
    pointValue: 1,
    sourceUrl: 'https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited',
    notes: '5% Chase Travel portal purchases are not modeled separately.',
  },
  {
    id: 'chase-freedom-flex',
    name: 'Chase Freedom Flex',
    issuer: 'Chase',
    annualFee: 0,
    baseRate: 0.01,
    rules: [
      { categories: ['Dining'], rate: 0.03 },
      { categories: ['Health'], rate: 0.03, note: 'Drugstore purchases.' },
    ],
    pointValue: 1,
    sourceUrl: 'https://creditcards.chase.com/cash-back-credit-cards/freedom/flex',
    notes: '5% Chase Travel portal purchases and rotating 5% quarterly categories are not modeled separately.',
  },

  // ── Amex ─────────────────────────────────────────────────────────────────
  {
    id: 'amex-gold',
    name: 'American Express Gold Card',
    issuer: 'Amex',
    annualFee: 325,
    baseRate: 0.01,
    rules: [
      { categories: ['Dining'], rate: 0.04, cap: { amount: 50000, period: 'year' } },
      { categories: ['Groceries'], rate: 0.04, cap: { amount: 25000, period: 'year' }, note: 'U.S. supermarkets.' },
      { categories: ['Travel'], rate: 0.03, note: 'Flights booked direct or via Amex Travel.' },
    ],
    credits: [
      { label: 'Uber Cash', amount: 120, period: 'year', note: 'Monthly U.S. Uber/Uber Eats benefit.' },
      { label: 'Dining credit', amount: 120, period: 'year', note: 'Monthly eligible dining partners.' },
      { label: 'Resy credit', amount: 100, period: 'year', note: 'Semiannual U.S. Resy restaurants or eligible Resy purchases.' },
      { label: 'Dunkin credit', amount: 84, period: 'year', note: 'Monthly U.S. Dunkin purchases.' },
    ],
    pointValue: 1,
    sourceUrl: 'https://www.americanexpress.com/us/credit-cards/card/gold-card/',
    notes: 'The Hotel Collection on-property credit is per eligible stay and not annualized here.',
  },
  {
    id: 'amex-blue-cash-preferred',
    name: 'Amex Blue Cash Preferred',
    issuer: 'Amex',
    annualFee: 95,
    baseRate: 0.01,
    rules: [
      { categories: ['Groceries'], rate: 0.06, cap: { amount: 6000, period: 'year' }, note: 'U.S. supermarkets.' },
      { categories: ['Entertainment'], rate: 0.06, note: 'Select U.S. streaming.' },
      { categories: ['Transportation'], rate: 0.03, note: 'U.S. transit incl. parking, tolls, rideshare.' },
      { categories: ['Gas & Auto'], rate: 0.03 },
    ],
    credits: [
      { label: 'Disney Streaming credit', amount: 120, period: 'year', note: 'Monthly eligible Disney+, Hulu, or ESPN subscription purchases.' },
    ],
    pointValue: 1,
    sourceUrl: 'https://www.americanexpress.com/us/credit-cards/card/blue-cash-preferred/',
    notes: '$0 intro annual fee for the first year, then $95; modeled as ongoing $95.',
  },
  {
    id: 'amex-blue-cash-everyday',
    name: 'Amex Blue Cash Everyday',
    issuer: 'Amex',
    annualFee: 0,
    baseRate: 0.01,
    rules: [
      { categories: ['Groceries'], rate: 0.03, cap: { amount: 6000, period: 'year' }, note: 'U.S. supermarkets.' },
      { categories: ['Gas & Auto'], rate: 0.03, cap: { amount: 6000, period: 'year' } },
      { categories: ['Shopping'], rate: 0.03, cap: { amount: 6000, period: 'year' }, note: 'U.S. online retail.' },
    ],
    credits: [
      { label: 'Disney Streaming credit', amount: 84, period: 'year', note: 'Monthly eligible Disney+, Hulu, or ESPN subscription purchases.' },
    ],
    pointValue: 1,
    sourceUrl: 'https://www.americanexpress.com/us/credit-cards/card/blue-cash-everyday/',
  },
  {
    id: 'amex-platinum',
    name: 'American Express Platinum Card',
    issuer: 'Amex',
    annualFee: 895,
    baseRate: 0.01,
    rules: [
      { categories: ['Travel'], rate: 0.05, note: 'Flights direct or via Amex Travel; prepaid hotels via Amex Travel.' },
    ],
    credits: [
      { label: 'Hotel credit', amount: 600, period: 'year', note: 'Prepaid Fine Hotels + Resorts or The Hotel Collection through Amex Travel.' },
      { label: 'Airline fee credit', amount: 200, period: 'year', note: 'Incidental fees on one selected qualifying airline.' },
      { label: 'CLEAR+ credit', amount: 209, period: 'year' },
      { label: 'Uber Cash', amount: 200, period: 'year', note: 'Monthly U.S. Uber/Uber Eats benefit.' },
      { label: 'Uber One credit', amount: 120, period: 'year', note: 'Auto-renewing Uber One membership.' },
      { label: 'Digital Entertainment credit', amount: 300, period: 'year' },
      { label: 'Resy credit', amount: 400, period: 'year', note: 'Quarterly U.S. Resy restaurants or eligible Resy purchases.' },
      { label: 'Walmart+ credit', amount: 155, period: 'year', note: 'Monthly Walmart+ membership.' },
      { label: 'lululemon credit', amount: 300, period: 'year', note: 'Quarterly eligible U.S. lululemon purchases.' },
      { label: 'Global Entry/TSA PreCheck credit', amount: 120, period: 'four_years' },
    ],
    pointValue: 1,
    sourceUrl: 'https://www.americanexpress.com/us/credit-cards/card/platinum/',
    notes: 'Credits require eligible purchases and enrollment where applicable; lounge value is not included.',
  },

  // ── Citi ─────────────────────────────────────────────────────────────────
  {
    id: 'citi-double-cash',
    name: 'Citi Double Cash',
    issuer: 'Citi',
    annualFee: 0,
    baseRate: 0.02,
    rules: [],
    sourceUrl: 'https://www.citi.com/credit-cards/citi-double-cash-credit-card',
    notes: '1% when you buy + 1% when you pay; modeled as flat 2%.',
  },
  {
    id: 'citi-strata-premier',
    name: 'Citi Strata Premier',
    issuer: 'Citi',
    annualFee: 95,
    baseRate: 0.01,
    rules: [
      { categories: ['Travel', 'Gas & Auto', 'Dining', 'Groceries'], rate: 0.03 },
    ],
    credits: [
      { label: 'Citi Travel hotel benefit', amount: 100, period: 'year', note: 'Single hotel stay of $500+ excluding taxes and fees through Citi Travel.' },
    ],
    pointValue: 1,
    sourceUrl: 'https://www.citi.com/credit-cards/citi-strata-premier-credit-card',
    notes: '10x on hotels, car rentals, and attractions through Citi Travel not modeled separately.',
  },

  // ── Capital One ──────────────────────────────────────────────────────────
  {
    id: 'capital-one-venture-x',
    name: 'Capital One Venture X Rewards',
    issuer: 'Capital One',
    annualFee: 395,
    baseRate: 0.02,
    rules: [],
    credits: [
      { label: 'Capital One Travel credit', amount: 300, period: 'year', note: 'Bookings through Capital One Travel.' },
      { label: 'Anniversary miles value', amount: 100, period: 'year', note: '10,000 anniversary miles valued at 1 cent each.' },
      { label: 'Global Entry/TSA PreCheck credit', amount: 120, period: 'four_years' },
    ],
    pointValue: 1,
    sourceUrl: 'https://www.capitalone.com/credit-cards/venture-x/',
    notes: '10x hotels/rental cars and 5x flights/vacation rentals through Capital One Travel are not modeled separately.',
  },
  {
    id: 'capital-one-venture',
    name: 'Capital One Venture Rewards',
    issuer: 'Capital One',
    annualFee: 95,
    baseRate: 0.02,
    rules: [],
    credits: [
      { label: 'Global Entry/TSA PreCheck credit', amount: 120, period: 'four_years' },
    ],
    pointValue: 1,
    sourceUrl: 'https://www.capitalone.com/credit-cards/venture/',
    notes: '5x hotels, vacation rentals, and rental cars through Capital One Travel are not modeled separately.',
  },
  {
    id: 'capital-one-ventureone',
    name: 'Capital One VentureOne Rewards',
    issuer: 'Capital One',
    annualFee: 0,
    baseRate: 0.0125,
    rules: [],
    pointValue: 1,
    sourceUrl: 'https://www.capitalone.com/credit-cards/ventureone/',
    notes: '5x hotels, vacation rentals, and rental cars through Capital One Travel are not modeled separately.',
  },
  {
    id: 'capital-one-savorone',
    name: 'Capital One Savor',
    issuer: 'Capital One',
    annualFee: 0,
    baseRate: 0.01,
    rules: [
      { categories: ['Dining', 'Groceries', 'Entertainment'], rate: 0.03, note: 'Grocery excludes superstores like Walmart and Target; entertainment includes select streaming.' },
    ],
    sourceUrl: 'https://www.capitalone.com/credit-cards/savor/',
    notes: '5% Capital One Travel portal and 8% Capital One Entertainment purchases are not modeled separately.',
  },
  {
    id: 'capital-one-quicksilver',
    name: 'Capital One Quicksilver',
    issuer: 'Capital One',
    annualFee: 0,
    baseRate: 0.015,
    rules: [],
    sourceUrl: 'https://www.capitalone.com/credit-cards/quicksilver/',
    notes: '5% Capital One Travel portal purchases are not modeled separately.',
  },

  // ── Bank of America ──────────────────────────────────────────────────────
  {
    id: 'boa-customized-cash',
    name: 'BoA Customized Cash Rewards',
    issuer: 'BoA',
    annualFee: 0,
    baseRate: 0.01,
    rules: [
      { categories: ['Dining'], rate: 0.03, cap: { amount: 2500, period: 'quarter' }, note: 'Choose-your-3% category; Dining is the most common pick. Cap is shared with the 2% rule below.' },
      { categories: ['Groceries'], rate: 0.02, cap: { amount: 2500, period: 'quarter' } },
    ],
    sourceUrl: 'https://www.bankofamerica.com/credit-cards/products/cash-back-credit-card/',
  },
  {
    id: 'boa-premium-rewards',
    name: 'BoA Premium Rewards',
    issuer: 'BoA',
    annualFee: 95,
    baseRate: 0.015,
    rules: [
      { categories: ['Travel', 'Dining'], rate: 0.02 },
    ],
    credits: [
      { label: 'Airline incidental credit', amount: 100, period: 'year' },
      { label: 'Global Entry/TSA PreCheck credit', amount: 100, period: 'four_years' },
    ],
    sourceUrl: 'https://www.bankofamerica.com/credit-cards/products/premium-rewards-credit-card/',
  },
  {
    id: 'boa-travel-rewards',
    name: 'BoA Travel Rewards',
    issuer: 'BoA',
    annualFee: 0,
    baseRate: 0.015,
    rules: [],
    sourceUrl: 'https://www.bankofamerica.com/credit-cards/products/travel-rewards-credit-card/',
  },
];
