import { Router, Response, NextFunction } from 'express';
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import * as db from '../services/db';
import { getDemoDemandData } from '../services/market';
import { getSupabase } from '../services/supabase';

const router = Router();

const success = (data: any) => ({ success: true, data });

// GET /admin/dashboard
router.get('/dashboard', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await db.getPlatformStats();
    res.status(200).json(success(stats));
  } catch (error) {
    next(error);
  }
});

// GET /admin/artisans
router.get('/artisans', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = (page - 1) * limit;

    const artisans = await db.getAllArtisans(limit, offset);
    res.status(200).json(success({
      items: artisans,
      page,
      limit,
    }));
  } catch (error) {
    next(error);
  }
});

// GET /admin/products
router.get('/products', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    const { items, total } = await db.getAllProducts(limit, offset, status);
    res.status(200).json(success({
      items,
      total,
      page,
      limit,
      has_more: (offset + limit) < total,
    }));
  } catch (error) {
    next(error);
  }
});

// GET /admin/buyers (renamed from /admin/buyers in requirements to match buyer_requests list)
router.get('/buyers', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = (page - 1) * limit;

    const { items, total } = await db.getBuyerRequests(null, limit, offset);
    res.status(200).json(success({
      items,
      total,
      page,
      limit,
      has_more: (offset + limit) < total,
    }));
  } catch (error) {
    next(error);
  }
});

// GET /admin/market
router.get('/market', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const signals = getDemoDemandData();
    res.status(200).json(success({
      demand_signals: signals,
      total_signals: signals.length,
      note: 'MVP uses curated demo demand data. Replace with live data feeds for production.',
    }));
  } catch (error) {
    next(error);
  }
});

// GET /admin/opportunities
router.get('/opportunities', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = (page - 1) * limit;

    const supabase = getSupabase();
    let items: any[] = [];
    let total = 0;

    try {
      const { data, count, error } = await supabase.from('market_opportunities')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      items = data || [];
      total = count || 0;
    } catch (e) {
      console.warn('opportunities fetch failed, table might not exist in database:', e);
    }

    res.status(200).json(success({
      items,
      total,
      page,
      limit,
      has_more: (offset + limit) < total,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
