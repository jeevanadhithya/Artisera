import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import * as db from '../services/db';
import { BadRequestError } from '../types/errors';

const router = Router();
const success = (data: any) => ({ success: true, data });

// GET /api/profile/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    let profile: any = null;

    if (user.role === 'artisan') {
      const nameHint = user.raw?.user_metadata?.name || user.email?.split('@')[0] || 'Artisan';
      profile = await db.getOrCreateArtisan(user.user_id, nameHint);
    } else if (user.role === 'buyer') {
      const nameHint = user.raw?.user_metadata?.name || user.email?.split('@')[0] || 'Buyer';
      profile = await db.getOrCreateBuyer(user.user_id, nameHint);
    } else if (user.role === 'admin') {
      profile = {
        user_id: user.user_id,
        name: 'System Administrator',
        role: 'admin',
        profile_status: 'verified',
      };
    }

    res.status(200).json(success({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      profile_status: profile?.profile_status || 'incomplete',
      profile: profile,
    }));
  } catch (error) {
    next(error);
  }
});

// PUT /api/profile/me
router.put('/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const updateData = req.body;
    let updated: any = null;

    if (user.role === 'artisan') {
      const nameHint = user.raw?.user_metadata?.name || user.email?.split('@')[0] || 'Artisan';
      const profile = await db.getOrCreateArtisan(user.user_id, nameHint);

      // Check validation
      const name = (updateData.name || profile.name || '').trim();
      const phone = (updateData.phone || profile.phone || '').trim();
      const state = (updateData.state || profile.state || '').trim();
      const district = (updateData.district || profile.district || '').trim();
      const craft_type = (updateData.craft_type || profile.craft_type || '').trim();

      const isComplete = name && phone && state && district && craft_type;
      
      const payload = {
        ...updateData,
        profile_status: isComplete ? 'verified' : 'incomplete'
      };

      updated = await db.updateArtisan(profile.id, payload);
    } else if (user.role === 'buyer') {
      const nameHint = user.raw?.user_metadata?.name || user.email?.split('@')[0] || 'Buyer';
      const profile = await db.getOrCreateBuyer(user.user_id, nameHint);

      // Check validation
      const name = (updateData.name || profile.name || '').trim();
      const phone = (updateData.phone || profile.phone || '').trim();
      const location = (updateData.location || profile.location || '').trim();
      const organization_name = (updateData.organization_name || profile.organization_name || '').trim();
      const business_category = (updateData.business_category || profile.business_category || '').trim();

      const isComplete = name && phone && location && organization_name && business_category;

      const payload = {
        ...updateData,
        profile_status: isComplete ? 'verified' : 'incomplete'
      };

      updated = await db.updateBuyer(profile.id, payload);
    } else {
      throw new BadRequestError('Administrators cannot edit profiles through this endpoint');
    }

    res.status(200).json(success({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      profile_status: updated?.profile_status || 'incomplete',
      profile: updated,
    }));
  } catch (error) {
    next(error);
  }
});

// POST /api/profile/verify (Fallback mock endpoint to force verify)
router.post('/verify', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    let updated: any = null;

    if (user.role === 'artisan') {
      const profile = await db.getOrCreateArtisan(user.user_id);
      updated = await db.updateArtisan(profile.id, { profile_status: 'verified' });
    } else if (user.role === 'buyer') {
      const profile = await db.getOrCreateBuyer(user.user_id);
      updated = await db.updateBuyer(profile.id, { profile_status: 'verified' });
    } else {
      throw new BadRequestError('Only artisans and buyers can trigger verification');
    }

    res.status(200).json(success({
      user_id: user.user_id,
      role: user.role,
      profile_status: 'verified',
      profile: updated,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
