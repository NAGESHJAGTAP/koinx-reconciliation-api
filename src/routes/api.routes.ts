import { Router } from 'express';
import multer from 'multer';
import { uploadAndReconcile, downloadReport } from '../controllers/reconciliation.controller';
import fs from 'fs';

const router = Router();

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

router.post('/reconcile', upload.fields([
  { name: 'user_transactions', maxCount: 1 },
  { name: 'exchange_transactions', maxCount: 1 }
]), uploadAndReconcile);

router.get('/reports/:batchId/download', downloadReport);

export default router;
