# Home Loan Payment Visualizer

A lightweight web page for visualizing home loan payments from a file.

It plots a **stacked line chart** by date (usually monthly):
- **Principal payment** (original pay) at the bottom.
- **Interest payment** stacked on top of the principal.
- The top line represents the **Total Monthly Payment**.

When you hover a point on the chart, the tooltip shows:
- Principal and interest components for that date.
- Monthly total for that date.
- Cumulative principal up to that date (prefix sum).
- Cumulative interest up to that date (prefix sum).

## Features

- **Stacked Visualization**: See both individual components and total monthly burden at a glance.
- **RMB Support**: All values are formatted with the ¥ sign.
- **File Upload** from local machine (`.txt` or `.csv`).
- **Flexible Parsing**: Supports comma, tab, or whitespace separators.
- **Summary Cards**: Totals for principal, interest, and overall paid amount.

## Input File Format

Each non-empty line should contain **3 fields**:
1. Date
2. Principal payment
3. Interest payment

Examples:

```text
2026-05-01, 2300.50, 781.20
2026-06-01, 2310.00, 770.10
2026-07-01 2320.75 759.00
```

Notes:
- Lines starting with `#` are treated as comments and ignored.
- Amounts may include `$` and `,` (they are normalized during parsing).
- Date values are sorted chronologically when possible.

## Quick Start

### Option 1: Open directly

Open `index.html` in your browser.

### Option 2: Run a simple local server (recommended)

From this project folder:

```bash
python3 -m http.server 8080
```

Then open:

`http://localhost:8080`

## Project Structure

- `index.html` - Page layout and script/style includes
- `styles.css` - Visual design and responsive styles
- `script.js` - File parsing, chart rendering, tooltip prefix sums

## How Hover Prefix Sum Works

For each row index `i`:
- `principalPrefix[i] = sum(principal[0..i])`
- `interestPrefix[i] = sum(interest[0..i])`

The chart tooltip footer displays these cumulative values for the hovered date.

## Tech Stack

- Vanilla HTML/CSS/JavaScript
- [Chart.js](https://www.chartjs.org/) loaded from CDN

## Troubleshooting

- If no chart appears, check the file has valid rows in `date principal interest` format.
- If many lines are skipped, verify separators and numeric amounts.
- If you see browser security restrictions from local files, use the local server method.
