import axios from 'axios';
import { config } from '../config';
import { AIServiceError } from '../types/errors';

const LANGUAGE_LABELS: Record<string, string> = {
  'hi-in': 'Hindi',
  'en-in': 'English',
  'ta-in': 'Tamil',
  'te-in': 'Telugu',
  'kn-in': 'Kannada',
  'ml-in': 'Malayalam',
  'mr-in': 'Marathi',
  'bn-in': 'Bengali',
  'gu-in': 'Gujarati',
  'od-in': 'Odia',
  'pa-in': 'Punjabi',
  'as-in': 'Assamese',
  'ur-in': 'Urdu',
  'ne-in': 'Nepali',
};

const displayLabel = (bcp47?: string): string | undefined => {
  if (!bcp47) return undefined;
  return LANGUAGE_LABELS[bcp47.toLowerCase()] || bcp47;
};

const languageHintToBcp47 = (languageHint?: string): string => {
  if (!languageHint) return 'unknown';
  const hint = languageHint.trim().toLowerCase();
  
  if (hint.includes('-')) {
    const [lang, region] = hint.split('-');
    if (lang && region) {
      return `${lang}-${region.toUpperCase()}`;
    }
  }

  const regionMap: Record<string, string> = {
    hi: 'hi-IN', en: 'en-IN', ta: 'ta-IN', te: 'te-IN',
    kn: 'kn-IN', ml: 'ml-IN', mr: 'mr-IN', bn: 'bn-IN',
    gu: 'gu-IN', od: 'od-IN', pa: 'pa-IN', as: 'as-IN',
    ur: 'ur-IN', ne: 'ne-IN', sa: 'sa-IN',
  };
  
  return regionMap[hint] || 'unknown';
};

export interface TranscriptionResult {
  transcript: string;
  language?: string;
}

// ─── Sarvam Speech-to-Text ────────────────────────────────────────────────────
const transcribeSarvam = async (
  audioBytes: Buffer,
  contentType: string,
  languageHint?: string
): Promise<TranscriptionResult> => {
  if (!config.SARVAM_API_KEY) {
    throw new AIServiceError('Speech-to-text is not configured. Set SARVAM_API_KEY.');
  }

  const url = `${config.SARVAM_BASE_URL}/speech-to-text`;
  const languageCode = languageHintToBcp47(languageHint);

  // Map appropriate extension for Sarvam audio decoder
  const cleanMime = (contentType || 'audio/webm').toLowerCase();
  let filename = 'voice.webm';
  if (cleanMime.includes('wav')) filename = 'voice.wav';
  else if (cleanMime.includes('mp4') || cleanMime.includes('m4a')) filename = 'voice.m4a';
  else if (cleanMime.includes('mp3') || cleanMime.includes('mpeg')) filename = 'voice.mp3';
  else if (cleanMime.includes('ogg')) filename = 'voice.ogg';

  // Use Node.js built-in global FormData and Blob
  const formData = new FormData();
  const fileBlob = new Blob([audioBytes], { type: contentType || 'audio/webm' });
  formData.append('file', fileBlob, filename);
  formData.append('model', config.SARVAM_SPEECH_MODEL || 'saaras:v3');
  formData.append('mode', config.SARVAM_SPEECH_MODE || 'transcribe');

  // Only pass language_code if it is a known valid BCP-47 tag
  if (languageCode && languageCode !== 'unknown') {
    formData.append('language_code', languageCode);
  }

  try {
    const response = await axios.post(url, formData, {
      headers: {
        'api-subscription-key': config.SARVAM_API_KEY,
      },
      timeout: 120000,
    });

    const payload = response.data;
    let transcript = '';

    if (Array.isArray(payload.transcripts) && payload.transcripts.length > 0) {
      transcript = payload.transcripts
        .map((seg: any) => seg.transcript || '')
        .filter(Boolean)
        .join(' ');
    } else {
      transcript = payload.transcript || '';
    }

    if (!transcript) {
      throw new AIServiceError('Sarvam returned an empty transcript');
    }

    return {
      transcript: transcript.trim(),
      language: languageCode !== 'unknown' ? displayLabel(languageCode) : (payload.language_code ? displayLabel(payload.language_code) : 'Hindi/English'),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn('Sarvam API error response:', error.response?.status, error.response?.data);
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new AIServiceError('Sarvam authentication failed. Check SARVAM_API_KEY.');
      }
      if (error.response?.status === 429) {
        throw new AIServiceError('Sarvam rate limit exceeded, please try again later.');
      }
      const apiMsg = error.response?.data?.error?.message || error.response?.data?.message || `HTTP ${error.response?.status}`;
      throw new AIServiceError(`Sarvam speech transcription failed: ${apiMsg}`);
    }
    throw new AIServiceError(`Unable to reach Sarvam speech service: ${error instanceof Error ? error.message : error}`);
  }
};

// ─── Gemini Speech-to-Text Fallback ──────────────────────────────────────────
const transcribeGemini = async (
  audioBytes: Buffer,
  contentType: string,
  languageHint?: string
): Promise<TranscriptionResult> => {
  if (!config.GEMINI_API_KEY) {
    throw new AIServiceError('Speech transcription fallback is not configured. Set GEMINI_API_KEY.');
  }

  const audioB64 = audioBytes.toString('base64');
  const langInstruction = languageHint ? ` The audio is in language '${languageHint}'.` : '';

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: contentType,
              data: audioB64,
            },
          },
          {
            text: `Transcribe this audio recording accurately.${langInstruction} Return only the transcribed text, no explanation or formatting.`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.GEMINI_MODEL}:generateContent?key=${config.GEMINI_API_KEY}`;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });

    const candidate = response.data?.candidates?.[0];
    const transcript = candidate?.content?.parts?.[0]?.text?.trim() || '';

    if (!transcript) {
      throw new AIServiceError('Gemini returned an empty transcript');
    }

    return {
      transcript,
      language: displayLabel(languageHint),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new AIServiceError(`Gemini speech transcription failed (HTTP ${error.response?.status})`);
    }
    throw new AIServiceError(`Gemini speech transcription failed: ${error instanceof Error ? error.message : error}`);
  }
};

// ─── Main Public Interface ───────────────────────────────────────────────────
export const transcribeAudio = async (
  audioBytes: Buffer,
  contentType: string,
  languageHint?: string
): Promise<TranscriptionResult> => {
  // If Sarvam API key is configured, use it first
  if (config.SARVAM_API_KEY) {
    try {
      console.log('Transcribing via primary provider (Sarvam)...');
      return await transcribeSarvam(audioBytes, contentType, languageHint);
    } catch (error) {
      console.warn('Sarvam transcription failed, trying fallback...', error);
      if (config.GEMINI_API_KEY) {
        return await transcribeGemini(audioBytes, contentType, languageHint);
      }
      throw error;
    }
  }

  // If only Gemini is configured, use it directly
  if (config.GEMINI_API_KEY) {
    console.log('Transcribing via fallback provider (Gemini)...');
    return await transcribeGemini(audioBytes, contentType, languageHint);
  }

  throw new AIServiceError('No speech-to-text provider is configured. Please set SARVAM_API_KEY or GEMINI_API_KEY.');
};
