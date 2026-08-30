import { Request, Response } from 'express';
import app from '../Backend/src/app';

export default function handler(req: Request, res: Response) {
  try {
    if (req.url && !req.url.startsWith('/api')) {
      req.url = `/api${req.url}`;
    }
    return app(req, res);
  } catch (err: any) {
    console.error('Vercel API Serverless Error:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err?.message || 'Serverless function execution error'
      }
    });
  }
}
