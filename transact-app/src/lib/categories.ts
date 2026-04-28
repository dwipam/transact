// Canonical category names keyed by lowercased top-level and sub-level tokens
const TOP: Record<string, string> = {
  'restaurant': 'Dining',
  'dining': 'Dining',
  'food & beverage': 'Dining',
  'merchandise & supplies': 'Shopping',
  'merchandise': 'Shopping',
  'shopping': 'Shopping',
  'business services': 'Business',
  'entertainment': 'Entertainment',
  'fees & adjustments': 'Fees',
  'fees': 'Fees',
  'transportation': 'Transportation',
  'travel': 'Travel',
  'lodging': 'Travel',
  'other travel': 'Travel',
  'health care': 'Health',
  'health & fitness': 'Health',
  'health': 'Health',
  'gas/automotive': 'Gas & Auto',
  'automotive': 'Gas & Auto',
  'phone/cable': 'Bills & Utilities',
  'utilities': 'Bills & Utilities',
  'other services': 'Other',
  'other': 'Other',
  'personal': 'Personal',
  'education': 'Education',
  'insurance': 'Insurance',
  'government': 'Government',
};

// Sub-level overrides — checked when top-level match is less specific
const SUB: Record<string, string> = {
  'groceries': 'Groceries',
  'pharmacies': 'Health',
  'fuel': 'Gas & Auto',
  'lodging': 'Travel',
  'hardware supplies': 'Home',
  'department stores': 'Shopping',
  'internet purchase': 'Shopping',
  'mail order': 'Shopping',
  'mailing & shipping': 'Shipping',
  'contracting services': 'Business',
  'theatrical events': 'Entertainment',
  'movies/music': 'Entertainment',
};

// Ordered merchant patterns — first match wins
const MERCHANT_PATTERNS: [RegExp, string][] = [
  // Streaming / subscriptions
  [/netflix|hulu|disney\+?|peacock|paramount|apple\s*tv|spotify|youtube\s*premium|amazon\s*prime/i, 'Entertainment'],
  // Delivery / food apps
  [/uber\s*\*?\s*eats|doordash|grubhub|postmates|instacart/i, 'Dining'],
  // Ride share
  [/uber\s*\*?\s*one|uber|lyft/i, 'Transportation'],
  // Fitness
  [/la\s*fitness|planet\s*fitness|equinox|gold.?s\s*gym|anytime\s*fitness|ymca|crunch\s*fitness/i, 'Health'],
  // Grocery stores
  [/harris\s*teeter|safeway|whole\s*foods|kroger|publix|trader\s*joe|aldi|patel\s*brothers|wegmans|giant\s*food|stop\s*&\s*shop/i, 'Groceries'],
  // Big-box / online retail
  [/amazon|amzn|walmart|target|costco|sam.?s\s*club|bj.?s\s*wholesale/i, 'Shopping'],
  // Department / clothing
  [/macy.?s|nordstrom|tj\s*maxx|marshalls|ross|h&m|zara|gap|old\s*navy/i, 'Shopping'],
  // Home improvement
  [/home\s*depot|lowe.?s|ikea|bed\s*bath/i, 'Home'],
  // Coffee / cafes
  [/starbucks|dunkin|tim\s*horton|caribou|panera|peet.?s|coffee|cafe|roast/i, 'Dining'],
  // Restaurants / food
  [/restaurant|dhaba|tiffin|express\s*inc|pizza|sushi|burger|mcdonald|chick.?fil|chipotle|subway|domino|wendy|taco\s*bell/i, 'Dining'],
  // Pharmacy / drug store
  [/walgreens|cvs|rite\s*aid|pharmacy|duane\s*reade/i, 'Health'],
  // Gas / auto
  [/shell|exxon|bp\s|chevron|sunoco|royal\s*farms|wawa|speedway|marathon|valero/i, 'Gas & Auto'],
  [/auto\s*stop|autozone|o.?reilly\s*auto|jiffy\s*lube|firestone|valvoline|pep\s*boys|midas|napa\s*auto|car\s*wash/i, 'Gas & Auto'],
  // Dry cleaning / laundry
  [/cleaners|laundry|dry\s*clean/i, 'Personal'],
  // Pest / home services
  [/pest|termite|orkin|terminix|cleardefense/i, 'Home'],
  // Flights / airlines
  [/cot\s*\*?\s*flt|spirit\s*air|delta|united\s*air|american\s*air|southwest|jetblue|frontier|alaska\s*air|air\s*canada|flight/i, 'Travel'],
  // Hotels / lodging
  [/hyatt|marriott|hilton|holiday\s*inn|airbnb|vrbo|hotel|motel|resort|inn\b/i, 'Travel'],
  // Parking / tolls
  [/parking|ez\s*pass|i-pass|sunpass|toll/i, 'Transportation'],
  // Utilities / bills
  [/electric|water\s*bill|gas\s*bill|verizon|at&t|t-mobile|comcast|xfinity|cox\s*comm|spectrum/i, 'Bills & Utilities'],
  // Insurance
  [/insurance|geico|allstate|state\s*farm|progressive|nationwide|liberty\s*mutual/i, 'Insurance'],
  // Education
  [/college|university|transcript|tuition|coursera|udemy|khan\s*academy|skillshare/i, 'Education'],
  // Shipping
  [/usps|fedex|ups\s|post\s*office|stamps\.com/i, 'Shipping'],
  // Cloud / tech subscriptions
  [/aws\.|amazon\s*web\s*services|google\s*\*|microsoft|apple\.com|icloud|adobe/i, 'Business'],
];

// ── Merchant display cleaning ──────────────────────────────────────────────

// Payment processor prefixes that appear before the real merchant name
const PROCESSOR_PREFIX = /^(apl\s*\*?\s*pay|sq\s*\*|tst\s*\*|py\s*\*|sp\s*\*|pp\s*\*|paypal\s*\*|in\s*\*|google\s*\*|amzn\s+mktp\S*\s*\*?|amazon\s+mktpl|ven\s*\*)\s*/i;

const STATES = 'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC';
// Space required — always safe to apply
const STATE_SPACE    = new RegExp(`\\s+(${STATES})\\s*$`, 'i');
// No space — only safe when we know the state was concatenated after a stripped element
const STATE_NOSPACE  = new RegExp(`(?<=[A-Za-z])(${STATES})\\s*$`, 'i');

function titleCase(s: string): string {
  return s.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/**
 * Strips payment processor prefixes, phone numbers, URLs, and trailing city/state
 * from raw credit card transaction descriptions for human-readable display.
 *
 * Limitation: when merchant and city are concatenated without a space
 * (e.g. "WalgreensAshburn") a dedicated enrichment API such as Ntropy is needed.
 */
export function cleanMerchantDisplay(raw: string): string {
  let s = raw.trim();
  if (!s) return s;

  // 1. Strip processor prefix
  s = s.replace(PROCESSOR_PREFIX, '');

  // 2. Strip phone numbers, tracking whether we did (gate for step 6b)
  let strippedPhone = false;
  s = s.replace(/\s*\d{3}[-.]?\d{3}[-.]?\d{4}/g, () => { strippedPhone = true; return ''; });

  // 3. Domain-style: NETFLIX.COM… or NETFLIX.COMNETFLIX.COMCA → "Netflix"
  //    No \b after COM — catches Capital One's repeated-domain patterns
  const domainOnly = s.match(/^([A-Za-z0-9]+)\.(?:COM|NET|ORG|IO)/i);
  if (domainOnly) {
    s = domainOnly[1];
  } else {
    s = s.replace(/\s*HELP\.UBER\.COM\S*/gi, '');   // EATSHELP.UBER.COMCA → strip noise
    s = s.replace(/\s*UBER\.COM[/\S]*/gi, '');       // MEMBERSHIPUBER.COM/BILLCA → strip
    s = s.replace(/\s*\b\w+\.(?:COM|NET|ORG|IO)\S*/gi, '').trim();
  }

  // 4. Strip store-number + city concatenations: " #310ASHBURNVA" or " 140STERLINGVA"
  s = s.replace(/\s+#?\d+[A-Z]{3,}\w*/g, '');

  // 5a. Strip trailing state when space-separated — safe, allow city strip after
  let hadStateSpace = false;
  s = s.replace(STATE_SPACE, () => { hadStateSpace = true; return ''; }).trim();

  // 5b. Strip trailing state without space ONLY when a phone was stripped —
  //     prevents false positives like "LIME" losing "ME" (Maine) after URL strip
  if (!hadStateSpace && strippedPhone) {
    s = s.replace(STATE_NOSPACE, () => '').trim();
  }

  // 6. Strip trailing all-caps city word only after a space-separated state was found
  if (hadStateSpace) {
    const words = s.split(/\s+/);
    if (words.length > 1 && /^[A-Z]{3,}$/.test(words[words.length - 1])) {
      s = words.slice(0, -1).join(' ');
    }
  }

  // 7. Strip trailing store numbers and lone asterisks
  s = s.replace(/\s*#?\d+\s*$/, '').replace(/\s*\*\s*$/, '').trim();

  s = s.replace(/\s+/g, ' ').trim();
  return s ? titleCase(s) : raw.trim();
}

// Infer category from a merchant description when no structured category is available
export function inferCategoryFromMerchant(description: string): string {
  for (const [pattern, category] of MERCHANT_PATTERNS) {
    if (pattern.test(description)) return category;
  }
  return 'Uncategorized';
}

export function normalizeCategory(raw: string): string {
  if (!raw || !raw.trim()) return 'Uncategorized';

  const dashIdx = raw.indexOf('-');
  const topRaw = dashIdx >= 0 ? raw.slice(0, dashIdx).trim() : raw.trim();
  const subRaw = dashIdx >= 0 ? raw.slice(dashIdx + 1).trim() : '';

  const topKey = topRaw.toLowerCase();
  const subKey = subRaw.toLowerCase();

  // Sub-level is most specific — try it first
  if (subKey && SUB[subKey]) return SUB[subKey];
  // Top-level
  if (TOP[topKey]) return TOP[topKey];

  // Partial match on top-level (e.g., "Gas/Automotive" contains "auto")
  for (const [k, v] of Object.entries(TOP)) {
    if (topKey.includes(k) || k.includes(topKey)) return v;
  }

  // Fallback: title-case the top-level string
  return topRaw.charAt(0).toUpperCase() + topRaw.slice(1);
}
