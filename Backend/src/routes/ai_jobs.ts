import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import * as db from '../services/db';
import { NotFoundError } from '../types/errors';

const router = Router();
const success = (data: any) => ({ success: true, data });

// ─── Get AI Job Status (GET /api/ai/jobs/:id) ──────────────────────────────────
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const job = await db.getAiJobById(req.params.id);
    if (!job) {
      throw new NotFoundError('AI Job', req.params.id);
    }

    res.status(200).json(success({
      job_id: job.id,
      job_type: job.job_type,
      status: job.status,
      progress_pct: job.progress_pct,
      result_data: typeof job.result_data === 'string' ? JSON.parse(job.result_data) : job.result_data,
      error_message: job.error_message,
      created_at: job.created_at,
      updated_at: job.updated_at,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
