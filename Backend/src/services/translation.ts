import axios from 'axios';
import { config } from '../config';
import { AIServiceError } from '../types/errors';

export const translateText = async (
  text: string,
  sourceLanguageCode: string = 'auto',
  targetLanguageCode: string = 'hi-IN'
): Promise<string> => {
  if (!config.SARVAM_API_KEY) {
    throw new AIServiceError('Translation is not configured. Set SARVAM_API_KEY.');
  }

  const url = `${config.SARVAM_BASE_URL}/translate`;
  const payload = {
    input: text,
    source_language_code: sourceLanguageCode || 'auto',
    target_language_code: targetLanguageCode || 'hi-IN',
    model: config.SARVAM_TRANSLATION_MODEL || 'mayura:v1',
    mode: 'formal',
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'api-subscription-key': config.SARVAM_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    const data = response.data;
    let translated = '';

    if (Array.isArray(data.translations) && data.translations.length > 0) {
      translated = data.translations[0]?.translated_text || '';
    } else {
      translated = data.translated_text || '';
    }

    if (!translated) {
      throw new AIServiceError('Sarvam returned an empty translation');
    }

    return translated.trim();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new AIServiceError('Sarvam authentication failed. Check SARVAM_API_KEY.');
      }
      if (error.response?.status === 429) {
        throw new AIServiceError('Sarvam rate limit exceeded, please try again later.');
      }
      throw new AIServiceError(`Sarvam translation failed (HTTP ${error.response?.status})`);
    }
    throw new AIServiceError(`Unable to reach the translation service: ${error instanceof Error ? error.message : error}`);
  }
};

export const translateToHindi = async (
  text: string,
  sourceLanguageCode: string = 'auto'
): Promise<string> => {
  return translateText(text, sourceLanguageCode, 'hi-IN');
};
