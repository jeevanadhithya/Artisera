import axios from 'axios';
import { config } from '../config';
import { AIServiceError } from '../types/errors';
import { translateText } from './translation';

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
  'sa-in': 'Sanskrit',
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
    hindi: 'hi-IN', english: 'en-IN', tamil: 'ta-IN', telugu: 'te-IN',
    kannada: 'kn-IN', malayalam: 'ml-IN', marathi: 'mr-IN', bengali: 'bn-IN',
    gujarati: 'gu-IN', odia: 'od-IN', punjabi: 'pa-IN', assamese: 'as-IN',
  };
  
  return regionMap[hint] || 'unknown';
};

// Check if string contains non-ASCII characters (e.g. Indic scripts like Devanagari, Tamil, Telugu, Bengali)
const isNonEnglish = (text: string): boolean => {
  if (!text) return false;
  // Check for characters outside basic ASCII range (Indic scripts start from \u0900)
  return /[^\u0000-\u007F]/.test(text);
};

export interface TranscriptionResult {
  transcript: string; // English text translated from any spoken language
  rawTranscript?: string; // Original spoken text in native language
  language?: string; // Spoken language label (e.g. 'Hindi', 'Tamil', 'Marathi')
  languageCode?: string; // BCP-47 language tag
}

// ─── Sarvam Speech-to-Text with Automatic English Translation ─────────────────
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
  const fileBlob = new Blob([new Uint8Array(audioBytes)], { type: contentType || 'audio/webm' });
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
    let rawTranscript = '';

    if (Array.isArray(payload.transcripts) && payload.transcripts.length > 0) {
      rawTranscript = payload.transcripts
        .map((seg: any) => seg.transcript || '')
        .filter(Boolean)
        .join(' ');
    } else {
      rawTranscript = payload.transcript || '';
    }

    if (!rawTranscript || !rawTranscript.trim()) {
      throw new AIServiceError('Sarvam returned an empty transcript');
    }

    rawTranscript = rawTranscript.trim();
    const detectedLangCode = (payload.language_code && payload.language_code !== 'unknown')
      ? payload.language_code
      : (languageCode !== 'unknown' ? languageCode : 'hi-IN');
    const detectedLanguageName = displayLabel(detectedLangCode) || 'Regional Language';

    // If already in English and no Indic characters, use it directly
    if (!isNonEnglish(rawTranscript) && detectedLangCode.toLowerCase().startsWith('en')) {
      return {
        transcript: rawTranscript,
        rawTranscript,
        language: 'English',
        languageCode: 'en-IN',
      };
    }

    // Convert non-English speech to fluent English text using Sarvam Translation
    let englishTranscript = rawTranscript;
    try {
      console.log(`Translating voice transcript from ${detectedLanguageName} to English...`);
      englishTranscript = await translateText(rawTranscript, detectedLangCode || 'auto', 'en-IN');
    } catch (transErr) {
      console.warn('Sarvam translation to English failed, falling back to Gemini translation:', transErr);
      if (config.GEMINI_API_KEY) {
        try {
          englishTranscript = await translateWithGemini(rawTranscript, detectedLanguageName);
        } catch (gErr) {
          console.warn('Gemini translation fallback also failed:', gErr);
          englishTranscript = rawTranscript;
        }
      }
    }

    return {
      transcript: englishTranscript,
      rawTranscript,
      language: detectedLanguageName,
      languageCode: detectedLangCode,
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

// ─── Gemini Translation Helper ───────────────────────────────────────────────
const translateWithGemini = async (text: string, sourceLanguage?: string): Promise<string> => {
  if (!config.GEMINI_API_KEY) return text;
  const langContext = sourceLanguage ? `from ${sourceLanguage}` : 'from its original language';

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Translate the following artisan craft voice description ${langContext} into clear, natural, high-quality English text for an e-commerce product catalog. Return ONLY the English translation without quotes or explanations.\n\nText: "${text}"`,
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
  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  const candidate = response.data?.candidates?.[0];
  const translated = candidate?.content?.parts?.[0]?.text?.trim();
  return translated || text;
};

// ─── Gemini Speech-to-Text Fallback (Voice in Any Language -> English Text) ───
const transcribeGemini = async (
  audioBytes: Buffer,
  contentType: string,
  languageHint?: string
): Promise<TranscriptionResult> => {
  if (!config.GEMINI_API_KEY) {
    throw new AIServiceError('Speech transcription fallback is not configured. Set GEMINI_API_KEY.');
  }

  const audioB64 = audioBytes.toString('base64');
  const langInstruction = languageHint ? ` The speaker is talking in '${languageHint}'.` : ' The speaker may speak in any Indian regional language or English.';

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
            text: `Listen to this artisan craft voice recording.${langInstruction}
1. Accurately understand and transcribe the craft details spoken in the audio.
2. Translate the speech completely into natural, clear, fluent English text suitable for an online marketplace product description.
3. Return ONLY the English text. Do not include markdown codeblocks, metadata, or explanations.`,
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
      language: displayLabel(languageHint) || 'Auto-detected',
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
  // If Sarvam API key is configured, use it first (native speech-to-text + auto translate to English)
  if (config.SARVAM_API_KEY) {
    try {
      console.log('Transcribing via primary provider (Sarvam) & converting to English...');
      return await transcribeSarvam(audioBytes, contentType, languageHint);
    } catch (error) {
      console.warn('Sarvam transcription failed, trying fallback...', error);
      if (config.GEMINI_API_KEY) {
        return await transcribeGemini(audioBytes, contentType, languageHint);
      }
      throw error;
    }
  }

  // If only Gemini is configured, transcribe directly to English
  if (config.GEMINI_API_KEY) {
    console.log('Transcribing via fallback provider (Gemini) directly to English...');
    return await transcribeGemini(audioBytes, contentType, languageHint);
  }

  throw new AIServiceError('No speech-to-text provider is configured. Please set SARVAM_API_KEY or GEMINI_API_KEY.');
};

// ─── Text-to-Speech Synthesis ───────────────────────────────────────────────
export const synthesizeSpeech = async (
  text: string,
  languageHint: string = 'en-IN',
  speed: number = 1.0
): Promise<{ audioBase64: string; contentType: string }> => {
  if (!text || !text.trim()) {
    throw new AIServiceError('Text is required for speech synthesis.');
  }

  const langCode = languageHintToBcp47(languageHint) || 'en-IN';

  if (config.SARVAM_API_KEY) {
    try {
      const url = `${config.SARVAM_BASE_URL}/text-to-speech`;
      const response = await axios.post(
        url,
        {
          inputs: [text.trim().substring(0, 500)],
          target_language_code: langCode,
          speaker: 'meera',
          pitch: 0,
          pace: Math.max(0.7, Math.min(1.5, speed)),
          loudness: 1.5,
          speech_sample_rate: 8000,
          enable_preprocessing: true,
          model: 'bulbul:v1',
        },
        {
          headers: {
            'api-subscription-key': config.SARVAM_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const audios = response.data?.audios;
      if (Array.isArray(audios) && audios.length > 0 && audios[0]) {
        return {
          audioBase64: audios[0],
          contentType: 'audio/wav',
        };
      }
    } catch (ttsErr) {
      console.warn('Sarvam TTS failed, returning empty base64:', ttsErr);
    }
  }

  // Graceful fallback for environments without active TTS key
  return {
    audioBase64: '',
    contentType: 'audio/wav',
  };
};


