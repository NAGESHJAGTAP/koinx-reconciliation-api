import { Request, Response } from 'express';
import { parseCSVAndStore } from '../services/ingestion.service';
import { reconcileBatch, MatchingOptions } from '../services/matching.service';
import { ReconciliationReport } from '../models/ReconciliationReport';
import { v4 as uuidv4 } from 'uuid';
import { format } from '@fast-csv/format';

export const uploadAndReconcile = async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || !files.user_transactions || !files.exchange_transactions) {
      return res.status(400).json({ error: 'Both user_transactions and exchange_transactions files are required' });
    }

    const userFile = files.user_transactions[0];
    const exchangeFile = files.exchange_transactions[0];
    
    const batchId = uuidv4();

    // Ingestion
    await parseCSVAndStore(userFile.path, batchId, 'USER');
    await parseCSVAndStore(exchangeFile.path, batchId, 'EXCHANGE');

    // Extract options from body
    const options: MatchingOptions = {};
    if (req.body.timestampToleranceSeconds) {
      options.timestampToleranceSeconds = parseInt(req.body.timestampToleranceSeconds);
    }
    if (req.body.quantityTolerancePct) {
      options.quantityTolerancePct = parseFloat(req.body.quantityTolerancePct);
    }

    // Matching
    const report = await reconcileBatch(batchId, options);

    res.status(200).json({
      message: 'Reconciliation completed',
      batchId: report.batchId,
      summary: report.summaryStats,
      downloadUrl: `/api/reports/${report.batchId}/download`
    });

  } catch (error: any) {
    res.status(500).json({ error: 'An error occurred during reconciliation', details: error.message });
  }
};

export const downloadReport = async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const report = await ReconciliationReport.findOne({ batchId }).lean();
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reconciliation_report_${batchId}.csv`);

    const csvStream = format({ headers: true });
    csvStream.pipe(res);

    for (const result of report.results) {
      const flattenedRow: any = {
        Category: result.category,
        Reason: result.reason,
      };

      // Add user row fields
      if (result.user_row) {
        for (const [key, value] of Object.entries(result.user_row)) {
          flattenedRow[`User_${key}`] = value;
        }
      }

      // Add exchange row fields
      if (result.exchange_row) {
        for (const [key, value] of Object.entries(result.exchange_row)) {
          flattenedRow[`Exchange_${key}`] = value;
        }
      }

      csvStream.write(flattenedRow);
    }

    csvStream.end();
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate CSV report', details: error.message });
  }
};
