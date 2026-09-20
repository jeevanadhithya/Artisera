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
import imagesRouter from './routes/images';
import inquiriesRouter from './routes/inquiries';
import aiJobsRouter from './routes/ai_jobs';
import speechRouter from './routes/speech';
import pricingRouter from './routes/pricing';
import mlRouter from './routes/ml';
import { aiRouter } from './routes/ai';
import copilotRouter from './routes/copilot';
import marketplacesRouter from './routes/marketplaces';

const app = express();

// ─── CORS Middleware ─────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey']
}));

// ─── Body Parsers ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Logging Middleware ──────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = (performance.now() - start).toFixed(1);
    console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// ─── Root Redirect with Live Diagnostics HTML & Interactive Links ───────────
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
  <html lang="en">
  <head>
    <title>Artisera Cloud & ML Services Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Symbols+Rounded" rel="stylesheet">
    <style>
      :root {
        --md-sys-color-background: #F7F3EA; /* Warm Ivory */
        --md-sys-color-surface: #FFFDF8; /* Soft White */
        --md-sys-color-primary: #C4512D; /* Artisan Terracotta */
        --md-sys-color-primary-dark: #9F3D22; /* Deep Terracotta */
        --md-sys-color-on-surface: #30251F; /* Artisan Brown */
        --md-sys-color-on-surface-variant: #75665D; /* Warm Brown */
        --md-sys-color-outline: #E5D8C8; /* Soft Beige */
        --md-sys-color-success: #2E7D32; /* Forest Green */
        --md-sys-color-error: #A63D2F; /* Deep Brick */
        --md-sys-color-blue: #1A237E; /* Indigo Blue */
        --md-sys-color-purple: #6A1B9A; /* Rich Purple */
      }
      
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Outfit', sans-serif;
        background-color: var(--md-sys-color-background);
        color: var(--md-sys-color-on-surface);
        line-height: 1.5;
        padding: 2.5rem 1.5rem;
      }
      header {
        text-align: center;
        margin-bottom: 2.5rem;
      }
      header h1 {
        color: var(--md-sys-color-primary-dark);
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }
      header p {
        color: var(--md-sys-color-on-surface-variant);
        font-size: 1.1rem;
      }
      
      .dashboard-container {
        max-width: 1200px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
        gap: 1.5rem;
      }
      
      .service-card {
        background-color: var(--md-sys-color-surface);
        border: 1px solid var(--md-sys-color-outline);
        border-radius: 22px;
        padding: 1.5rem;
        box-shadow: 0 4px 20px rgba(48, 37, 31, 0.05);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        display: flex;
        flex-direction: column;
      }
      .service-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(48, 37, 31, 0.08);
      }
      
      .card-header {
        display: flex;
        align-items: center;
        margin-bottom: 1.25rem;
        gap: 1rem;
      }
      .card-icon {
        background-color: rgba(196, 81, 45, 0.1);
        color: var(--md-sys-color-primary);
        width: 52px;
        height: 52px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .card-icon.blue { background-color: rgba(26, 35, 126, 0.1); color: var(--md-sys-color-blue); }
      .card-icon.purple { background-color: rgba(106, 27, 154, 0.1); color: var(--md-sys-color-purple); }
      .card-icon.green { background-color: rgba(46, 125, 50, 0.1); color: var(--md-sys-color-success); }
      
      .card-icon .material-symbols-rounded {
        font-size: 28px;
      }
      .card-title-group {
        flex: 1;
      }
      .card-title {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--md-sys-color-on-surface);
        line-height: 1.2;
      }
      .card-subtitle {
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface-variant);
        margin-top: 0.25rem;
      }
      .status-badge {
        padding: 0.35rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }
      .status-badge.ok {
        background-color: #E8F5E9;
        color: var(--md-sys-color-success);
        border: 1px solid #C8E6C9;
      }
      .status-badge.active {
        background-color: #EDE7F6;
        color: var(--md-sys-color-purple);
        border: 1px solid #D1C4E9;
      }
      .status-badge.standby {
        background-color: #FFF3E0;
        color: #E65100;
        border: 1px solid #FFE0B2;
      }
      .status-badge.error {
        background-color: rgba(166, 61, 47, 0.15);
        color: var(--md-sys-color-error);
      }
      
      .endpoints-list {
        margin-top: 1rem;
        border-top: 1px dashed var(--md-sys-color-outline);
        padding-top: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        flex: 1;
      }
      
      .endpoint-link {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0.75rem;
        border-radius: 12px;
        text-decoration: none;
        color: inherit;
        background-color: rgba(48, 37, 31, 0.02);
        border: 1px solid transparent;
        transition: all 0.15s ease;
      }
      .endpoint-link:hover {
        background-color: #FFFDF8;
        border-color: var(--md-sys-color-outline);
        transform: translateX(4px);
        box-shadow: 0 2px 8px rgba(48, 37, 31, 0.04);
      }
      
      .endpoint-name {
        color: var(--md-sys-color-on-surface);
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-weight: 600;
        font-size: 0.9rem;
      }
      .endpoint-name .material-symbols-rounded {
        font-size: 18px;
        color: var(--md-sys-color-primary);
      }
      .endpoint-path {
        background-color: rgba(48, 37, 31, 0.06);
        padding: 0.25rem 0.55rem;
        border-radius: 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        color: var(--md-sys-color-primary-dark);
        font-size: 0.8rem;
        font-weight: 600;
      }
      
      .global-status {
        max-width: 1200px;
        margin: 0 auto 2rem;
        display: flex;
        justify-content: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1.25rem;
        border-radius: 24px;
        background-color: var(--md-sys-color-surface);
        border: 1px solid var(--md-sys-color-outline);
        font-size: 0.88rem;
        font-weight: 600;
        color: var(--md-sys-color-on-surface);
        box-shadow: 0 2px 8px rgba(48, 37, 31, 0.03);
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--md-sys-color-success);
      }
      
      @media (max-width: 768px) {
        .dashboard-container { grid-template-columns: 1fr; }
        header h1 { font-size: 2rem; }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Artisera Backend Services</h1>
      <p>Cloud API Registry & Hosted ML Microservices Dashboard</p>
    </header>
    
    <div class="global-status">
      <div class="chip">
        <span class="material-symbols-rounded" style="color: var(--md-sys-color-success); font-size: 20px;">database</span>
        Supabase: ${dbStatus.toUpperCase()}
      </div>
      <div class="chip">
        <span class="material-symbols-rounded" style="color: var(--md-sys-color-primary); font-size: 20px;">memory</span>
        Gemini: ${geminiMessage}
      </div>
      <div class="chip">
        <span class="material-symbols-rounded" style="color: var(--md-sys-color-purple); font-size: 20px;">record_voice_over</span>
        Sarvam: ${sarvamMessage}
      </div>
      <div class="chip">
        <span class="material-symbols-rounded" style="color: var(--md-sys-color-blue); font-size: 20px;">cloud</span>
        Env: ${config.ENVIRONMENT || 'production'}
      </div>
    </div>
    
    <div class="dashboard-container">
      
      <!-- Card 1: Core Node.js API Gateway -->
      <div class="service-card">
        <div class="card-header">
          <div class="card-icon"><span class="material-symbols-rounded">api</span></div>
          <div class="card-title-group">
            <div class="card-title">Core API Gateway</div>
            <div class="card-subtitle">Express.js Serverless Backend</div>
          </div>
          <div class="status-badge ok"><span class="dot"></span> Online</div>
        </div>
        <div class="endpoints-list">
          <a href="/api/health" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">monitor_heart</span> Health Check</div>
            <div class="endpoint-path">/api/health</div>
          </a>
          <a href="/api/products" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">inventory_2</span> Product Catalog</div>
            <div class="endpoint-path">/api/products</div>
          </a>
          <a href="/api/market" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">storefront</span> Market Linkage</div>
            <div class="endpoint-path">/api/market</div>
          </a>
          <a href="/api/artisans" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">group</span> Artisan Profiles</div>
            <div class="endpoint-path">/api/artisans</div>
          </a>
          <a href="/api/buyers" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">shopping_bag</span> B2B Buyers</div>
            <div class="endpoint-path">/api/buyers</div>
          </a>
          <a href="/api/admin/metrics" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">admin_panel_settings</span> Platform Metrics</div>
            <div class="endpoint-path">/api/admin/metrics</div>
          </a>
        </div>
      </div>
      
      <!-- Card 2: AI Engine & Regional Voice -->
      <div class="service-card">
        <div class="card-header">
          <div class="card-icon blue"><span class="material-symbols-rounded">psychology</span></div>
          <div class="card-title-group">
            <div class="card-title">AI Engine Services</div>
            <div class="card-subtitle">Gemini 2.5 Flash + Sarvam AI</div>
          </div>
          <div class="status-badge ok"><span class="dot"></span> Online</div>
        </div>
        <div class="endpoints-list">
          <a href="/api/matching" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">handshake</span> AI Matchmaking</div>
            <div class="endpoint-path">/api/matching</div>
          </a>
          <a href="/api/speech/languages" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">translate</span> 7 Indian Languages</div>
            <div class="endpoint-path">/api/speech/languages</div>
          </a>
          <a href="/api/ai/jobs" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">work_history</span> Async AI Queue</div>
            <div class="endpoint-path">/api/ai/jobs</div>
          </a>
          <a href="/api/wishlist" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">favorite</span> B2B Wishlists</div>
            <div class="endpoint-path">/api/wishlist</div>
          </a>
          <a href="/api/inquiries" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">contact_mail</span> Direct Inquiries</div>
            <div class="endpoint-path">/api/inquiries</div>
          </a>
        </div>
      </div>

      <!-- Card 3: ML Image Enhancement Pipeline -->
      <div class="service-card">
        <div class="card-header">
          <div class="card-icon green"><span class="material-symbols-rounded">auto_awesome</span></div>
          <div class="card-title-group">
            <div class="card-title">ML Image Enhancement</div>
            <div class="card-subtitle">U²-Net + CLAHE Canvas Studio</div>
          </div>
          <div class="status-badge ok"><span class="dot"></span> Online</div>
        </div>
        <div class="endpoints-list">
          <a href="/api/ml/health" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">settings_heart</span> ML Pipeline Health</div>
            <div class="endpoint-path">/api/ml/health</div>
          </a>
          <a href="/api/ml/enhance" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">magic_button</span> Enhance Photo Endpoint</div>
            <div class="endpoint-path">/api/ml/enhance</div>
          </a>
          <a href="/api/images" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">photo_library</span> Image Studio Gateway</div>
            <div class="endpoint-path">/api/images</div>
          </a>
          <a href="/api/profile" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">account_circle</span> Artisan Bio & Media</div>
            <div class="endpoint-path">/api/profile</div>
          </a>
        </div>
      </div>

      <!-- Card 4: ML Fair-Trade Pricing Model -->
      <div class="service-card">
        <div class="card-header">
          <div class="card-icon purple"><span class="material-symbols-rounded">calculate</span></div>
          <div class="card-title-group">
            <div class="card-title">ML Fair Pricing Model</div>
            <div class="card-subtitle">Cost-Floor + Market Embeddings</div>
          </div>
          <div class="status-badge active"><span class="dot"></span> Active</div>
        </div>
        <div class="endpoints-list">
          <a href="/api/pricing/health" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">speed</span> Pricing Engine Health</div>
            <div class="endpoint-path">/api/pricing/health</div>
          </a>
          <a href="/api/pricing/recommend" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">price_check</span> Recommend Price API</div>
            <div class="endpoint-path">/api/pricing/recommend</div>
          </a>
          <a href="/api/pricing/benchmarks" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">bar_chart</span> Competitor Benchmarks</div>
            <div class="endpoint-path">/api/pricing/benchmarks</div>
          </a>
        </div>
      </div>

      <!-- Card 5: Unified TypeScript AI Engine (Vercel Serverless) -->
      <div class="service-card">
        <div class="card-header">
          <div class="card-icon" style="background: rgba(196, 81, 45, 0.15); color: #C4512D;"><span class="material-symbols-rounded">neurology</span></div>
          <div class="card-title-group">
            <div class="card-title">Unified AI Engine</div>
            <div class="card-subtitle">Node.js + Vercel Serverless</div>
          </div>
          <div class="status-badge ok"><span class="dot"></span> Online</div>
        </div>
        <div class="endpoints-list">
          <a href="/api/ai/health" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">health_and_safety</span> AI Engine Health</div>
            <div class="endpoint-path">/api/ai/health</div>
          </a>
          <a href="/api/ai/pricing" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">payments</span> Living Wage Pricing Engine</div>
            <div class="endpoint-path">/api/ai/pricing</div>
          </a>
          <a href="/api/ai/image/enhance" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">photo_auto_merge</span> Serverless Image Enhancer</div>
            <div class="endpoint-path">/api/ai/image/enhance</div>
          </a>
          <a href="/api/ai/product-score" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">verified</span> Catalog Readiness Score</div>
            <div class="endpoint-path">/api/ai/product-score</div>
          </a>
          <a href="/api/ai/trends" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">trending_up</span> Handicraft Demand Trends</div>
            <div class="endpoint-path">/api/ai/trends</div>
          </a>
          <a href="/api/ai/opportunities" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">handshake</span> Wholesale Sourcing Leads</div>
            <div class="endpoint-path">/api/ai/opportunities</div>
          </a>
        </div>
      </div>

      <!-- Card 6: AWS Neural Studio Endpoint -->
      <div class="service-card">
        <div class="card-header">
          <div class="card-icon"><span class="material-symbols-rounded">cloud_sync</span></div>
          <div class="card-title-group">
            <div class="card-title">AWS Neural Studio</div>
            <div class="card-subtitle">Cloud AI Diffusion Endpoint</div>
          </div>
          <div class="status-badge standby">Standby</div>
        </div>
        <div class="endpoints-list">
          <a href="/api/ml/health" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">hub</span> AWS Gateway Status</div>
            <div class="endpoint-path">/api/ml/health</div>
          </a>
          <a href="/api/images" class="endpoint-link">
            <div class="endpoint-name"><span class="material-symbols-rounded">brush</span> Neural Lighting Synthesis</div>
            <div class="endpoint-path">/api/images</div>
          </a>
        </div>
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
app.use(`${API_PREFIX}/images`, imagesRouter);
app.use(`${API_PREFIX}/inquiries`, inquiriesRouter);
app.use(`${API_PREFIX}/ai/jobs`, aiJobsRouter);
app.use(`${API_PREFIX}/ai`, aiRouter);
app.use(`${API_PREFIX}/speech`, speechRouter);
app.use(`${API_PREFIX}/pricing`, pricingRouter);
app.use(`${API_PREFIX}/ml`, mlRouter);
app.use(`${API_PREFIX}/copilot`, copilotRouter);
app.use(`${API_PREFIX}/chatbot`, copilotRouter);
app.use(`${API_PREFIX}/marketplaces`, marketplacesRouter);

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
app.use('/images', imagesRouter);
app.use('/inquiries', inquiriesRouter);
app.use('/ai/jobs', aiJobsRouter);
app.use('/ai', aiRouter);
app.use('/speech', speechRouter);
app.use('/pricing', pricingRouter);
app.use('/ml', mlRouter);
app.use('/copilot', copilotRouter);
app.use('/chatbot', copilotRouter);
app.use('/marketplaces', marketplacesRouter);

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    });
  }

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
