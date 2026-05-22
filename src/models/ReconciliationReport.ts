import mongoose, { Document, Schema } from 'mongoose';

export interface IReconciliationReport extends Document {
  batchId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  summaryStats: {
    totalUser: number;
    totalExchange: number;
    matched: number;
    conflicting: number;
    unmatchedUser: number;
    unmatchedExchange: number;
  };
  results: any[];
}

const ReconciliationReportSchema: Schema = new Schema({
  batchId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
  summaryStats: {
    totalUser: { type: Number, default: 0 },
    totalExchange: { type: Number, default: 0 },
    matched: { type: Number, default: 0 },
    conflicting: { type: Number, default: 0 },
    unmatchedUser: { type: Number, default: 0 },
    unmatchedExchange: { type: Number, default: 0 },
  },
  results: { type: [Schema.Types.Mixed], default: [] }
}, { timestamps: true });

export const ReconciliationReport = mongoose.model<IReconciliationReport>('ReconciliationReport', ReconciliationReportSchema);
