// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — MODALE DE CONSENTEMENT VOCAL ÉCLAIRÉ (PROMPT 04)
// Conformité RGPD / CNDP : Zéro rétention audio, chiffrement & garde-fou 60s.
// ============================================================================

import React from 'react';
import { Mic, ShieldCheck, Lock, Clock, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { Locale } from '../../types';

interface VoiceConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export const VoiceConsentModal: React.FC<VoiceConsentModalProps> = ({
  isOpen,
  onAccept,
  onReject,
}) => {
  const { locale } = useApp();

  if (!isOpen) return null;

  const texts: Record<
    Locale,
    {
      title: string;
      subtitle: string;
      intro: string;
      points: { title: string; desc: string }[];
      acceptBtn: string;
      rejectBtn: string;
    }
  > = {
    fr: {
      title: 'Autorisation de Saisie Vocale TRADELINK',
      subtitle: 'Conformité stricte RGPD (UE) & CNDP (Maroc)',
      intro:
        'Pour vous permettre de dicter vos formulaires, descriptions de produits, messages et requêtes, TRADELINK sollicite votre consentement pour accéder à votre microphone.',
      points: [
        {
          title: 'Zéro Rétention Audio',
          desc: 'Aucun enregistrement de votre voix n’est stocké sur nos serveurs. Le flux audio est traité en mémoire vive éphémère puis immédiatement détruit après transcription.',
        },
        {
          title: 'Garde-fou 60 Secondes',
          desc: 'Toute session de dictée est strictement limitée à 60 secondes maximum avec coupure automatique du microphone.',
        },
        {
          title: 'Chiffrement & Sécurité des Flux',
          desc: 'Les transmissions s’effectuent exclusivement via des canaux chiffrés TLS 1.3 avec jeton d’authentification sécurisé.',
        },
      ],
      acceptBtn: 'J’autorise et j’active la dictée',
      rejectBtn: 'Refuser',
    },
    en: {
      title: 'TRADELINK Voice Dictation Authorization',
      subtitle: 'Strict GDPR (EU) & CNDP (Morocco) Compliance',
      intro:
        'To allow you to dictate form inputs, product descriptions, internal messages, and requests, TRADELINK requests your explicit consent to access your microphone.',
      points: [
        {
          title: 'Zero Audio Retention',
          desc: 'No voice recording is stored on our servers. Audio streams are processed in ephemeral RAM and immediately purged upon transcription.',
        },
        {
          title: '60-Second Safeguard',
          desc: 'Every dictation session is strictly capped at 60 seconds maximum with automatic microphone cut-off.',
        },
        {
          title: 'Encrypted & Secure Transmission',
          desc: 'Transmissions take place exclusively over TLS 1.3 encrypted channels backed by secure authentication tokens.',
        },
      ],
      acceptBtn: 'Authorize and start dictating',
      rejectBtn: 'Decline',
    },
    ar: {
      title: 'ترخيص الإملاء الصوتي لمنصة TRADELINK',
      subtitle: 'امتثال تام لمعايير حماية المعطيات الشخصية (CNDP / GDPR)',
      intro:
        'لتسهيل ملء الاستمارات، ووصف المنتجات، والرسائل، والطلبات عبر الصوت، تطلب TRADELINK موافقتكم الصريحة لاستخدام الميكروفون.',
      points: [
        {
          title: 'عدم الاحتفاظ بأي تسجيل صوتي',
          desc: 'لا يتم حفظ أي تسجيل صوتي على خوادمنا. تُعالج البيانات الصوتية في الذاكرة الحية المؤقتة فقط وتُحذف فورياً بعد تحويلها لنص.',
        },
        {
          title: 'حد أقصى 60 ثانية للأمان',
          desc: 'كل جلسة إملاء محددة بدقة في 60 ثانية كحد أقصى مع إيقاف تلقائي للميكروفون.',
        },
        {
          title: 'تشفير تام وحماية متقدمة',
          desc: 'تتم كافة الاتصالات عبر بروتوكولات مشفرة آمنة TLS 1.3 مع رموز مصادقة معتمدة.',
        },
      ],
      acceptBtn: 'أوافق وأفعّل الإملاء الصوتي',
      rejectBtn: 'إلغاء',
    },
  };

  const t = texts[locale] || texts.fr;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-consent-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#0B3438] border border-slate-200 dark:border-teal-700/60 p-6 sm:p-7 shadow-2xl text-slate-800 dark:text-slate-100">
        {/* Bouton fermer */}
        <button
          type="button"
          onClick={onReject}
          aria-label="Fermer la boîte de dialogue"
          className="absolute top-4 inset-inline-end-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-teal-800/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* En-tête */}
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20 shrink-0">
            <Mic className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 id="voice-consent-title" className="text-lg font-bold text-slate-900 dark:text-white">
              {t.title}
            </h2>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>{t.subtitle}</span>
            </div>
          </div>
        </div>

        {/* Intro */}
        <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {t.intro}
        </p>

        {/* 3 Engagements */}
        <div className="mt-5 space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#082226] border border-slate-200/70 dark:border-teal-800/60 flex items-start gap-3">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {t.points[0].title}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                {t.points[0].desc}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#082226] border border-slate-200/70 dark:border-teal-800/60 flex items-start gap-3">
            <div className="p-1.5 rounded-xl bg-orange-500/10 text-[#E85D22] shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {t.points[1].title}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                {t.points[1].desc}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#082226] border border-slate-200/70 dark:border-teal-800/60 flex items-start gap-3">
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {t.points[2].title}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                {t.points[2].desc}
              </p>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onReject}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-teal-800/40 transition-colors"
          >
            {t.rejectBtn}
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#E85D22] hover:bg-[#D14B13] text-white shadow-md shadow-orange-950/20 transition-all"
          >
            <Mic className="w-4 h-4" />
            <span>{t.acceptBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
