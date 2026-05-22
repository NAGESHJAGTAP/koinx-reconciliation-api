# Transaction Reconciliation Engine

A Node.js backend application designed to ingest and reconcile cryptocurrency transactions from two distinct sources: user records and exchange records.

## Key Features

- **Ingestion**: Parses CSV files streams into MongoDB, gracefully handling missing and invalid fields without dropping them silently.
- **Configurable Tolerances**: Allows matching flexibility via environment variables or request parameters (`TIMESTAMP_TOLERANCE_SECONDS` and `QUANTITY_TOLERANCE_PCT`).
- **Smart Matching Engine**: 
  - Resolves ID exact matches.
  - Matches based on proximity (Time, Quantity).
  - Handles equivalent transaction types (e.g., `TRANSFER_IN` matches with `TRANSFER_OUT` from the opposite perspective).
  - Resolves common asset aliases (e.g., `BTC` -> `Bitcoin`).
- **Comprehensive Reporting**: Categorizes all rows as `MATCHED`, `CONFLICTING`, `UNMATCHED_USER`, `UNMATCHED_EXCHANGE`, `INVALID_USER_DATA`, or `INVALID_EXCHANGE_DATA`.
- **Export**: Exports a single, flattened CSV containing side-by-side transaction values.

## Key Decisions Made

- **Mongoose / MongoDB**: Chose MongoDB as the store for transaction records and reports as the unstructured / flexible nature of the imported CSVs (which can be messy) fits well with a document database. A `Mixed` type is used to store the original raw row.
- **Tolerances**: The quantity tolerance was interpreted as a percentage value to create a valid upper/lower bounds. Time tolerance was implemented using an absolute difference in seconds.
- **Reporting Schema**: The reconciliation report itself is persisted in MongoDB and is given a unique `batchId` so it can be downloaded asynchronously by querying an endpoint instead of returning a massive CSV file in the same request stream.

## API Endpoints

- `POST /api/reconcile`
  - Body (form-data):
    - `user_transactions`: CSV file
    - `exchange_transactions`: CSV file
    - `timestampToleranceSeconds` (optional): Override env tolerance.
    - `quantityTolerancePct` (optional): Override env tolerance.
  - Returns: A JSON summary containing the generated `batchId` and summary stats.

- `GET /api/reports/:batchId/download`
  - Returns: The final reconciled CSV report.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root based on `.env.example` or update the generated `.env` with your MongoDB connection string.
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   TIMESTAMP_TOLERANCE_SECONDS=300
   QUANTITY_TOLERANCE_PCT=0.01
   ```

3. **Run Application**

   *Development:*
   ```bash
   npm run dev
   ```

   *Production:*
   ```bash
   npm run build
   npm start
   ```

## Requirements Checked
- [x] Node.js & MongoDB
- [x] Handle data quality issues and log them
- [x] Configurable matching tolerances
- [x] Asset alias mapping (case-insensitive)
- [x] Type mapping (`TRANSFER_IN` to `TRANSFER_OUT`)
- [x] REST Endpoints
- [x] Categorization: Matched, Conflicting, Unmatched (User only), Unmatched (Exchange only)
