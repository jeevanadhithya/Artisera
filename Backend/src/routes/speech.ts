import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth, getOptionalUser, AuthenticatedRequest } from '../middleware/auth';
import * as speechService from '../services/speech';
import * as translationService from '../services/translation';
import * as imageService from '../services/image';
import { BadRequestError } from '../types/errors';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const success = (data: any) => ({ success: true, data });

/**
 * POST /api/speech/transcribe
 * Standalone Sarvam AI Speech-to-Text with multi-dialect support
 * Accepts: multipart/form-data 'file' or JSON body { audio_base64, mime_type, language }
 */
router.post('/transcribe', getOptionalUser, upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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

    // 1. Transcribe audio with Sarvam AI (or Gemini fallback)
    const { transcript, rawTranscript, language: detectedLanguage, languageCode } = await speechService.transcribeAudio(
      audioBuffer,
      contentType,
      languageHint
    );

    // 2. Generate regional translations across Artisera languages
    const translations = await translationService.translateToAllLanguages(transcript, 'en-IN');
    if (rawTranscript && detectedLanguage) {
      const match = translationService.ARTISERA_LANGUAGES.find(
        (l) => l.name.toLowerCase() === detectedLanguage.toLowerCase() || l.code.toLowerCase() === (languageCode || '').toLowerCase()
      );
      if (match) {
        translations[match.code] = rawTranscript;
      }
    }

    res.status(200).json(success({
      transcript,
      raw_transcript: rawTranscript || transcript,
      detected_language: detectedLanguage || 'Hindi',
      language_code: languageCode || 'hi-IN',
      translations,
      message: 'Audio transcribed and translated successfully with Sarvam AI.',
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/speech/synthesize
 * Sarvam AI Text-to-Speech synthesis
 * Body: { text: string, language?: string, speed?: number }
 */
router.post('/synthesize', async (req, res: Response, next: NextFunction) => {
  try {
    const text = req.body?.text;
    const language = req.body?.language || 'en-IN';
    const speed = req.body?.speed || 1.0;

    if (!text || typeof text !== 'string') {
      throw new BadRequestError('Text is required for speech synthesis.');
    }

    const result = await speechService.synthesizeSpeech(text, language, speed);
    res.status(200).json(success(result));
  } catch (error) {
    next(error);
  }
});

export default router;

