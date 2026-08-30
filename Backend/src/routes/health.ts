import { Router, Request, Response } from 'express';
import { config } from '../config';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: 'Artisera API',
    version: '1.0.0',
    environment: config.ENVIRONMENT,
    timestamp: new Date().toISOString()
  });
});

export default router;
