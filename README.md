# Transact

Transact is a free, open-source credit card spend analyzer. Upload CSV transaction statements from issuers like Chase, Amex, Citi, and Capital One to analyze spending, find recurring charges, compare credit card rewards, estimate cashback, and discover expected upside without sending data to a server.

## Features

- Analyze credit card CSV statements locally in your browser.
- Parse common credit card CSV exports, including Chase, Amex, Citi, Capital One, and best-effort unknown formats.
- Summarize total spend, transaction count, average monthly spend, and top category.
- Visualize monthly spend, category breakdown, top merchants, and recurring merchants.
- Compare credit card rewards, annual fees, statement credits, estimated cashback, and expected upside.
- Click one or more bars in the category chart to filter the dashboard by selected months.
- Search, category-filter, sort, paginate, and remove transactions from the table.
- Removed transactions update every dashboard view immediately.

## Search Keywords

Transact is built for people searching for a credit card spend analyzer, credit card transaction analyzer, credit card CSV analyzer, cashback calculator, credit card rewards calculator, credit card rewards optimizer, credit card statement analyzer, recurring charges analyzer, personal finance CSV analyzer, and credit card spending insights.

Suggested GitHub topics: `personal-finance`, `credit-card`, `cashback`, `rewards`, `csv-parser`, `spending-analysis`, `react`, `typescript`, `open-source`.

## Development

Install dependencies:

```sh
npm install
```

Start the local dev server:

```sh
npm run dev
```

Run checks:

```sh
npm run lint
npm run build
```

Preview a production build:

```sh
npm run preview
```

## Data Handling

All parsing and analysis happens in the browser. Uploaded CSV data is held in local app state and is cleared when the page reloads or when you click `Clear all`.
