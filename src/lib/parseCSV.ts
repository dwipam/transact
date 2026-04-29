import Papa from 'papaparse';
import type { Transaction, CardFormat } from '../types';
import { inferCategoryFromMerchant, normalizeCategory } from './categories';

type Row = Record<string, string>;

function detectFormat(headers: string[]): CardFormat {
  const h = headers.map((s) => s.toLowerCase().trim());
  if (h.includes('transaction date') && h.includes('post date') && h.includes('memo')) return 'chase';
  if (h.includes('account number') && h.includes('transaction description') && h.includes('balance')) return 'chaseChecking';
  if (h.includes('extended details') || h.includes('appears on your statement as')) return 'amex';
  if (h.includes('status') && h.includes('debit') && h.includes('credit') && h.length < 8) return 'citi';
  if (h.includes('card no.') || h.includes('card no')) return 'capitalOne';
  return 'unknown';
}

function parseDate(s: string): Date {
  // Always constructs local-time dates to avoid UTC midnight offset shifting the day
  const clean = s.trim();
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
  const parts = clean.split(/[/-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) return new Date(+a, +b - 1, +c); // YYYY-MM-DD or YYYY/MM/DD
    if (c.length <= 2) return new Date(2000 + +c, +a - 1, +b); // M/D/YY or MM/DD/YY
    return new Date(+c, +a - 1, +b); // MM/DD/YYYY
  }
  return new Date(clean);
}

function parseAmount(s: string): number {
  if (!s || s.trim() === '') return 0;
  return parseFloat(s.replace(/[$,]/g, ''));
}

function normalizeChaseCreditAmount(row: Row): number {
  const rawAmount = parseAmount(row['Amount'] || row['amount'] || '0');
  const type = collapseSpaces(row['Type'] || row['type'] || '').toLowerCase();
  const magnitude = Math.abs(rawAmount);

  // Chase credit card exports represent purchases as negative amounts. Internally,
  // expenses are positive and credits/payments/refunds are negative.
  if (/payment|credit|return|refund/.test(type)) return -magnitude;
  if (/sale|purchase|fee|advance/.test(type)) return magnitude;

  return rawAmount < 0 ? magnitude : rawAmount;
}

function mapChase(row: Row, source: string): Transaction | null {
  const dateStr = row['Transaction Date'] || row['transaction date'];
  const desc = row['Description'] || row['description'] || '';
  const category = row['Category'] || row['category'] || 'Uncategorized';
  if (!dateStr) return null;
  const amount = normalizeChaseCreditAmount(row);
  return { date: parseDate(dateStr), description: desc.trim(), amount, category: normalizeCategory(category), source };
}

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function mapAmex(row: Row, source: string): Transaction | null {
  const dateStr = row['Date'] || row['date'];
  if (!dateStr) return null;

  // Prefer "Appears On Your Statement As" as the clean merchant name; fall back to Description
  const rawDesc =
    row['Appears On Your Statement As'] ||
    row['Description'] ||
    row['description'] ||
    '';
  const desc = collapseSpaces(rawDesc);

  const amtStr = row['Amount'] || row['amount'] || '0';
  const amount = parseAmount(amtStr);

  const category = normalizeCategory(collapseSpaces(row['Category'] || row['category'] || ''));

  return { date: parseDate(dateStr), description: desc, amount, category, source };
}

function debitCredit(debitStr: string, creditStr: string): number {
  const debit = parseAmount(debitStr);
  const credit = parseAmount(creditStr);
  // Debit = expense (positive), Credit = payment/refund (negative)
  if (debit > 0) return debit;
  if (credit > 0) return -credit;
  return 0;
}

function mapCiti(row: Row, source: string): Transaction | null {
  const dateStr = row['Date'] || row['date'];
  const desc = row['Description'] || row['description'] || '';
  if (!dateStr) return null;
  return {
    date: parseDate(dateStr),
    description: desc.trim(),
    amount: debitCredit(row['Debit'] || row['debit'] || '', row['Credit'] || row['credit'] || ''),
    category: 'Uncategorized',
    source,
  };
}

function mapChaseChecking(row: Row, source: string): Transaction | null {
  const dateStr = row['Transaction Date'] || row['transaction date'] || '';
  const desc = row['Transaction Description'] || row['transaction description'] || '';
  const amtStr = row['Transaction Amount'] || row['transaction amount'] || '';
  const type = (row['Transaction Type'] || row['transaction type'] || '').toUpperCase();
  if (!dateStr) return null;

  // Chase Checking exports vary: some files use signed amounts, others use absolute
  // values with the Type column ("Debit" / "Credit" / "ACH_DEBIT" / "ACH_CREDIT") as
  // the only direction indicator. Normalize to magnitude + Type so we get a consistent
  // sign regardless of which export style is in use.
  const magnitude = Math.abs(parseAmount(amtStr));
  const isCredit = type.includes('CREDIT') || type === 'DEPOSIT';
  const amount = isCredit ? -magnitude : magnitude;

  const description = collapseSpaces(desc);
  return {
    date: parseDate(dateStr),
    description,
    amount,
    category: inferCategoryFromMerchant(description),
    source,
  };
}

function mapCapitalOne(row: Row, source: string): Transaction | null {
  const dateStr = row['Transaction Date'] || row['transaction date'];
  const desc = row['Description'] || row['description'] || '';
  const category = row['Category'] || row['category'] || '';
  if (!dateStr) return null;
  return {
    date: parseDate(dateStr),
    description: collapseSpaces(desc),
    amount: debitCredit(row['Debit'] || row['debit'] || '', row['Credit'] || row['credit'] || ''),
    category: normalizeCategory(collapseSpaces(category)),
    source,
  };
}

function mapUnknown(row: Row, headers: string[], source: string): Transaction | null {
  // Best-effort: find date, description, amount columns heuristically
  const dateKey = headers.find((h) => /date/i.test(h));
  const descKey = headers.find((h) => /desc|merchant|name/i.test(h));
  const amtKey = headers.find((h) => /amount|total|charge/i.test(h));
  const catKey = headers.find((h) => /cat/i.test(h));
  if (!dateKey || !amtKey) return null;
  const dateStr = row[dateKey];
  const desc = descKey ? (row[descKey] || '') : '';
  const amount = parseAmount(row[amtKey] || '0');
  const category = catKey ? (row[catKey] || '') : '';
  return { date: parseDate(dateStr), description: desc.trim(), amount, category: normalizeCategory(category), source };
}

export async function parseCSVFile(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (!results.data.length) { resolve([]); return; }
        const headers = Object.keys(results.data[0]);
        const format = detectFormat(headers);
        const source = file.name.replace(/\.csv$/i, '');
        const txns: Transaction[] = [];
        const dropped: { row: Row; reason: string }[] = [];
        for (const row of results.data) {
          const txn =
            format === 'chase' ? mapChase(row, source) :
            format === 'chaseChecking' ? mapChaseChecking(row, source) :
            format === 'amex' ? mapAmex(row, source) :
            format === 'citi' ? mapCiti(row, source) :
            format === 'capitalOne' ? mapCapitalOne(row, source) :
            mapUnknown(row, headers, source);
          if (!txn) { dropped.push({ row, reason: 'mapper returned null (missing required column)' }); continue; }
          if (isNaN(txn.date.getTime())) { dropped.push({ row, reason: 'unparseable date' }); continue; }
          txns.push(txn);
        }
        if (dropped.length) {
          console.warn(`[parseCSV] ${file.name}: dropped ${dropped.length}/${results.data.length} rows (format=${format}). Sample:`, dropped.slice(0, 5));
        }
        resolve(txns);
      },
      error: reject,
    });
  });
}
