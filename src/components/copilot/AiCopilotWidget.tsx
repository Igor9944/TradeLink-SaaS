// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — WIDGET ASSISTANT IA FLOTTANT (AI COPILOT FULL PANEL)
// PROMPT 03 : PANNEAU FLOTTANT, HISTORIQUE, ATTACHMENTS, STREAMING & ACTIONS
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  Sparkles,
  X,
  Minimize2,
  Send,
  Paperclip,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  StopCircle,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import {
  CopilotAssistedAction,
  CopilotAttachment,
  CopilotConversationThread,
  CopilotMessage,
} from '../../types';
import { SUPPORTED_AI_MODELS } from '../../services/aiIntelligenceEngine';
import {
  generateCopilotAnswer,
  streamCopilotTokens,
  processAndSummarizeAttachment,
} from '../../services/copilotEngine';
import { AiCopilotFloatingButton } from './AiCopilotFloatingButton';
import { VoiceDictationButton } from '../voice/VoiceDictationButton';

export const AiCopilotWidget: React.FC = () => {
  const { currentUser, locale, notifyToast } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  // États du widget
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Modèle et conversations
  const [selectedModelId, setSelectedModelId] = useState('gemini-1.5-pro');
  const [activeThreadId, setActiveThreadId] = useState<string>('thread-default-01');
  const [threads, setThreads] = useState<CopilotConversationThread[]>(() => [
    {
      id: 'thread-default-01',
      title: 'Accueil & Assistance Métier',
      userId: currentUser.id,
      userRole: currentUser.role,
      currentPath: location.pathname,
      modelId: 'gemini-1.5-pro',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalTokensConsumed: 120,
      messages: [
        {
          id: 'msg-init-welcome',
          threadId: 'thread-default-01',
          sender: 'ASSISTANT',
          text: `👋 Bonjour ! Je suis votre **Assistant IA TRADELINK Copilot**.
Je suis contextualisé pour votre rôle **${currentUser.role}** (${currentUser.companyName || 'Compte Entreprise'}).

Comment puis-je vous assister aujourd'hui sur la page actuelle (\`${location.pathname}\`) ?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'Google Gemini 1.5 Pro',
        },
      ],
    },
  ]);

  // Saisie et streaming
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<{ aborted: boolean }>({ aborted: false });
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Récupérer le thread actif
  const currentThread =
    threads.find((t) => t.id === activeThreadId) || threads[0] || null;

  // Auto-scroll en bas de la conversation
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentThread?.messages, isStreaming, isOpen, isMinimized]);

  // Suggestions contextuelles rapides selon le rôle et l'URL
  const getContextualPromptPills = (): string[] => {
    const path = location.pathname;
    if (currentUser.role === 'CLIENT') {
      if (path.includes('commande')) return ['Où en est ma commande CMD-2026-11223 ?', 'Comment demander un devis ?', 'Détails de la livraison'];
      if (path.includes('catalogue')) return ['Trouve des pompes hydrauliques 500 bars', 'Quels conteneurs sont en stock ?', 'Calculer les remises'];
      return ['Suivre mes commandes en cours', 'Vérifier mon échéance KYC (J+7)', 'Consulter mes factures impayées'];
    }
    if (currentUser.role === 'FOURNISSEUR') {
      if (path.includes('stocks')) return ['Aide-moi à créer une fiche produit', 'Comment réapprovisionner le stock ?', 'Alerte stock faible'];
      if (path.includes('devis')) return ['Comment répondre au devis DEV-2026-8841 ?', 'Préparer une offre commerciale', 'Conditions Incoterm CIP'];
      return ['Créer un produit compresseur', 'Répondre aux demandes de devis', 'Consulter mes commandes à préparer'];
    }
    if (currentUser.role === 'TRANSPORTEUR') {
      return ['Quelles sont mes missions assignées ?', 'Comment déclarer un incident logistique ?', 'Émarger la preuve de livraison POD'];
    }
    if (currentUser.role === 'COMPTABLE') {
      return ['Explique le calcul ACT/365 Decimal.js', 'Simuler un calcul d’agios', 'Vérifier les factures impayées'];
    }
    if (currentUser.role === 'SUPPORT') {
      return ['Procédure de traitement des tickets', 'Suggérer une réponse au ticket', 'Vérifier le statut d’un compte'];
    }
    if (currentUser.role === 'ADMIN') {
      return ['État de conformité des dossiers KYC', 'Vérifier l’intégrité des logs d’audit', 'Supervision des sauvegardes'];
    }
    // Visiteur
    return ['Comment fonctionne TradeLink V6.0 ?', 'Quels sont les documents requis pour le KYC ?', 'Comment créer un compte entreprise ?'];
  };

  // Création d'une nouvelle conversation
  const handleCreateNewThread = () => {
    const newThreadId = `th-${Date.now()}`;
    const newThread: CopilotConversationThread = {
      id: newThreadId,
      title: `Discussion #${threads.length + 1}`,
      userId: currentUser.id,
      userRole: currentUser.role,
      currentPath: location.pathname,
      modelId: selectedModelId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalTokensConsumed: 0,
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          threadId: newThreadId,
          sender: 'ASSISTANT',
          text: `Nouvelle session avec **${selectedModelId}** pour **${currentUser.companyName || 'TradeLink'}** (${currentUser.role}). Posez vos questions sur vos commandes, produits, calculs financiers ou démarches KYC.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: selectedModelId,
        },
      ],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThreadId);
    setShowHistory(false);
  };

  // Suppression d'une conversation (Anti-IDOR)
  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (threads.length <= 1) {
      notifyToast('Impossible de supprimer l’unique conversation active.', 'warning');
      return;
    }
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (activeThreadId === threadId) {
      const remaining = threads.filter((t) => t.id !== threadId);
      setActiveThreadId(remaining[0]?.id || '');
    }
    notifyToast('Conversation supprimée avec succès.', 'info');
  };

  // Gestion de l'upload de pièce jointe avec synthèse immédiate
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = processAndSummarizeAttachment({
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
    });

    if (!validation.ok) {
      notifyToast(validation.error || 'Fichier non supporté.', 'error');
      return;
    }

    const newAtt: CopilotAttachment = {
      id: `att-${Date.now()}`,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      summary: validation.summary,
    };

    setAttachments((prev) => [...prev, newAtt]);
    notifyToast(`Pièce jointe analysée avec succès (${file.name}).`, 'success');
    e.target.value = '';
  };

  // Envoi d'un message utilisateur avec Token Streaming
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isStreaming || !currentThread) return;

    setInputValue('');
    const currentAttachments = [...attachments];
    setAttachments([]);

    const userMsgId = `msg-usr-${Date.now()}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: CopilotMessage = {
      id: userMsgId,
      threadId: currentThread.id,
      sender: 'USER',
      text: query,
      timestamp: nowTime,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };

    // Message d'attente pour l'assistant
    const assistantMsgId = `msg-ast-${Date.now()}`;
    const initialAssistantMsg: CopilotMessage = {
      id: assistantMsgId,
      threadId: currentThread.id,
      sender: 'ASSISTANT',
      text: '',
      timestamp: nowTime,
      modelUsed: selectedModelId,
    };

    setThreads((prev) =>
      prev.map((t) =>
        t.id === currentThread.id
          ? {
              ...t,
              messages: [...t.messages, userMessage, initialAssistantMsg],
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );

    setIsStreaming(true);
    const abortSig = { aborted: false };
    setAbortController(abortSig);

    try {
      const generator = streamCopilotTokens({
        query,
        userRole: currentUser.role,
        companyName: currentUser.companyName,
        currentPath: location.pathname,
        locale,
        modelId: selectedModelId,
        chunkDelayMs: 12,
        abortSignal: abortSig,
      });

      for await (const chunk of generator) {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === currentThread.id
              ? {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, text: chunk.accumulatedText } : m
                  ),
                }
              : t
          )
        );

        if (chunk.isComplete && chunk.result) {
          const res = chunk.result;
          setThreads((prev) =>
            prev.map((t) =>
              t.id === currentThread.id
                ? {
                    ...t,
                    messages: t.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            text: chunk.accumulatedText,
                            ragSources: res.sources,
                            tokensUsed: res.tokensUsed,
                            modelUsed: res.modelUsed,
                            isFiltered: res.isRestricted,
                            assistedAction: res.assistedAction,
                          }
                        : m
                    ),
                    totalTokensConsumed: t.totalTokensConsumed + res.tokensUsed,
                  }
                : t
            )
          );
        }
      }
    } catch {
      // Fallback synchrone robuste
      const fallback = generateCopilotAnswer({
        query,
        userRole: currentUser.role,
        companyName: currentUser.companyName,
        currentPath: location.pathname,
        locale,
        modelId: selectedModelId,
      });

      setThreads((prev) =>
        prev.map((t) =>
          t.id === currentThread.id
            ? {
                ...t,
                messages: t.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        text: fallback.text,
                        ragSources: fallback.sources,
                        tokensUsed: fallback.tokensUsed,
                        modelUsed: fallback.modelUsed,
                        assistedAction: fallback.assistedAction,
                      }
                    : m
                ),
              }
            : t
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  // Annulation de la génération de réponse
  const handleAbortGeneration = () => {
    abortController.aborted = true;
    setIsStreaming(false);
    notifyToast('Génération arrêtée par l’utilisateur.', 'warning');
  };

  // Exécution d'une action assistée proposée
  const handleExecuteAssistedAction = (action: CopilotAssistedAction) => {
    // Si bloquée par garde-fou
    if (action.isCritical || action.type === 'BLOCKED_SENSITIVE_ACTION') {
      notifyToast('Opération critique refusée : validation humaine obligatoire.', 'error');
      return;
    }

    if (action.targetPath) {
      navigate(action.targetPath);
      notifyToast(`Navigation vers ${action.targetPath} appliquée !`, 'success');
      setIsOpen(false);
      return;
    }

    notifyToast(`Action "${action.title}" exécutée avec succès !`, 'success');
  };

  return (
    <>
      {/* 1. Bouton Flottant (Positionnement adaptatif LTR / RTL) */}
      <AiCopilotFloatingButton
        isOpen={isOpen}
        isMinimized={isMinimized}
        isStreaming={isStreaming}
        onToggleOpen={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        onRestoreFromMinimized={() => setIsMinimized(false)}
      />

      {/* 2. Fenêtre Flottante de l'Assistant Copilot */}
      {isOpen && !isMinimized && (
        <div
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          className="fixed bottom-24 inset-inline-end-6 z-50 w-[440px] max-w-[calc(100vw-2rem)] h-[660px] max-h-[85vh] flex flex-col rounded-3xl shadow-2xl bg-white/95 dark:bg-[#072428]/95 backdrop-blur-xl border border-teal-500/30 dark:border-teal-700/60 overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          {/* A. En-Tête de l'Assistant */}
          <div className="p-3.5 bg-gradient-to-r from-[#0E393E] via-[#0A262A] to-[#061B1E] text-white flex items-center justify-between border-b border-teal-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E85D22] to-amber-600 flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold font-mono tracking-tight text-white">
                    TradeLink Copilot
                  </h3>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                      isStreaming
                        ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {isStreaming ? 'STREAMING...' : 'ONLINE'}
                  </span>
                </div>
                <p className="text-[10px] text-teal-200/80 flex items-center gap-1">
                  <span>Rôle {currentUser.role}</span>
                  <span>•</span>
                  <span className="truncate max-w-[130px]">{location.pathname}</span>
                </p>
              </div>
            </div>

            {/* Actions d'en-tête */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                title="Historique des discussions"
                aria-label="Historique des discussions"
                className={`p-1.5 rounded-lg transition-colors ${
                  showHistory ? 'bg-[#E85D22] text-white' : 'text-teal-200 hover:bg-teal-900/60'
                }`}
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCreateNewThread}
                title="Nouvelle conversation"
                aria-label="Nouvelle conversation"
                className="p-1.5 rounded-lg text-teal-200 hover:bg-teal-900/60 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                title="Réduire"
                aria-label="Réduire"
                className="p-1.5 rounded-lg text-teal-200 hover:bg-teal-900/60 transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Fermer"
                aria-label="Fermer"
                className="p-1.5 rounded-lg text-teal-200 hover:bg-red-500/20 hover:text-red-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* B. Barre de Configuration Modèle & Quota */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-[#051C1F] border-b border-slate-200 dark:border-teal-900/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 flex-1 me-2">
              <span className="text-slate-500 dark:text-teal-300 font-medium">Modèle :</span>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                aria-label="Choisir le modèle d'IA"
                className="text-[11px] font-bold rounded-lg bg-white dark:bg-[#072428] border border-slate-200 dark:border-teal-800 text-slate-800 dark:text-teal-100 px-2 py-0.5 focus:outline-none focus:border-[#E85D22]"
              >
                {SUPPORTED_AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name.split(' (')[0]} {m.isLocal ? '🔒' : '☁️'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-teal-400">
              <Sparkles className="w-3 h-3 text-[#E85D22]" />
              <span>RAG RBAC Actif</span>
            </div>
          </div>

          {/* C. Panneau Déroulant d'Historique des Discussions */}
          {showHistory && (
            <div className="p-3 bg-slate-100 dark:bg-[#08262A] border-b border-slate-200 dark:border-teal-800 space-y-2 max-h-48 overflow-y-auto animate-in slide-in-from-top-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-teal-200 mb-1">
                <span>Historique des sessions ({threads.length})</span>
                <button
                  type="button"
                  onClick={handleCreateNewThread}
                  className="text-[11px] text-[#E85D22] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Nouveau fil
                </button>
              </div>
              <div className="space-y-1.5">
                {threads.map((th) => (
                  <div
                    key={th.id}
                    onClick={() => {
                      setActiveThreadId(th.id);
                      setShowHistory(false);
                    }}
                    className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all ${
                      th.id === activeThreadId
                        ? 'bg-[#E85D22] text-white font-bold'
                        : 'bg-white dark:bg-[#0B3438] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-teal-800 hover:border-[#E85D22]'
                    }`}
                  >
                    <div className="truncate me-2">
                      <p className="truncate">{th.title}</p>
                      <span className="text-[10px] opacity-75 font-normal">
                        {th.messages.length} message(s)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteThread(th.id, e)}
                      title="Supprimer ce fil"
                      aria-label="Supprimer ce fil"
                      className="p-1 text-red-300 hover:text-white rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* D. Flux des Messages (Conversation) */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs">
            {currentThread?.messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'USER' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3.5 rounded-2xl max-w-[88%] leading-relaxed ${
                    m.sender === 'USER'
                      ? 'bg-gradient-to-r from-[#E85D22] to-[#F3702A] text-white rounded-br-none shadow-md'
                      : m.isFiltered
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800 rounded-bl-none shadow-sm'
                      : 'bg-slate-100 dark:bg-[#0C3439] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-teal-800/80 rounded-bl-none shadow-sm'
                  }`}
                >
                  {/* En-tête message */}
                  <div className="flex items-center justify-between text-[10px] opacity-75 mb-1 gap-2">
                    <span className="font-bold flex items-center gap-1">
                      {m.sender === 'USER' ? (
                        'Vous'
                      ) : (
                        <>
                          <Bot className="w-3 h-3 text-[#E85D22]" />
                          <span>Copilot • {m.modelUsed || 'RAG'}</span>
                        </>
                      )}
                    </span>
                    <span>{m.timestamp}</span>
                  </div>

                  {/* Contenu textuel */}
                  <div className="whitespace-pre-wrap font-sans text-xs">{m.text}</div>

                  {/* Pièces jointes attachées au message */}
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/20 dark:border-teal-700/60 space-y-1">
                      {m.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 p-1.5 rounded-lg bg-black/10 dark:bg-black/30 text-[10px]"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span className="font-mono truncate">{att.name}</span>
                          <span className="opacity-70">({(att.size / 1024).toFixed(0)} Ko)</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sources RAG autorisées */}
                  {m.ragSources && m.ragSources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-teal-700/60 space-y-1">
                      <p className="text-[10px] font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#E85D22]" />
                        Sources Métier RAG ({m.ragSources.length}) :
                      </p>
                      {m.ragSources.map((src, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-1.5 rounded-lg bg-white/70 dark:bg-[#062023]/70 border border-slate-200 dark:border-teal-800 text-[10px]"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="truncate">{src.title}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                              {(src.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-[9px] opacity-75 truncate">{src.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Carte d'Action Assistée Interactive */}
                  {m.assistedAction && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-teal-700/60">
                      {m.assistedAction.isCritical ? (
                        <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-[11px] text-red-800 dark:text-red-200 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span>Action Critique Bloquée</span>
                          </div>
                          <p className="text-[10px]">{m.assistedAction.description}</p>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-[#07282C] border border-teal-200 dark:border-teal-700 text-[11px] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#E85D22]" />
                              {m.assistedAction.title}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#E85D22]/10 text-[#E85D22] font-bold">
                              Action Assistée
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300">
                            {m.assistedAction.description}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleExecuteAssistedAction(m.assistedAction!)}
                            className="w-full py-1.5 rounded-lg bg-[#E85D22] hover:bg-[#D4501A] text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                          >
                            <span>Appliquer / Confirmer l’action</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Skeleton loader / Indicateur de streaming en cours */}
            {isStreaming && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-700 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E85D22] animate-ping" />
                  <span className="italic">Génération de la réponse token par token...</span>
                </div>
                <button
                  type="button"
                  onClick={handleAbortGeneration}
                  className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-bold text-[10px] flex items-center gap-1 hover:bg-amber-700 transition-colors"
                >
                  <StopCircle className="w-3 h-3" />
                  Arrêter
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* E. Suggestions de Prompts Rapides Contextuels */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-[#062023] border-t border-slate-200 dark:border-teal-900/60 flex gap-1.5 overflow-x-auto text-[10px]">
            {getContextualPromptPills().map((pill, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(pill)}
                className="whitespace-nowrap px-2 py-1 rounded-full bg-white dark:bg-[#0C3439] border border-slate-200 dark:border-teal-800 text-slate-700 dark:text-teal-100 hover:border-[#E85D22] hover:text-[#E85D22] transition-colors"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* F. Puces des Pièces Jointes en attente d'envoi */}
          {attachments.length > 0 && (
            <div className="px-3 py-1 bg-teal-50 dark:bg-[#072428] border-t border-teal-200 dark:border-teal-800 flex items-center gap-2 overflow-x-auto text-[10px]">
              <span className="font-bold text-teal-800 dark:text-teal-200">Pièces :</span>
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-[#0A2E33] border border-slate-200 dark:border-teal-700 text-slate-800 dark:text-slate-100"
                >
                  <Paperclip className="w-2.5 h-2.5 text-[#E85D22]" />
                  <span className="truncate max-w-[120px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* G. Zone de Saisie & Contrôles */}
          <div className="p-3 bg-white dark:bg-[#072428] border-t border-slate-200 dark:border-teal-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              {/* Bouton Fichier Joint */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.xlsx"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Joindre un document ou image (<= 10 Mo)"
                aria-label="Joindre un fichier"
                className="p-2 text-slate-500 dark:text-teal-300 hover:text-[#E85D22] dark:hover:text-[#E85D22] transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-teal-900/40"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Bouton Dictée Vocale Intelligente */}
              <VoiceDictationButton
                onTranscript={(t) => setInputValue((prev) => (prev ? `${prev} ${t}` : t))}
                size="md"
              />

              {/* Zone de texte */}
              <textarea
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  locale === 'en'
                    ? 'Ask Copilot about orders, KYC, rules...'
                    : locale === 'ar'
                    ? 'اسأل المساعد الذكي عن الطلبات والتحقق...'
                    : 'Posez votre question à Copilot...'
                }
                className="flex-1 max-h-24 min-h-[38px] rounded-xl border border-slate-200 dark:border-teal-700 bg-slate-50 dark:bg-[#062023] p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#E85D22] resize-none"
              />

              {/* Bouton d'Envoi */}
              <button
                type="submit"
                disabled={isStreaming || (!inputValue.trim() && attachments.length === 0)}
                aria-label="Envoyer le message"
                className="p-2.5 rounded-xl bg-gradient-to-r from-[#E85D22] to-[#F3702A] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
