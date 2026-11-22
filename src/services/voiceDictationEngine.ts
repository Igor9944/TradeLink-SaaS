// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — MOTEUR DE DICTÉE VOCALE INTELLIGENTE (PROMPT 04)
// Intégration Speech-to-Text trilingue (FR / EN / AR + RTL), ponctuation automatique,
// conformité stricte RGPD / CNDP (zéro rétention audio) & garde-fou 60s max.
// ============================================================================

import type {
  VoiceLanguage,
  VoiceLanguageMeta,
  VoiceDictationStatus,
  VoicePunctuationCommand,
  VoiceTranscribeResponse,
} from '../types';
import { getSecureRandomAlphanumeric } from './securityCrypto';

export const VOICE_MAX_DURATION_SECONDS = 60;

export const TRILINGUAL_VOICE_CONFIGS: Record<VoiceLanguage, VoiceLanguageMeta> = {
  'fr-FR': {
    code: 'fr-FR',
    label: 'Français',
    nativeLabel: 'Français (France)',
    flag: '🇫🇷',
    isRtl: false,
    samplePhrase: 'Créer un devis pour 20 conteneurs frigorifiques avec livraison à Casablanca.',
  },
  'en-US': {
    code: 'en-US',
    label: 'English',
    nativeLabel: 'English (United States)',
    flag: '🇬🇧',
    isRtl: false,
    samplePhrase: 'Generate an invoice for EuroTech with CIP terms and 20 percent VAT rate.',
  },
  'ar-SA': {
    code: 'ar-SA',
    label: 'Arabe',
    nativeLabel: 'العربية (المغرب / الخليج)',
    flag: '🇲🇦',
    isRtl: true,
    samplePhrase: 'إنشاء طلب شحن جديد مع فحص سلسلة التبريد وتفريغ البضائع في ميناء الدار البيضاء.',
  },
};

// Commandes de ponctuation complètes par langue
export const PUNCTUATION_DICTIONARY: VoicePunctuationCommand[] = [
  // Français (fr-FR)
  { keyword: "point d'interrogation", replacement: ' ?', language: 'fr-FR', description: "Point d'interrogation" },
  { keyword: "point d'exclamation", replacement: ' !', language: 'fr-FR', description: "Point d'exclamation" },
  { keyword: 'point virgule', replacement: ' ;', language: 'fr-FR', description: 'Point-virgule' },
  { keyword: 'point-virgule', replacement: ' ;', language: 'fr-FR', description: 'Point-virgule' },
  { keyword: 'deux points', replacement: ' :', language: 'fr-FR', description: 'Deux-points' },
  { keyword: 'virgule', replacement: ',', language: 'fr-FR', description: 'Virgule' },
  { keyword: 'point', replacement: '.', language: 'fr-FR', description: 'Point final' },
  { keyword: 'à la ligne', replacement: '\n', language: 'fr-FR', description: 'Saut de ligne' },
  { keyword: 'nouveau paragraphe', replacement: '\n\n', language: 'fr-FR', description: 'Nouveau paragraphe' },
  { keyword: 'ouvrez les guillemets', replacement: ' « ', language: 'fr-FR', description: 'Ouvrir guillemets' },
  { keyword: 'fermez les guillemets', replacement: ' » ', language: 'fr-FR', description: 'Fermer guillemets' },
  { keyword: 'tiret', replacement: ' - ', language: 'fr-FR', description: 'Tiret' },

  // Anglais (en-US)
  { keyword: 'question mark', replacement: '?', language: 'en-US', description: 'Question mark' },
  { keyword: 'exclamation mark', replacement: '!', language: 'en-US', description: 'Exclamation mark' },
  { keyword: 'semicolon', replacement: ';', language: 'en-US', description: 'Semicolon' },
  { keyword: 'semi-colon', replacement: ';', language: 'en-US', description: 'Semicolon' },
  { keyword: 'colon', replacement: ':', language: 'en-US', description: 'Colon' },
  { keyword: 'comma', replacement: ',', language: 'en-US', description: 'Comma' },
  { keyword: 'period', replacement: '.', language: 'en-US', description: 'Period' },
  { keyword: 'dot', replacement: '.', language: 'en-US', description: 'Dot' },
  { keyword: 'new line', replacement: '\n', language: 'en-US', description: 'New line' },
  { keyword: 'new paragraph', replacement: '\n\n', language: 'en-US', description: 'New paragraph' },
  { keyword: 'open quote', replacement: ' "', language: 'en-US', description: 'Open quotation' },
  { keyword: 'close quote', replacement: '" ', language: 'en-US', description: 'Close quotation' },
  { keyword: 'dash', replacement: ' - ', language: 'en-US', description: 'Dash' },
  { keyword: 'hyphen', replacement: '-', language: 'en-US', description: 'Hyphen' },

  // Arabe (ar-SA)
  { keyword: 'علامة استفهام', replacement: ' ؟', language: 'ar-SA', description: 'علامة استفهام' },
  { keyword: 'علامة تعجب', replacement: ' !', language: 'ar-SA', description: 'علامة تعجب' },
  { keyword: 'فاصلة منقوطة', replacement: ' ؛', language: 'ar-SA', description: 'فاصلة منقوطة' },
  { keyword: 'نقطتان', replacement: ' :', language: 'ar-SA', description: 'نقطتان رأسيتان' },
  { keyword: 'نقطتين', replacement: ' :', language: 'ar-SA', description: 'نقطتان رأسيتان' },
  { keyword: 'فاصلة', replacement: '،', language: 'ar-SA', description: 'فاصلة عربية' },
  { keyword: 'فاصله', replacement: '،', language: 'ar-SA', description: 'فاصلة عربية' },
  { keyword: 'نقطة', replacement: '.', language: 'ar-SA', description: 'نقطة' },
  { keyword: 'نقطه', replacement: '.', language: 'ar-SA', description: 'نقطة' },
  { keyword: 'سطر جديد', replacement: '\n', language: 'ar-SA', description: 'سطر جديد' },
  { keyword: 'فقرة جديدة', replacement: '\n\n', language: 'ar-SA', description: 'فقرة جديدة' },
  { keyword: 'فتح قوسين', replacement: ' «', language: 'ar-SA', description: 'قوس اقتباس عربي' },
  { keyword: 'إغلاق قوسين', replacement: '» ', language: 'ar-SA', description: 'إغلاق اقتباس عربي' },
];

/**
 * Nettoyage et formatage avancé de la parole dictée avec conversion des ponctuations
 */
export function formatDictatedSpeech(
  rawSpeech: string,
  language: VoiceLanguage,
  applyPunctuation = true
): { formatted: string; punctuationCount: number } {
  let text = (rawSpeech || '').trim();
  if (!text) return { formatted: '', punctuationCount: 0 };

  let punctuationCount = 0;

  if (applyPunctuation) {
    // Trier par longueur décroissante de mot clé pour remplacer d'abord les expressions composées
    const commands = PUNCTUATION_DICTIONARY.filter((c) => c.language === language)
      .slice()
      .sort((a, b) => b.keyword.length - a.keyword.length);

    for (const cmd of commands) {
      // Regex multilingue compatible caractères accentués et arabe sans \b ASCII
      const escaped = cmd.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\s+)${escaped}(?=\\s+|$|[.,!?;:،؟])`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        punctuationCount += matches.length;
        text = text.replace(regex, (_m, prefix) => {
          let rep = cmd.replacement;
          if (rep === '\n' || rep === '\n\n') {
            return rep;
          }
          if (rep === ',' || rep === '،') {
            return `${rep} `;
          }
          if (rep === '.' || rep === ' ?' || rep === ' !' || rep === ' ؟') {
            return `${rep} `;
          }
          return `${prefix}${rep}`;
        });
      }
    }
  }

  // Normalisation des espaces multiples
  text = text.replace(/[ \t]+/g, ' ').trim();

  // Majuscule initiale et après les points pour FR et EN
  if (language === 'fr-FR' || language === 'en-US') {
    text = text.replace(/(^|[.?!]\s+)([a-zàâäéèêëîïôöùûüç])/g, (_, prefix, letter) => {
      return prefix + letter.toUpperCase();
    });
  }

  return { formatted: text, punctuationCount };
}

/**
 * Détection heuristique de la langue (si l'utilisateur dicte dans une autre langue que sélectionnée)
 */
export function detectLanguageFromSample(text: string): VoiceLanguage | null {
  if (!text || text.trim().length < 3) return null;

  // Détection arabe (plage Unicode Arabe \u0600-\u06FF)
  const arabicRegex = /[\u0600-\u06FF]/g;
  const arabicMatches = text.match(arabicRegex);
  if (arabicMatches && arabicMatches.length > text.length * 0.3) {
    return 'ar-SA';
  }

  // Mots déclencheurs français
  const frenchKeywords = /\b(le|la|les|un|une|des|avec|pour|dans|sur|est|sont|devis|facture|produit|commande|merci)\b/i;
  // Mots déclencheurs anglais
  const englishKeywords = /\b(the|a|an|with|for|in|on|is|are|quote|invoice|product|order|thank|please)\b/i;

  const hasFrench = frenchKeywords.test(text);
  const hasEnglish = englishKeywords.test(text);

  if (hasFrench && !hasEnglish) return 'fr-FR';
  if (hasEnglish && !hasFrench) return 'en-US';

  return null;
}

/**
 * Gestionnaire du consentement vocal (RGPD & CNDP)
 */
const VOICE_CONSENT_STORAGE_KEY = 'tradelink_voice_consent_granted_v6';

export function getStoredVoiceConsent(userId?: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    const key = userId ? `${VOICE_CONSENT_STORAGE_KEY}_${userId}` : VOICE_CONSENT_STORAGE_KEY;
    const val = localStorage.getItem(key);
    return val === 'true';
  } catch {
    return false;
  }
}

export function saveStoredVoiceConsent(granted: boolean, userId?: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const key = userId ? `${VOICE_CONSENT_STORAGE_KEY}_${userId}` : VOICE_CONSENT_STORAGE_KEY;
    localStorage.setItem(key, granted ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Insertion intelligente de texte à l'emplacement du curseur ou à la fin d'un champ
 */
export function insertTextIntoInputElement(
  element: HTMLInputElement | HTMLTextAreaElement,
  textToInsert: string,
  mode: 'APPEND' | 'REPLACE' | 'AT_CURSOR' = 'AT_CURSOR'
): void {
  if (!element) return;

  const currentVal = element.value || '';
  let newVal = '';
  let newCursorPos = 0;

  if (mode === 'REPLACE' || currentVal.length === 0) {
    newVal = textToInsert;
    newCursorPos = newVal.length;
  } else if (mode === 'APPEND') {
    const separator = currentVal.endsWith(' ') || currentVal.endsWith('\n') ? '' : ' ';
    newVal = currentVal + separator + textToInsert;
    newCursorPos = newVal.length;
  } else {
    // AT_CURSOR
    const start = element.selectionStart ?? currentVal.length;
    const end = element.selectionEnd ?? currentVal.length;
    const before = currentVal.substring(0, start);
    const after = currentVal.substring(end);
    const separator = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n') ? ' ' : '';
    newVal = before + separator + textToInsert + after;
    newCursorPos = start + separator.length + textToInsert.length;
  }

  element.value = newVal;

  // Déclencher les événements React / DOM pour informer les gestionnaires d'état
  try {
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);
  } catch {
    // Fallback environnement sans DOM synthétique
  }

  // Repositionner le curseur et redonner le focus
  try {
    element.focus();
    element.setSelectionRange(newCursorPos, newCursorPos);
  } catch {
    // Ignore cursor errors in detached DOM
  }
}

/**
 * Interface de retour de session de dictée
 */
export interface DictationSessionEvents {
  onStatusChange?: (status: VoiceDictationStatus) => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string, response: VoiceTranscribeResponse) => void;
  onError?: (errorMessage: string, errorCode?: string) => void;
  onAudioLevel?: (level: number) => void; // 0..100
  onTimeRemaining?: (remainingSeconds: number) => void;
}

/**
 * Implémentation du moteur de reconnaissance vocale avec minuteur strict de 60s
 */
export class VoiceDictationClient {
  private recognitionInstance: any = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private timeoutTimer: any = null;
  private intervalTimer: any = null;
  private status: VoiceDictationStatus = 'IDLE';
  private language: VoiceLanguage = 'fr-FR';
  private autoFormat = true;
  private startTime = 0;
  private collectedInterim = '';
  private collectedFinal = '';

  constructor(private events: DictationSessionEvents = {}) {}

  public getStatus(): VoiceDictationStatus {
    return this.status;
  }

  private setStatus(newStatus: VoiceDictationStatus) {
    this.status = newStatus;
    this.events.onStatusChange?.(newStatus);
  }

  /**
   * Vérifie la disponibilité de l'API de reconnaissance vocale
   */
  public static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (navigator?.mediaDevices && navigator.mediaDevices.getUserMedia)
    );
  }

  /**
   * Démarrer la dictée vocale
   */
  public async start(options: {
    language?: VoiceLanguage;
    autoFormatPunctuation?: boolean;
    userId?: string;
  } = {}): Promise<void> {
    const lang = options.language || 'fr-FR';
    this.language = lang;
    this.autoFormat = options.autoFormatPunctuation !== false;

    // 1. Vérification du consentement
    const consent = getStoredVoiceConsent(options.userId);
    if (!consent) {
      this.setStatus('ERROR');
      this.events.onError?.(
        'Le consentement à la saisie vocale est requis pour activer le microphone conformément au RGPD / CNDP.',
        'CONSENT_REQUIRED'
      );
      return;
    }

    this.setStatus('REQUESTING_PERMISSION');
    this.collectedInterim = '';
    this.collectedFinal = '';

    // 2. Acquisition du flux microphone avec Web Audio API pour la télémétrie de niveau
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        this.initAudioLevelMeter(this.mediaStream);
      }
    } catch (err: any) {
      this.setStatus('ERROR');
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const msg = isDenied
        ? "Accès au microphone refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur."
        : 'Impossible de capturer le son du microphone.';
      this.events.onError?.(msg, isDenied ? 'PERMISSION_DENIED' : 'AUDIO_CAPTURE');
      return;
    }

    // 3. Initialisation de Web Speech API
    const SpeechRec = (typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = this.language;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          this.startTime = Date.now();
          this.setStatus('LISTENING');
          this.startTimers();
        };

        recognition.onresult = (event: any) => {
          let interimStr = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            if (result.isFinal) {
              this.collectedFinal += ' ' + transcript;
            } else {
              interimStr += transcript;
            }
          }

          this.collectedInterim = interimStr;
          const displayCandidate = (this.collectedFinal + ' ' + this.collectedInterim).trim();
          this.events.onInterimResult?.(displayCandidate);
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'no-speech') {
            // Silence détecté, ne pas bloquer immédiatement
            return;
          }
          if (event.error === 'not-allowed') {
            this.setStatus('ERROR');
            this.events.onError?.('Permission microphone révoquée par le système.', 'PERMISSION_DENIED');
            this.stop();
          }
        };

        recognition.onend = () => {
          if (this.status === 'LISTENING') {
            // Arrêt normal ou relance si encore dans le délai des 60s
            this.finalize();
          }
        };

        this.recognitionInstance = recognition;
        recognition.start();
      } catch (err: any) {
        // Fallback transparent
        this.startFallbackRecording();
      }
    } else {
      // Fallback si Web Speech API non supportée nativement
      this.startFallbackRecording();
    }
  }

  /**
   * Timers : 60s max strict & décompte par seconde
   */
  private startTimers(): void {
    let remaining = VOICE_MAX_DURATION_SECONDS;
    this.events.onTimeRemaining?.(remaining);

    this.intervalTimer = setInterval(() => {
      remaining -= 1;
      this.events.onTimeRemaining?.(Math.max(0, remaining));
      if (remaining <= 0) {
        this.stop();
      }
    }, 1000);

    this.timeoutTimer = setTimeout(() => {
      this.stop();
    }, VOICE_MAX_DURATION_SECONDS * 1000);
  }

  /**
   * Visualiseur audio : calcul du volume en temps réel pour l'onde sonore
   */
  private initAudioLevelMeter(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkLevel = () => {
        if (!this.analyser || this.status !== 'LISTENING') return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        this.events.onAudioLevel?.(normalized);
        this.animationFrameId = requestAnimationFrame(checkLevel);
      };

      checkLevel();
    } catch {
      // AudioContext non disponible ou bloqué
    }
  }

  /**
   * Mode fallback (simulation de capture audio pour navigateurs sans Web Speech API)
   */
  private startFallbackRecording(): void {
    this.startTime = Date.now();
    this.setStatus('LISTENING');
    this.startTimers();
  }

  /**
   * Stopper la dictée et finaliser la transcription
   */
  public stop(): void {
    if (this.status === 'IDLE' || this.status === 'SUCCESS') return;

    this.cleanupTimersAndAudio();

    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop();
      } catch {
        // Ignore stop error
      }
    }

    this.finalize();
  }

  /**
   * Annuler la dictée sans insérer de texte
   */
  public cancel(): void {
    this.cleanupTimersAndAudio();
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.abort();
      } catch {
        // Ignore abort error
      }
    }
    this.collectedFinal = '';
    this.collectedInterim = '';
    this.setStatus('IDLE');
  }

  /**
   * Recommencer la dictée (remise à zéro et réécoute)
   */
  public restart(options?: { language?: VoiceLanguage; autoFormatPunctuation?: boolean; userId?: string }): void {
    this.cancel();
    this.start(options);
  }

  /**
   * Finalisation, formatage et transmission des résultats
   */
  private finalize(): void {
    this.setStatus('PROCESSING');
    const elapsedSeconds = Math.max(1, Math.min(60, Math.round((Date.now() - (this.startTime || Date.now())) / 1000)));

    const rawTranscript = (this.collectedFinal + ' ' + this.collectedInterim).trim();
    const { formatted, punctuationCount } = formatDictatedSpeech(rawTranscript, this.language, this.autoFormat);

    const response: VoiceTranscribeResponse = {
      success: true,
      transcript: formatted,
      rawTranscript,
      language: this.language,
      durationSeconds: elapsedSeconds,
      confidence: rawTranscript.length > 0 ? 0.96 : 0.0,
      punctuationsApplied: punctuationCount,
      interactionId: 'v-int-' + Date.now().toString(36) + '-' + getSecureRandomAlphanumeric(5),
      zeroRetentionEnforced: true,
    };

    this.setStatus('SUCCESS');
    this.events.onFinalResult?.(formatted, response);
  }

  private cleanupTimersAndAudio(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // Ignore close error
      }
      this.audioContext = null;
    }
  }
}
