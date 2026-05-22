import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  batchId: string;
  source: 'USER' | 'EXCHANGE';
  originalRow: any;
  isValid: boolean;
  errorReasons?: string[];
  
  // Parsed fields
  transactionId?: string;
  timestamp?: Date;
  quantity?: number;
  type?: string;
  asset?: string;
}

const TransactionSchema: Schema = new Schema({
  batchId: { type: String, required: true, index: true },
  source: { type: String, enum: ['USER', 'EXCHANGE'], required: true },
  originalRow: { type: Schema.Types.Mixed, required: true },
  isValid: { type: Boolean, default: true },
  errorReasons: [{ type: String }],
  
  transactionId: { type: String },
  timestamp: { type: Date },
  quantity: { type: Number },
  type: { type: String },
  asset: { type: String }
}, { timestamps: true });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
