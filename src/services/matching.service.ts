import { Transaction, ITransaction } from '../models/Transaction';
import { ReconciliationReport } from '../models/ReconciliationReport';
import { areTypesEquivalent } from '../utils/constants';

export interface MatchingOptions {
  timestampToleranceSeconds?: number;
  quantityTolerancePct?: number;
}

export const reconcileBatch = async (batchId: string, options: MatchingOptions) => {
  const tsTolerance = options.timestampToleranceSeconds ?? parseInt(process.env.TIMESTAMP_TOLERANCE_SECONDS || '300');
  const qtyTolerance = options.quantityTolerancePct ?? parseFloat(process.env.QUANTITY_TOLERANCE_PCT || '0.01'); // e.g. 0.01 means 1% or 0.01%? The prompt says "0.01% by default", so let's treat it as percentage value (e.g., 0.01 means 0.0001 multiplier). Wait, typically 0.01% is 0.0001. If the config is 0.01, multiplier is config / 100.
  const qtyMultiplier = qtyTolerance / 100.0;

  // Fetch valid transactions
  const userTxns = await Transaction.find({ batchId, source: 'USER', isValid: true }).lean();
  const exchangeTxns = await Transaction.find({ batchId, source: 'EXCHANGE', isValid: true }).lean();

  const report = {
    batchId,
    status: 'COMPLETED' as const,
    summaryStats: {
      totalUser: userTxns.length,
      totalExchange: exchangeTxns.length,
      matched: 0,
      conflicting: 0,
      unmatchedUser: 0,
      unmatchedExchange: 0,
    },
    results: [] as any[]
  };

  const exchangeMatched = new Set<string>();

  for (const ut of userTxns) {
    let bestMatch: any = null;
    let matchType: 'MATCHED' | 'CONFLICTING' | null = null;
    let reason = '';

    // Filter exchange txns that haven't been matched yet and have same asset (if asset exists)
    // Actually, prompt says "Asset: must match". So we only look at same asset.
    const candidates = exchangeTxns.filter(et => !exchangeMatched.has(et._id.toString()) && et.asset === ut.asset);

    // 1. Try to find Exact ID Match first
    if (ut.transactionId) {
      const idMatch = candidates.find(et => et.transactionId === ut.transactionId);
      if (idMatch) {
        // Check if other fields are within tolerance
        const timeDiff = Math.abs((ut.timestamp!.getTime() - idMatch.timestamp!.getTime()) / 1000);
        const qtyDiff = Math.abs(ut.quantity! - idMatch.quantity!);
        const maxQtyTolerance = Math.abs(ut.quantity! * qtyMultiplier);

        if (
          timeDiff <= tsTolerance &&
          qtyDiff <= maxQtyTolerance &&
          areTypesEquivalent(ut.type!, idMatch.type!)
        ) {
          bestMatch = idMatch;
          matchType = 'MATCHED';
          reason = 'Matched by ID and fields within tolerance';
        } else {
          bestMatch = idMatch;
          matchType = 'CONFLICTING';
          reason = 'Matched by ID but fields outside tolerance or type mismatch';
        }
      }
    }

    // 2. Proximity Match (if no ID match found)
    if (!bestMatch) {
      for (const et of candidates) {
        const timeDiff = Math.abs((ut.timestamp!.getTime() - et.timestamp!.getTime()) / 1000);
        const qtyDiff = Math.abs(ut.quantity! - et.quantity!);
        const maxQtyTolerance = Math.abs(ut.quantity! * qtyMultiplier);

        if (
          timeDiff <= tsTolerance &&
          qtyDiff <= maxQtyTolerance &&
          areTypesEquivalent(ut.type!, et.type!)
        ) {
          bestMatch = et;
          matchType = 'MATCHED';
          reason = 'Matched by proximity (time, quantity, type, asset)';
          break; // take first match
        }
      }
    }

    if (bestMatch) {
      exchangeMatched.add(bestMatch._id.toString());
      
      report.results.push({
        category: matchType,
        reason,
        user_row: ut.originalRow,
        exchange_row: bestMatch.originalRow
      });

      if (matchType === 'MATCHED') report.summaryStats.matched++;
      else report.summaryStats.conflicting++;
    } else {
      report.results.push({
        category: 'UNMATCHED_USER',
        reason: 'Present in user file, not found in exchange file',
        user_row: ut.originalRow,
        exchange_row: null
      });
      report.summaryStats.unmatchedUser++;
    }
  }

  // Any remaining in exchange txns
  for (const et of exchangeTxns) {
    if (!exchangeMatched.has(et._id.toString())) {
      report.results.push({
        category: 'UNMATCHED_EXCHANGE',
        reason: 'Present in exchange file, not found in user file',
        user_row: null,
        exchange_row: et.originalRow
      });
      report.summaryStats.unmatchedExchange++;
    }
  }

  // Also include invalid rows as conflicting or unmatched? 
  // Let's add them as a separate category or just append to results to not drop them.
  const invalidUser = await Transaction.find({ batchId, source: 'USER', isValid: false }).lean();
  for (const iu of invalidUser) {
    report.results.push({
      category: 'INVALID_USER_DATA',
      reason: iu.errorReasons?.join(', '),
      user_row: iu.originalRow,
      exchange_row: null
    });
  }

  const invalidExchange = await Transaction.find({ batchId, source: 'EXCHANGE', isValid: false }).lean();
  for (const ie of invalidExchange) {
    report.results.push({
      category: 'INVALID_EXCHANGE_DATA',
      reason: ie.errorReasons?.join(', '),
      user_row: null,
      exchange_row: ie.originalRow
    });
  }

  // Save report
  await ReconciliationReport.create(report);
  
  return report;
};
