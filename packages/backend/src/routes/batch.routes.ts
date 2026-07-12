import { Router } from 'express';
import { sendSuccess } from '@/utils/response';
import { createLogger } from '@/utils/logger';

const router = Router();
const logger = createLogger('routes:batch');

router.post('/upload', async (req, res) => {
  try {
    logger.info('Batch upload initiated');
    return sendSuccess(res, { batchId: 'batch-001', status: 'queued' });
  } catch (error) {
    res.status(500).json({ error: 'Batch upload failed' });
  }
});

export default router;
