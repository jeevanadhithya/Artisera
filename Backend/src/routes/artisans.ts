import { Router, Response, NextFunction } from 'express';
import { requireAuth, requireArtisan, AuthenticatedRequest } from '../middleware/auth';
import * as db from '../services/db';
import { ForbiddenError } from '../types/errors';

const router = Router();

const success = (data: any) => ({ success: true, data });

// GET /artisans/me (current user's profile - auto-create placeholder if not exists)
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const nameHint = user.raw?.user_metadata?.name || user.email?.split('@')[0] || 'Artisan';
    const profile = await db.getOrCreateArtisan(user.user_id, nameHint);
    res.status(200).json(success(profile));
  } catch (error) {
    next(error);
  }
});

// GET /artisans/me/dashboard (current user's dashboard)
router.get('/me/dashboard', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const artisan = await db.getArtisanByUserId(user.user_id);
    if (!artisan) {
      // Create minimal profile to prevent error
      const nameHint = user.raw?.user_metadata?.name || user.email?.split('@')[0] || 'Artisan';
      const profile = await db.getOrCreateArtisan(user.user_id, nameHint);
      const stats = await db.getArtisanDashboardStats(profile.id);
      return res.status(200).json(success({ artisan: profile, stats }));
    }
    const stats = await db.getArtisanDashboardStats(artisan.id);
    res.status(200).json(success({ artisan, stats }));
  } catch (error) {
    next(error);
  }
});

// POST /artisans (create artisan profile)
router.post('/', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const existing = await db.getArtisanByUserId(user.user_id);
    
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ARTISAN_ALREADY_EXISTS',
          message: 'An artisan profile already exists for this account',
        },
      });
    }

    const created = await db.createArtisan(user.user_id, req.body);
    res.status(201).json(success(created));
  } catch (error) {
    next(error);
  }
});

// GET /artisans/:id (get specific artisan profile)
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const artisan = await db.getArtisanById(req.params.id);

    // Artisans can only view their own profile, admins can view all
    if (user.role === 'artisan' && artisan.user_id !== user.user_id) {
      throw new ForbiddenError('You can only view your own artisan profile');
    }

    res.status(200).json(success(artisan));
  } catch (error) {
    next(error);
  }
});

// PUT /artisans/:id (update profile)
router.put('/:id', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const artisan = await db.getArtisanById(req.params.id);

    if (user.role !== 'admin' && artisan.user_id !== user.user_id) {
      throw new ForbiddenError('You can only edit your own artisan profile');
    }

    const updated = await db.updateArtisan(req.params.id, req.body);
    res.status(200).json(success(updated));
  } catch (error) {
    next(error);
  }
});

// GET /artisans/:id/dashboard (dashboard stats by id)
router.get('/:id/dashboard', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const artisan = await db.getArtisanById(req.params.id);

    if (user.role === 'artisan' && artisan.user_id !== user.user_id) {
      throw new ForbiddenError('You can only view your own dashboard');
    }

    const stats = await db.getArtisanDashboardStats(req.params.id);
    res.status(200).json(success({ artisan, stats }));
  } catch (error) {
    next(error);
  }
});

export default router;
