import Papa from 'papaparse';
import type { Transaction, CardFormat } from '../types';
import { normalizeCategory } from './categories';

type Row = Record<string, string>;

function detectFormat(headers: string[]): CardFormat {
  const h = headers.map((s) => s.toLowerCase().trim());
  if (h.includes('transaction date') && h.includes('post date') && h.includes('memo')) return 'chase';
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

function mapChase(row: Row, source: string): Transaction | null {
  const dateStr = row['Transaction Date'] || row['transaction date'];
  const desc = row['Description'] || row['description'] || '';
  const amtStr = row['Amount'] || row['amount'] || '0';
  const category = row['Category'] || row['category'] || 'Uncategorized';
  if (!dateStr) return null;
  const amount = parseAmount(amtStr);
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
        for (const row of results.data) {
          const txn =
            format === 'chase' ? mapChase(row, source) :
            format === 'amex' ? mapAmex(row, source) :
            format === 'citi' ? mapCiti(row, source) :
            format === 'capitalOne' ? mapCapitalOne(row, source) :
            mapUnknown(row, headers, source);
          if (txn && !isNaN(txn.date.getTime())) txns.push(txn);
        }
        resolve(txns);
      },
      error: reject,
    });
  });
}
