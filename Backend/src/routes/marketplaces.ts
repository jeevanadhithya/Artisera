import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { marketplaceMetadata, Marketplace } from '../services/marketplaceExport';
import * as db from '../services/db';

const router = Router();
const known = new Set<Marketplace>(['amazon', 'flipkart', 'gem', 'ondc', 'meesho', 'generic']);

router.get('/', requireAuth, (_req, res) => res.json({ success: true, data: marketplaceMetadata() }));
router.get('/:marketplace/templates', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!known.has(req.params.marketplace as Marketplace)) return res.status(400).json({ success: false, error: { code: 'INVALID_MARKETPLACE', message: 'Unsupported marketplace.' } });
    const templates = await db.query('SELECT id, marketplace, template_name, category, version, source_url, headers, field_mappings, validation_rules, active, created_at, updated_at FROM public.marketplace_templates WHERE marketplace = $1 AND active = true ORDER BY created_at DESC', [req.params.marketplace]);
    res.json({ success: true, data: templates });
  } catch (error) { next(error); }
});
router.get('/:marketplace/categories', requireAuth, (_req, res) => res.json({ success: true, data: [], note: 'Category IDs are only shown after an official marketplace template or category mapping has been configured.' }));

export default router;
