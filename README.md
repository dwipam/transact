# Transact

Transact is a free credit card transaction analysis app. Upload CSV statements, inspect spending by month and category, and filter the dashboard without sending data to a server.

## Features

- Parse common credit card CSV exports, including Chase, Amex, Citi, Capital One, and best-effort unknown formats.
- Summarize total spend, transaction count, average monthly spend, and top category.
- Visualize monthly spend, category breakdown, top merchants, and recurring merchants.
- Click one or more bars in the category chart to filter the dashboard by selected months.
- Search, category-filter, sort, paginate, and remove transactions from the table.
- Removed transactions update every dashboard view immediately.

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
