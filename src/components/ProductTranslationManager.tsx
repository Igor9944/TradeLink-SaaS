// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — GESTIONNAIRE DE TRADUCTIONS DES FICHES PRODUITS (FOURNISSEUR)
// Permet au fournisseur de consulter, déclencher la traduction automatique par IA,
// corriger manuellement les textes et valider formellement les versions FR/EN/AR.
// ============================================================================

import React, { useState } from 'react';
import { Languages, CheckCircle, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { ProductItem, SupportedLocale } from '../types';
import { CentralTranslationService } from '../services/translationEngine';
import { useApp } from '../contexts/AppContext';

interface ProductTranslationManagerProps {
  product: ProductItem;
  onUpdateProduct: (updated: ProductItem) => void;
}

export const ProductTranslationManager: React.FC<ProductTranslationManagerProps> = ({
  product,
  onUpdateProduct,
}) => {
  const { notifyToast } = useApp();
  const [activeTab, setActiveTab] = useState<SupportedLocale>('en');
  const [isTranslating, setIsTranslating] = useState(false);

  // Valeurs locales éditables
  const [editedNames, setEditedNames] = useState<Record<SupportedLocale, string>>({
    fr: product.name.fr || '',
    en: product.name.en || '',
    ar: product.name.ar || '',
  });

  const [editedDescriptions, setEditedDescriptions] = useState<Record<SupportedLocale, string>>({
    fr: product.description.fr || '',
    en: product.description.en || '',
    ar: product.description.ar || '',
  });

  const [verifiedStatus, setVerifiedStatus] = useState<Record<SupportedLocale, boolean>>({
    fr: true, // Langue source toujours réputée vérifiée
    en: Boolean(product.name.en && product.description.en),
    ar: Boolean(product.name.ar && product.description.ar),
  });

  // Déclenchement de la traduction automatique IA pour la langue de l'onglet actif
  const handleAutoTranslate = async (targetLang: SupportedLocale) => {
    setIsTranslating(true);
    try {
      const { translatedProduct } = await CentralTranslationService.translateProduct(
        product,
        targetLang
      );

      setEditedNames((prev) => ({
        ...prev,
        [targetLang]: translatedProduct.name[targetLang] || '',
      }));

      setEditedDescriptions((prev) => ({
        ...prev,
        [targetLang]: translatedProduct.description[targetLang] || '',
      }));

      onUpdateProduct(translatedProduct);
      notifyToast(`Traduction IA vers l’${targetLang.toUpperCase()} effectuée avec succès`, 'success');
    } catch (err: any) {
      notifyToast(`Erreur lors de la traduction : ${err.message}`, 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSaveAndValidate = (lang: SupportedLocale) => {
    const updated: ProductItem = {
      ...product,
      name: {
        ...product.name,
        [lang]: editedNames[lang],
      },
      description: {
        ...product.description,
        [lang]: editedDescriptions[lang],
      },
    };

    setVerifiedStatus((prev) => ({ ...prev, [lang]: true }));
    onUpdateProduct(updated);
    notifyToast(`Traduction ${lang.toUpperCase()} validée et enregistrée avec succès`, 'success');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Gestionnaire Multilingue du Produit
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Les termes techniques (SKU : <code className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{product.sku}</code>, Incoterm : {product.incoterm}) sont rigoureusement préservés.
          </p>
        </div>

        {/* Onglets de sélection linguistique */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {(['fr', 'en', 'ar'] as SupportedLocale[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setActiveTab(lang)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === lang
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>{lang === 'fr' ? '🇫🇷 FR' : lang === 'en' ? '🇬🇧 EN' : '🇲🇦 AR'}</span>
              {verifiedStatus[lang] ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Formulaire d'édition pour la langue active */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Désignation Commerciale ({activeTab.toUpperCase()})
            </label>
            {activeTab !== 'fr' && (
              <button
                type="button"
                disabled={isTranslating}
                onClick={() => handleAutoTranslate(activeTab)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
                Traduire automatiquement par IA
              </button>
            )}
          </div>
          <input
            type="text"
            dir={activeTab === 'ar' ? 'rtl' : 'ltr'}
            value={editedNames[activeTab]}
            onChange={(e) =>
              setEditedNames((prev) => ({ ...prev, [activeTab]: e.target.value }))
            }
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder={`Nom du produit en ${activeTab.toUpperCase()}...`}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Description Technique & Commerciale ({activeTab.toUpperCase()})
          </label>
          <textarea
            rows={4}
            dir={activeTab === 'ar' ? 'rtl' : 'ltr'}
            value={editedDescriptions[activeTab]}
            onChange={(e) =>
              setEditedDescriptions((prev) => ({
                ...prev,
                [activeTab]: e.target.value,
              }))
            }
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
            placeholder={`Description du produit en ${activeTab.toUpperCase()}...`}
          />
        </div>

        {/* Pied d'action : Validation Fournisseur */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>
              {verifiedStatus[activeTab]
                ? `Version ${activeTab.toUpperCase()} vérifiée et certifiée par le fournisseur`
                : `Traduction en attente de vérification par le fournisseur`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveAndValidate(activeTab)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Valider la version {activeTab.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
