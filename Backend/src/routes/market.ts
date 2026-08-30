import { Router, Response, NextFunction } from 'express';
import { requireAuth, getOptionalUser, AuthenticatedRequest } from '../middleware/auth';
import * as db from '../services/db';
import { getOpportunitiesForArtisan } from '../services/market';
import { ForbiddenError, NotFoundError } from '../types/errors';

const router = Router();

const success = (data: any) => ({ success: true, data });

// ─── Public Marketplace (GET /market/products) ────────────────────────────────
router.get('/products', getOptionalUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string;
    const search = req.query.search as string;
    const state = req.query.state as string;
    const craft_type = req.query.craft_type as string;
    const min_price = req.query.min_price ? parseFloat(req.query.min_price as string) : undefined;
    const max_price = req.query.max_price ? parseFloat(req.query.max_price as string) : undefined;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const offset = (page - 1) * limit;

    const filters: Record<string, any> = {};
    if (category) filters.category = category;
    if (search) filters.search = search;
    if (state) filters.state = state;
    if (craft_type) filters.craft_type = craft_type;
    if (min_price !== undefined) filters.min_price = min_price;
    if (max_price !== undefined) filters.max_price = max_price;

    const { items, total } = await db.getPublishedProducts(filters, limit, offset);

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

// ─── GET /market/opportunities/me ─────────────────────────────────────────────
router.get('/opportunities/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const limit = parseInt(req.query.limit as string || '5', 10);

    const nameHint = user.raw?.user_metadata?.name || user.email?.split('@')[0] || 'Artisan';
    const artisan = await db.getOrCreateArtisan(user.user_id, nameHint);

    const { items: products } = await db.getProductsByArtisan(artisan.id, 50, 0);

    const opportunities = await getOpportunitiesForArtisan(
      artisan.id,
      artisan.craft_type,
      products,
      limit
    );

    res.status(200).json(success({
      artisan_id: artisan.id,
      artisan_name: artisan.name,
      craft_type: artisan.craft_type,
      opportunities,
      total: opportunities.length,
      note: 'MVP: Market opportunities are based on curated demand data. is_demo=true items are illustrative and not live market signals.',
    }));
  } catch (error) {
    next(error);
  }
});

// ─── GET /market/opportunities/:artisan_id ────────────────────────────────────
router.get('/opportunities/:artisan_id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const limit = parseInt(req.query.limit as string || '5', 10);
    const artisanId = req.params.artisan_id;

    const artisan = await db.getArtisanById(artisanId);

    // Ownership check: artisan can only check their own opportunities
    if (user.role === 'artisan' && artisan.user_id !== user.user_id) {
      throw new ForbiddenError('You can only view your own market opportunities');
    }

    const { items: products } = await db.getProductsByArtisan(artisanId, 50, 0);

    const opportunities = await getOpportunitiesForArtisan(
      artisanId,
      artisan.craft_type,
      products,
      limit
    );

    res.status(200).json(success({
      artisan_id: artisanId,
      artisan_name: artisan.name,
      craft_type: artisan.craft_type,
      opportunities,
      total: opportunities.length,
      note: 'MVP: Market opportunities are based on curated demand data. is_demo=true items are illustrative and not live market signals.',
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
