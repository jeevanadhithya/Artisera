import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { AppError } from './types/errors';
import { getSupabase } from './services/supabase';

// Import Route Handlers
import healthRouter from './routes/health';
import artisansRouter from './routes/artisans';
import productsRouter from './routes/products';
import marketRouter from './routes/market';
import buyersRouter from './routes/buyers';
import matchingRouter from './routes/matching';
import wishlistRouter from './routes/wishlist';
import adminRouter from './routes/admin';
import profileRouter from './routes/profile';

const app = express();

// ─── CORS Middleware ─────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey']
}));

// ─── Body Parsers ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Logging Middleware ──────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = (performance.now() - start).toFixed(1);
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// ─── Root Redirect with Live Diagnostics HTML ───────────────────────────────
app.get('/', async (req: Request, res: Response) => {
  let dbStatus = 'ok';
  let dbMessage = 'CONNECTED';
  
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('products').select('id').limit(1);
    if (error) {
      dbStatus = 'error';
      dbMessage = `DATABASE ERROR: ${error.message}`;
    }
  } catch (err: any) {
    dbStatus = 'error';
    dbMessage = err.message || 'MISSING CONFIG KEYS';
  }

  const geminiStatus = config.GEMINI_API_KEY ? 'ok' : 'warn';
  const geminiMessage = config.GEMINI_API_KEY ? 'CONFIGURED' : 'API KEY MISSING';

  const sarvamStatus = config.SARVAM_API_KEY ? 'ok' : 'warn';
  const sarvamMessage = config.SARVAM_API_KEY ? 'CONFIGURED' : 'API KEY MISSING';

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Artisera API Diagnostics</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f3f4f6; margin: 0; padding: 2rem 1rem; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
      .card { background: #111827; border: 1px solid #1f2937; border-radius: 20px; padding: 2.2rem; max-width: 520px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6); }
      h1 { font-size: 1.6rem; margin: 0 0 0.5rem; color: #10b981; display: flex; align-items: center; gap: 0.6rem; font-weight: 800; letter-spacing: -0.025em; }
      p { color: #9ca3af; font-size: 0.9rem; margin: 0 0 1.8rem; line-height: 1.5; }
      .service { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px solid #1f2937; }
      .service:last-of-type { border-bottom: none; }
      .name { font-size: 0.95rem; font-weight: 600; color: #e5e7eb; }
      .badge { padding: 0.3rem 0.85rem; border-radius: 9999px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
      .badge.ok { background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
      .badge.error { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }
      .badge.warn { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
      .meta { font-size: 0.75rem; color: #6b7280; text-align: center; margin-top: 2rem; border-top: 1px solid #1f2937; pt-4; padding-top: 1rem; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Artisera API Diagnostics</h1>
      <p>Real-time configuration checks and database connection status for the hosted Express serverless backend.</p>
      
      <div class="service">
        <span class="name">Express Server</span>
        <span class="badge ok">Online</span>
      </div>
      <div class="service">
        <span class="name">Supabase Connection</span>
        <span class="badge ${dbStatus}">${dbMessage}</span>
      </div>
      <div class="service">
        <span class="name">Gemini AI Client (Model: ${config.GEMINI_MODEL})</span>
        <span class="badge ${geminiStatus}">${geminiMessage}</span>
      </div>
      <div class="service">
        <span class="name">Sarvam Translation & Speech</span>
        <span class="badge ${sarvamStatus}">${sarvamMessage}</span>
      </div>

      <div class="meta">
        Environment: <strong>${config.ENVIRONMENT}</strong> | Version: <strong>1.0.0</strong><br/>
        Diagnostics Timestamp: ${new Date().toISOString()}
      </div>
    </div>
  </body>
  </html>
  `;
  res.status(200).send(html);
});

// ─── Root Health Check ───────────────────────────────────────────────────────
app.use('/', healthRouter);

// ─── API Routes ──────────────────────────────────────────────────────────────
const API_PREFIX = '/api';

app.use(`${API_PREFIX}`, healthRouter);
app.use(`${API_PREFIX}/artisans`, artisansRouter);
app.use(`${API_PREFIX}/products`, productsRouter);
app.use(`${API_PREFIX}/market`, marketRouter);
app.use(`${API_PREFIX}/buyers`, buyersRouter);
app.use(`${API_PREFIX}/matching`, matchingRouter);
app.use(`${API_PREFIX}/wishlist`, wishlistRouter);
app.use(`${API_PREFIX}/admin`, adminRouter);
app.use(`${API_PREFIX}/profile`, profileRouter);

// Fallbacks for direct route matching
app.use('/health', healthRouter);
app.use('/artisans', artisansRouter);
app.use('/products', productsRouter);
app.use('/market', marketRouter);
app.use('/buyers', buyersRouter);
app.use('/matching', matchingRouter);
app.use('/wishlist', wishlistRouter);
app.use('/admin', adminRouter);
app.use('/profile', profileRouter);

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // If it's a known application error, send standard payload
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

  // Handle generic / unexpected error
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  });
});

export default app;
