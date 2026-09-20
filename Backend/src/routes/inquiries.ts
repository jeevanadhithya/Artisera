import { Router, Response, NextFunction } from 'express';
import { requireAuth, requireArtisan, AuthenticatedRequest } from '../middleware/auth';
import * as db from '../services/db';
import { BadRequestError, NotFoundError } from '../types/errors';

const router = Router();
const success = (data: any) => ({ success: true, data });

// ─── Create Inquiry (POST /api/inquiries) ─────────────────────────────────────
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { product_id, quantity, target_budget_per_unit, message } = req.body;

    if (!product_id) {
      throw new BadRequestError('product_id is required', 'MISSING_PRODUCT_ID');
    }
    if (!message || message.trim().length === 0) {
      throw new BadRequestError('Inquiry message is required', 'MISSING_MESSAGE');
    }

    const product = await db.getProductById(product_id);
    if (!product) {
      throw new NotFoundError('Product', product_id);
    }

    const created = await db.createInquiry({
      product_id,
      artisan_id: product.artisan_id,
      buyer_id: user.user_id,
      quantity: parseInt(quantity?.toString() || '1', 10),
      target_budget_per_unit: target_budget_per_unit ? parseFloat(target_budget_per_unit.toString()) : null,
      message: message.trim(),
    });

    res.status(201).json(success({
      inquiry: created,
      message: 'Inquiry submitted successfully to artisan.'
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Artisan List Inquiries (GET /api/inquiries/artisan/me) ───────────────────
router.get('/artisan/me', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const artisan = await db.getArtisanByUserId(user.user_id);
    if (!artisan) {
      return res.status(200).json(success({ items: [], total: 0 }));
    }

    const inquiries = await db.getInquiriesByArtisan(artisan.id);
    res.status(200).json(success({
      items: inquiries,
      total: inquiries.length,
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Buyer List Inquiries (GET /api/inquiries/buyer/me) ───────────────────────
router.get('/buyer/me', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const inquiries = await db.getInquiriesByBuyer(user.user_id);
    res.status(200).json(success({
      items: inquiries,
      total: inquiries.length,
    }));
  } catch (error) {
    next(error);
  }
});

// ─── Artisan Submit Proposal (POST /api/inquiries/:id/proposal) ───────────────
router.post('/:id/proposal', requireAuth, requireArtisan, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const inquiry = await db.getInquiryById(req.params.id);
    if (!inquiry) {
      throw new NotFoundError('Inquiry', req.params.id);
    }

    const artisan = await db.getArtisanByUserId(user.user_id);
    if (!artisan || artisan.id !== inquiry.artisan_id) {
      throw new BadRequestError('You do not own this inquiry', 'OWNERSHIP_ERROR');
    }

    const { quoted_price_per_unit, lead_time_days, terms_and_notes } = req.body;
    const pricePerUnit = parseFloat(quoted_price_per_unit?.toString() || '0');
    const totalAmount = pricePerUnit * (inquiry.quantity || 1);

    const proposal = await db.createProposal({
      inquiry_id: inquiry.id,
      artisan_id: artisan.id,
      buyer_id: inquiry.buyer_id,
      product_id: inquiry.product_id,
      quoted_price_per_unit: pricePerUnit,
      total_amount: totalAmount,
      lead_time_days: parseInt(lead_time_days?.toString() || '14', 10),
      terms_and_notes: terms_and_notes || '',
      ai_generated: req.body.ai_generated !== false,
      artisan_edited: true,
      status: 'sent',
    });

    res.status(201).json(success({
      proposal,
      message: 'Quotation proposal sent to buyer.'
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
