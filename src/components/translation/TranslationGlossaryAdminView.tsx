// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  PlusCircle,
  Search,
  CheckCircle,
  Clock,
  Download,
  Trash2,
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { TradeGlossaryManager } from '../../services/tradeGlossary';
import type { TranslationGlossaryTerm } from '../../types';

interface TranslationGlossaryAdminViewProps {
  className?: string;
}

export const TranslationGlossaryAdminView: React.FC<TranslationGlossaryAdminViewProps> = ({
  className = '',
}) => {
  const { currentUser, locale, isRtl } = useApp();

  const [terms, setTerms] = useState<TranslationGlossaryTerm[]>(() => TradeGlossaryManager.getAllTerms());
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Formulaire d'ajout
  const [newCategory, setNewCategory] = useState<TranslationGlossaryTerm['category']>('COMMERCIAL');
  const [newTermFr, setNewTermFr] = useState<string>('');
  const [newTermEn, setNewTermEn] = useState<string>('');
  const [newTermAr, setNewTermAr] = useState<string>('');
  const [newContext, setNewContext] = useState<string>('');

  const t = (fr: string, en: string, ar: string) => {
    if (locale === 'ar') return ar;
    if (locale === 'en') return en;
    return fr;
  };

  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      if (selectedCategory !== 'ALL' && term.category !== selectedCategory) return false;
      if (selectedStatus !== 'ALL') {
        const termStatus = term.status || 'VALIDATED';
        if (termStatus !== selectedStatus) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          term.termKey.toLowerCase().includes(q) ||
          term.sourceTextFr.toLowerCase().includes(q) ||
          term.targetTextEn.toLowerCase().includes(q) ||
          term.targetTextAr.includes(searchQuery.trim()) ||
          (term.contextNotes && term.contextNotes.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [terms, selectedCategory, selectedStatus, searchQuery]);

  const handleValidateTerm = (id: string) => {
    try {
      const validator = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || currentUser?.email || 'Admin';
      const updated = TradeGlossaryManager.validateTerm(id, validator);
      setTerms((prev) => prev.map((t) => (t.id === id || t.termKey === id ? updated : t)));
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteTerm = (id: string) => {
    const success = TradeGlossaryManager.deleteTerm(id);
    if (success) {
      setTerms((prev) => prev.filter((t) => t.id !== id && t.termKey !== id));
    }
  };

  const handleCreateTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTermFr.trim() || !newTermEn.trim() || !newTermAr.trim()) return;

    const isAdmin = currentUser?.role === 'ADMIN';
    const newTerm = TradeGlossaryManager.addDynamicTerm({
      category: newCategory,
      termFr: newTermFr.trim(),
      termEn: newTermEn.trim(),
      termAr: newTermAr.trim(),
      context: newContext.trim() || undefined,
      status: isAdmin ? 'VALIDATED' : 'PENDING_REVIEW',
    });

    setTerms((prev) => [newTerm, ...prev]);
    setIsAddModalOpen(false);
    setNewTermFr('');
    setNewTermEn('');
    setNewTermAr('');
    setNewContext('');
  };

  const handleExportCsv = () => {
    const headers = ['Cle', 'Categorie', 'Francais', 'Anglais', 'Arabe', 'Statut', 'Notes'];
    const rows = filteredTerms.map((t) => [
      `"${t.termKey}"`,
      `"${t.category}"`,
      `"${t.sourceTextFr.replace(/"/g, '""')}"`,
      `"${t.targetTextEn.replace(/"/g, '""')}"`,
      `"${t.targetTextAr.replace(/"/g, '""')}"`,
      `"${t.status || 'VALIDATED'}"`,
      `"${(t.contextNotes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tradelink_glossary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className={`space-y-6 ${className}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* En-tête du Glossaire */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#071F22] border border-slate-200 dark:border-teal-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/10 text-[#E85D22]">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('Dictionnaire Terminologique & Glossaire Métier B2B', 'B2B Trade & Terminology Central Glossary', 'المعجم التجاري الموحد للمصطلحات المهنية')}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t(
              'Référentiel trilingue officiel (Incoterms, douane, logistique, comptabilité, finance séquestre) avec validation administrative.',
              'Official trilingual reference (Incoterms, customs, logistics, accounting, escrow finance) with admin governance.',
              'المرجع الثلاثي اللغات الرسمي (شروط التجارة، الجمارك، اللوجستيات، المحاسبة، والضمان المالي) المعتمد إدارياً.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-teal-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-teal-900/40 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t('Exporter CSV', 'Export CSV', 'تصدير CSV')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E85D22] to-amber-600 hover:brightness-110 shadow-md shadow-orange-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('Nouveau Terme Validé', 'Add Certified Term', 'إضافة مصطلح معتمد')}</span>
          </button>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#071F22] border border-slate-200 dark:border-teal-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute top-2.5 start-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('Rechercher un terme (FR, EN, AR)...', 'Search term (FR, EN, AR)...', 'بحث عن مصطلح...')}
            className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-teal-800 bg-slate-50 dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#E85D22] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500">{t('Catégorie :', 'Category:', 'الفئة:')}</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-teal-800 bg-slate-50 dark:bg-[#0A292C] text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="ALL">{t('Toutes les catégories', 'All Categories', 'كل الفئات')}</option>
              <option value="COMMERCIAL">{t('Commercial', 'Commercial', 'تجاري')}</option>
              <option value="LOGISTIQUE">{t('Logistique', 'Logistics', 'لوجستيات')}</option>
              <option value="FINANCE">{t('Finance & Séquestre', 'Finance & Escrow', 'مالية وضمان')}</option>
              <option value="DOUANE">{t('Douane', 'Customs', 'جمارك')}</option>
              <option value="INCOTERMS">{t('Incoterms', 'Incoterms', 'شروط التجارة')}</option>
              <option value="JURIDIQUE">{t('Juridique', 'Legal', 'قانوني')}</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500">{t('Statut :', 'Status:', 'الحالة:')}</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-teal-800 bg-slate-50 dark:bg-[#0A292C] text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="ALL">{t('Tous les statuts', 'All Statuses', 'كل الحالات')}</option>
              <option value="VALIDATED">{t('Validé Officiel', 'Validated', 'معتمد رسمياً')}</option>
              <option value="PENDING_REVIEW">{t('En attente de revue', 'Pending Review', 'بانتظار المراجعة')}</option>
              <option value="DRAFT">{t('Brouillon', 'Draft', 'مسودة')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des Termes du Glossaire */}
      <div className="overflow-x-auto rounded-2xl bg-white dark:bg-[#071F22] border border-slate-200 dark:border-teal-800 shadow-sm">
        <table className="w-full text-xs text-start">
          <thead className="bg-slate-100 dark:bg-[#0A292C] text-slate-700 dark:text-teal-200 border-b border-slate-200 dark:border-teal-800 font-semibold">
            <tr>
              <th className="p-3 text-start">Clé</th>
              <th className="p-3 text-start">Catégorie</th>
              <th className="p-3 text-start">🇫🇷 Français</th>
              <th className="p-3 text-start">🇬🇧 English</th>
              <th className="p-3 text-start">🇸🇦 العربية</th>
              <th className="p-3 text-start">Statut</th>
              <th className="p-3 text-end">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-teal-900/60">
            {filteredTerms.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  {t('Aucun terme correspondant trouvé.', 'No matching terms found.', 'لم يتم العثور على مصطلحات مطابقة.')}
                </td>
              </tr>
            ) : (
              filteredTerms.map((term) => {
                const isValidated = (term.status || 'VALIDATED') === 'VALIDATED';
                return (
                  <tr key={term.id || term.termKey} className="hover:bg-slate-50 dark:hover:bg-teal-950/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                      {term.termKey}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-teal-900/60 text-slate-700 dark:text-teal-200">
                        {term.category}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{term.sourceTextFr}</td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{term.targetTextEn}</td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-100 text-right" dir="rtl">
                      {term.targetTextAr}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isValidated
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {isValidated ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            <span>{t('Validé', 'Validated', 'معتمد')}</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>{t('En revue', 'In Review', 'قيد المراجعة')}</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-3 text-end space-x-2">
                      {!isValidated && currentUser?.role === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleValidateTerm(term.id || term.termKey)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                          title="Valider officiellement ce terme"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {currentUser?.role === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTerm(term.id || term.termKey)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                          title="Supprimer du glossaire"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal d'Ajout d'un Terme */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-[#071F22] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-teal-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#E85D22]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Ajouter un terme au glossaire officiel', 'Add Term to Official Glossary', 'إضافة مصطلح إلى المعجم الرسمي')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTerm} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t('Catégorie métier', 'Business Category', 'الفئة المهنية')}
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-teal-800 bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100"
                >
                  <option value="COMMERCIAL">Commercial (Achats, Ventes, Devis)</option>
                  <option value="LOGISTIQUE">Logistique (Fret, Transport, CMR)</option>
                  <option value="FINANCE">Finance (Facturation, Séquestre, Taxes)</option>
                  <option value="DOUANE">Douane (Dédouanement, Certificats EUR.1)</option>
                  <option value="INCOTERMS">Incoterms (CIF, FOB, DAP, DPU)</option>
                  <option value="JURIDIQUE">Juridique & Conformité KYC</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  🇫🇷 Terme en Français (Obligatoire)
                </label>
                <input
                  type="text"
                  required
                  value={newTermFr}
                  onChange={(e) => setNewTermFr(e.target.value)}
                  placeholder="Ex: Facture d'acompte"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-teal-800 bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  🇬🇧 Terme en Anglais (Obligatoire)
                </label>
                <input
                  type="text"
                  required
                  value={newTermEn}
                  onChange={(e) => setNewTermEn(e.target.value)}
                  placeholder="Ex: Advance payment invoice"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-teal-800 bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  🇸🇦 Terme en Arabe (Obligatoire)
                </label>
                <input
                  type="text"
                  required
                  dir="rtl"
                  value={newTermAr}
                  onChange={(e) => setNewTermAr(e.target.value)}
                  placeholder="مثال: فاتورة دفعة مقدمة"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-teal-800 bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t('Contexte & Notes d\'application', 'Context & Notes', 'السياق وملاحظات الاستخدام')}
                </label>
                <input
                  type="text"
                  value={newContext}
                  onChange={(e) => setNewContext(e.target.value)}
                  placeholder={t('Notes sur la juridiction ou l\'usage...', 'Notes on jurisdiction...', 'ملاحظات حول السياق...')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-teal-800 bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-teal-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-teal-900/40"
                >
                  {t('Annuler', 'Cancel', 'إلغاء')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E85D22] to-amber-600 hover:brightness-110 shadow-md shadow-orange-500/20"
                >
                  {t('Enregistrer le terme', 'Save Term', 'حفظ المصطلح')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
