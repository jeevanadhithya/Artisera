import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { CopilotService } from '../services/copilot/copilotService';
import { RAGEngine } from '../services/copilot/ragEngine';
import { VERIFIED_KNOWLEDGE_BASE } from '../services/copilot/knowledgeBase';
import * as speechService from '../services/speech';
import * as imageService from '../services/image';
import { BadRequestError, OwnershipError } from '../types/errors';
import { getPool } from '../services/db';
import { AuthenticatedRequest, getOptionalUser, requireAuth } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/copilot/chat
 * Primary conversation endpoint supporting multilingual queries, product context, and interactive task guides.
 */
router.post('/chat', getOptionalUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { query, conversationHistory, productId, languageHint, context, activeFlow } = req.body;

    if (!query || typeof query !== 'string') {
      throw new BadRequestError('Query is required.');
    }

    const userId = req.user?.user_id;
    const userRole = req.user?.role;

    const response = await CopilotService.processMessage({
      query,
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : [],
      productId,
      languageHint: languageHint || 'en',
      userId,
      userRole,
      activeFlow,
      context,
    });

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/copilot/session/:flowType
 * Retrieves the artisan's active session for a specific flow.
 */
router.get('/session/:flowType', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { flowType } = req.params;
    const userId = req.user!.user_id;
    const pool = getPool();

    const result = await pool.query(
      `SELECT * FROM public.guide_task_sessions 
       WHERE user_id = $1 AND flow_type = $2 
       ORDER BY updated_at DESC LIMIT 1`,
      [userId, flowType]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/copilot/step/complete
 * Records completion of a specific task step in analytics and advances the user's session.
 */
router.post('/step/complete', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { flowType, stepNumber, stepName, timeSpentSeconds, sessionId } = req.body;
    const userId = req.user!.user_id;
    const pool = getPool();

    if (!flowType || stepNumber === undefined) {
      throw new BadRequestError('flowType and stepNumber are required.');
    }

    // 1. Record in guide_step_analytics
    await pool.query(
      `INSERT INTO public.guide_step_analytics 
       (session_id, user_id, flow_type, step_number, step_name, time_spent_seconds, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [sessionId || null, userId, flowType, stepNumber, stepName || `Step ${stepNumber}`, timeSpentSeconds || 0]
    );

    // 2. Advance step in guide_task_sessions
    await pool.query(
      `UPDATE public.guide_task_sessions 
       SET current_step = GREATEST(current_step, $1), updated_at = NOW() 
       WHERE user_id = $2 AND flow_type = $3 AND status = 'IN_PROGRESS'`,
      [stepNumber + 1, userId, flowType]
    );

    res.status(200).json({
      success: true,
      message: `Step ${stepNumber} marked as completed.`,
      nextStep: stepNumber + 1,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/copilot/language
 * Sets the artisan's preferred guide language (en, hi, ta, te, bn, mr, kn).
 */
router.put('/language', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { language } = req.body;
    const validLanguages = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'kn'];

    if (!language || !validLanguages.includes(language)) {
      throw new BadRequestError(`Invalid language. Supported: ${validLanguages.join(', ')}`);
    }

    const userId = req.user!.user_id;
    const pool = getPool();

    await pool.query(
      `UPDATE public.artisans SET preferred_language = $1, updated_at = NOW() WHERE user_id = $2`,
      [language, userId]
    );

    await pool.query(
      `UPDATE public.profiles SET preferred_language = $1, updated_at = NOW() WHERE id = $2`,
      [language, userId]
    );

    res.status(200).json({
      success: true,
      message: `Preferred language updated to ${language}.`,
      preferred_language: language,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/copilot/transcribe
 * Voice input endpoint for Chatbot. Supports speech in regional Indian languages.
 */
router.post('/transcribe', upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let audioBuffer: Buffer;
    let contentType = 'audio/m4a';
    const languageHint = req.body?.language || req.query?.language?.toString();

    if (req.file) {
      const validated = await imageService.validateAndReadAudio(req.file);
      audioBuffer = validated.content;
      contentType = validated.contentType;
    } else if (req.body?.audio_base64) {
      let b64 = req.body.audio_base64;
      if (b64.includes(',')) {
        b64 = b64.split(',')[1];
      }
      audioBuffer = Buffer.from(b64, 'base64');
      contentType = req.body.mime_type || 'audio/m4a';
    } else {
      throw new BadRequestError('No audio file or audio_base64 provided.');
    }

    const result = await speechService.transcribeAudio(audioBuffer, contentType, languageHint);

    res.status(200).json({
      success: true,
      data: {
        transcript: result.transcript,
        raw_transcript: result.rawTranscript || result.transcript,
        detected_language: result.language || 'Hindi',
        language_code: result.languageCode || 'hi-IN',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/copilot/synthesize
 * Text-to-Speech synthesis for assistant answers.
 */
router.post('/synthesize', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { text, language, speed } = req.body;

    if (!text || typeof text !== 'string') {
      throw new BadRequestError('Text is required for speech synthesis.');
    }

    const result = await speechService.synthesizeSpeech(text, language || 'en-IN', speed || 1.0);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/copilot/knowledge
 * Search and browse verified knowledge base with semantic vector priority.
 */
router.get('/knowledge', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q ? String(req.query.q) : '';
    const platform = req.query.platform ? String(req.query.platform) : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;
    const lang = req.query.lang ? String(req.query.lang) : 'en';

    if (!q) {
      const filtered = VERIFIED_KNOWLEDGE_BASE.filter((doc) => {
        if (platform && doc.platform !== platform) return false;
        if (category && doc.category !== category) return false;
        return true;
      });
      return res.status(200).json({ success: true, data: filtered });
    }

    const result = await RAGEngine.retrieve(q, lang, platform, 5);
    res.status(200).json({
      success: true,
      data: {
        documents: result.documents,
        citations: result.citations,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/copilot/feedback
 * Store user feedback (ratings & text) in guide_feedback and copilot_feedback tables.
 */
router.post('/feedback', getOptionalUser, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { messageId, isHelpful, reportText, rating, feedbackText, language, sessionId } = req.body;
    const userId = req.user?.user_id;
    const pool = getPool();

    // 1. Insert into guide_feedback
    try {
      await pool.query(
        `INSERT INTO public.guide_feedback 
         (session_id, user_id, rating, feedback_text, language, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          sessionId || null,
          userId || null,
          rating ?? (isHelpful ? 5 : 2),
          feedbackText || reportText || null,
          language || 'en',
        ]
      );
    } catch (e: any) {
      console.warn('guide_feedback insert failed:', e.message);
    }

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback! Your input helps keep Artisera knowledge accurate.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/copilot/confirm-action
 * Safely executes a previously proposed product modification ONLY after verifying ownership and artisan confirmation.
 */
router.post('/confirm-action', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { productId, field, value, confirmed } = req.body;

    if (!confirmed) {
      return res.status(200).json({
        success: true,
        actionExecuted: false,
        message: 'Action was cancelled by the artisan.',
      });
    }

    if (!productId || !field) {
      throw new BadRequestError('productId and field are required.');
    }

    // Disallow modifying critical security or internal fields
    const allowedFields = [
      'price',
      'title',
      'name',
      'description',
      'stock_quantity',
      'category',
      'material',
      'craft_type',
      'dimensions',
      'weight',
      'hsn_code',
      'gst_rate',
    ];

    if (!allowedFields.includes(field)) {
      throw new BadRequestError(`Modification of field "${field}" is not permitted through guide actions.`);
    }

    const pool = getPool();
    const userId = req.user!.user_id;
    const userRole = req.user!.role;

    // Verify product exists and check ownership
    const prodRes = await pool.query('SELECT * FROM public.products WHERE id = $1', [productId]);
    if (prodRes.rows.length === 0) {
      throw new BadRequestError('Product not found.');
    }

    const product = prodRes.rows[0];

    if (userRole !== 'admin') {
      const artRes = await pool.query('SELECT id FROM public.artisans WHERE user_id = $1', [userId]);
      if (artRes.rows.length === 0 || artRes.rows[0].id !== product.artisan_id) {
        throw new OwnershipError('product');
      }
    }

    // Execute update safely
    const updateQuery = `UPDATE public.products SET ${field} = $1, updated_at = NOW() WHERE id = $2`;
    await pool.query(updateQuery, [value, productId]);

    res.status(200).json({
      success: true,
      actionExecuted: true,
      message: `Successfully updated ${field.replace('_', ' ')} to "${value}".`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
