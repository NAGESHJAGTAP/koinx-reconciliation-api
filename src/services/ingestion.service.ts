import fs from 'fs';
import csv from 'csv-parser';
import { Transaction, ITransaction } from '../models/Transaction';
import { normalizeAsset } from '../utils/constants';

export const parseCSVAndStore = (
  filePath: string,
  batchId: string,
  source: 'USER' | 'EXCHANGE'
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transactions: Partial<ITransaction>[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const errorReasons: string[] = [];
        let isValid = true;
        
        // Extract fields (using common variations for column names to handle messy data)
        const transactionId = row.id || row.transaction_id || row.txn_id || row.TransactionId;
        const rawTimestamp = row.timestamp || row.date || row.Date || row.Time;
        const rawQuantity = row.quantity || row.amount || row.Amount || row.Qty;
        const type = row.type || row.Type || row.transaction_type;
        const asset = row.asset || row.coin || row.currency || row.Asset;

        // Validation & parsing
        let timestamp: Date | undefined;
        if (!rawTimestamp) {
          isValid = false;
          errorReasons.push('Missing timestamp');
        } else {
          timestamp = new Date(rawTimestamp);
          if (isNaN(timestamp.getTime())) {
            isValid = false;
            errorReasons.push('Invalid timestamp format');
          }
        }

        let quantity: number | undefined;
        if (rawQuantity === undefined || rawQuantity === null || rawQuantity === '') {
          isValid = false;
          errorReasons.push('Missing quantity');
        } else {
          quantity = parseFloat(rawQuantity);
          if (isNaN(quantity)) {
            isValid = false;
            errorReasons.push('Quantity is not a valid number');
          }
        }

        if (!type) {
          isValid = false;
          errorReasons.push('Missing type');
        }

        if (!asset) {
          isValid = false;
          errorReasons.push('Missing asset');
        }

        transactions.push({
          batchId,
          source,
          originalRow: row,
          isValid,
          errorReasons,
          transactionId,
          timestamp: isValid ? timestamp : undefined,
          quantity: isValid ? quantity : undefined,
          type: isValid ? type.trim() : undefined,
          asset: isValid ? normalizeAsset(asset) : undefined
        });
      })
      .on('end', async () => {
        try {
          if (transactions.length > 0) {
            await Transaction.insertMany(transactions);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => reject(error));
  });
};
