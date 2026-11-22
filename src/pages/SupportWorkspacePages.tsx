// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — ESPACE SUPPORT & CENTRE D'ASSISTANCE CLIENTÈLE (PAGES 69 À 73)
// 8 PILIERS COMPLETS DU CAHIER DES CHARGES :
// 1. Tableau de bord (Tickets ouverts, en attente, urgents, résolus, temps de réponse, SLA)
// 2. Gestion des tickets (Création, attribution, catégories, statuts, pièces jointes, clôture, réouverture)
// 3. Gestion des utilisateurs (Consultation autorisée, historique tickets/échanges, blocage mutations sensibles)
// 4. Communication (Messagerie interne, réponses usagers, modèles canned responses, notifications)
// 5. Base de connaissances (FAQ, guides, tutoriels, SOP internes avec recherche documentaire)
// 6. Assistant IA (Classification automatique, détection urgence, résumé conversation, traduction FR/EN/AR)
// 7. Room Live Support (Création salle d'assistance en direct, invitation usager, partage d'écran)
// 8. Paramètres Agent (Profil agent N1/N2/N3, statuts disponibilité, notifications, langues, sécurité)
// SÉCURITÉ : Principe du moindre privilège, aucune modification des données sensibles sans habilitation.
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Headphones,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  Lock,
  ShieldCheck,
  FileText,
  Video,
  Sparkles,
  Plus,
  RefreshCw,
  BookOpen,
  Tag,
  ThumbsUp,
  Paperclip,
  Download,
  Phone,
  Mail,
  Languages,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  SearchBar,
} from '../components/ui/DesignSystem';
import { VoiceDictationButton } from '../components/voice/VoiceDictationButton';
import { ThemeMode } from '../types';
import {
  SupportEngine,
  SupportTicketRecord,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
  SupportMessageRecord,
  INITIAL_SUPPORT_TICKETS,
  KNOWLEDGE_BASE_ARTICLES,
  CANNED_RESPONSES,
  SUPPORT_AGENTS,
  KnowledgeArticleRecord,
} from '../services/supportEngine';
import { getSecureRandomInt } from '../services/securityCrypto';

export const SupportWorkspacePage: React.FC<{
  section:
    | 'dashboard'
    | 'tickets'
    | 'ticket-detail'
    | 'utilisateurs'
    | 'communication'
    | 'base-connaissances'
    | 'assistant-ia'
    | 'room-live'
    | 'parametres';
}> = ({ section }) => {
  const {
    locale,
    setLocale,
    theme,
    setTheme,
    currentUser,
    createRoomLive,
    notifyToast,
  } = useApp();

  const params = useParams();

  // --------------------------------------------------------------------------
  // ÉTATS GLOBAUX DU CENTRE DE SUPPORT
  // --------------------------------------------------------------------------
  const [tickets, setTickets] = useState<SupportTicketRecord[]>(INITIAL_SUPPORT_TICKETS);
  const [articles, setArticles] = useState<KnowledgeArticleRecord[]>(KNOWLEDGE_BASE_ARTICLES);
  const [agents] = useState(SUPPORT_AGENTS);

  // Filtres tickets
  const [ticketSearch, setTicketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SupportTicketStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | SupportTicketPriority>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | SupportTicketCategory>('ALL');

  // Sélection du ticket actif (si détail)
  const currentTicketId = params.id || 'TCK-2026-409';
  const selectedTicket = useMemo(() => {
    return tickets.find((t) => t.id === currentTicketId) || tickets[0];
  }, [tickets, currentTicketId]);

  // État rédaction message
  const [replyContent, setReplyContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [selectedCannedId, setSelectedCannedId] = useState('');

  // Création de ticket modal / formulaire
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<SupportTicketCategory>('LOGISTIQUE');
  const [newPriority, setNewPriority] = useState<SupportTicketPriority>('MEDIUM');
  const [newRequesterCompany, setNewRequesterCompany] = useState('Atlas Import & Distribution S.A.');
  const [newRequesterEmail, setNewRequesterEmail] = useState('achats@atlas-import-retail.ma');

  // Recherche utilisateurs
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<string | null>('usr-client-01');

  // Base de connaissances recherche
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [kbCategoryFilter, setKbCategoryFilter] = useState<'ALL' | 'FAQ' | 'GUIDE' | 'TUTORIEL' | 'PROCEDURE_INTERNE'>('ALL');

  // Assistant IA onglet
  const [aiTranslateInput, setAiTranslateInput] = useState('');
  const [aiTargetLang, setAiTargetLang] = useState<'fr' | 'en' | 'ar'>('en');
  const [aiTranslatedResult, setAiTranslatedResult] = useState('');

  // Paramètres Agent
  const [agentStatus, setAgentStatus] = useState<'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE'>('ONLINE');
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);

  // Modal sécurité moindre privilège
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [forbiddenActionName, setForbiddenActionName] = useState('');

  // --------------------------------------------------------------------------
  // MÉTRIQUES DU DASHBOARD SUPPORT
  // --------------------------------------------------------------------------
  const metrics = useMemo(() => {
    return SupportEngine.computeSupportMetrics(tickets);
  }, [tickets]);

  // Filtrage dynamique des tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        t.id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.subject.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.requesterCompany.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.requesterName.toLowerCase().includes(ticketSearch.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
      const matchCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
      return matchSearch && matchStatus && matchPriority && matchCategory;
    });
  }, [tickets, ticketSearch, statusFilter, priorityFilter, categoryFilter]);

  // Filtrage base de connaissances
  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      const matchSearch =
        a.title.toLowerCase().includes(kbSearchQuery.toLowerCase()) ||
        a.summary.toLowerCase().includes(kbSearchQuery.toLowerCase()) ||
        a.tags.some((tag) => tag.toLowerCase().includes(kbSearchQuery.toLowerCase()));
      const matchCat = kbCategoryFilter === 'ALL' || a.category === kbCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [articles, kbSearchQuery, kbCategoryFilter]);

  // --------------------------------------------------------------------------
  // ACTIONS GESTION DES TICKETS
  // --------------------------------------------------------------------------

  // Soumission nouveau ticket
  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) {
      notifyToast('Veuillez renseigner un sujet et une description pour le ticket.', 'warning');
      return;
    }

    // Classification IA automatique
    const aiAnalysis = SupportEngine.classifyTicketWithAi(newSubject, newDescription);

    const newTicket: SupportTicketRecord = {
      id: `TCK-2026-${getSecureRandomInt(450, 850)}`,
      subject: newSubject,
      description: newDescription,
      category: newCategory || aiAnalysis.suggestedCategory,
      priority: newPriority || aiAnalysis.suggestedPriority,
      status: 'OPEN',
      requesterId: 'usr-client-01',
      requesterName: 'Youssef Berrada',
      requesterCompany: newRequesterCompany,
      requesterEmail: newRequesterEmail,
      requesterRole: 'CLIENT',
      assignedAgentId: 'usr-supp-agent-01',
      assignedAgentName: 'Amine Khelifi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      slaDeadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      urgencyScore: aiAnalysis.urgencyScore,
      messages: [
        {
          id: `msg-${Date.now()}`,
          ticketId: `TCK-2026-new`,
          authorId: 'usr-client-01',
          authorName: `${newRequesterCompany} (${newRequesterEmail})`,
          authorRole: 'CLIENT',
          content: newDescription,
          createdAt: new Date().toISOString(),
          isInternal: false,
        },
      ],
      aiClassification: aiAnalysis,
    };

    setTickets((prev) => [newTicket, ...prev]);
    setCreateTicketOpen(false);
    setNewSubject('');
    setNewDescription('');
    notifyToast(
      `Nouveau ticket ${newTicket.id} créé avec succès (Urgence IA : ${aiAnalysis.urgencyScore}/100).`,
      'success'
    );
  };

  // Envoi d'un message dans le fil de discussion
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    const newMsg: SupportMessageRecord = {
      id: `msg-${Date.now()}`,
      ticketId: selectedTicket.id,
      authorId: currentUser.id || 'usr-supp-agent-01',
      authorName: `${currentUser.firstName} ${currentUser.lastName} (Support)`,
      authorRole: 'SUPPORT',
      content: replyContent,
      createdAt: new Date().toISOString(),
      isInternal: isInternalNote,
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === selectedTicket.id) {
          return {
            ...t,
            updatedAt: new Date().toISOString(),
            status: isInternalNote ? t.status : 'IN_PROGRESS',
            messages: [...t.messages, newMsg],
          };
        }
        return t;
      })
    );

    setReplyContent('');
    setSelectedCannedId('');
    notifyToast(
      isInternalNote
        ? 'Note interne privée enregistrée (non visible par le client).'
        : 'Réponse transmise avec succès au demandeur et tracée au dossier.',
      'success'
    );
  };

  // Insertion d'un modèle Canned Response
  const handleApplyCannedResponse = (templateId: string) => {
    const tmpl = CANNED_RESPONSES.find((c) => c.id === templateId);
    if (!tmpl) return;
    const txt = locale === 'ar' ? tmpl.content.ar : locale === 'en' ? tmpl.content.en : tmpl.content.fr;
    setReplyContent(txt);
    setSelectedCannedId(templateId);
    notifyToast(`Modèle "${tmpl.title}" appliqué dans le champ de réponse.`, 'info');
  };

  // Suggestion de réponse IA
  const handleApplyAiSuggestedReply = () => {
    const suggestion = SupportEngine.generateAiSuggestedReply(selectedTicket, articles);
    setReplyContent(suggestion);
    setIsInternalNote(false);
    notifyToast('Réponse IA contextualisée pré-remplie. Veuillez la vérifier avant envoi.', 'info');
  };

  // Résolution et clôture
  const handleResolveTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: 'RESOLVED',
            updatedAt: new Date().toISOString(),
            resolutionNotes: 'Problème traité avec succès par l’agent support avec confirmation du demandeur.',
          };
        }
        return t;
      })
    );
    notifyToast(`Le ticket ${ticketId} a été marqué comme Résolu avec succès.`, 'success');
  };

  // Réouverture d'un ticket résolu
  const handleReopenTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: 'OPEN',
            updatedAt: new Date().toISOString(),
            reopenedReason: 'Demande complémentaire reçue de la part de l’usager.',
          };
        }
        return t;
      })
    );
    notifyToast(`Le ticket ${ticketId} a été réouvert pour traitement complémentaire.`, 'info');
  };

  // Attribution à un autre agent
  const handleReassignTicket = (ticketId: string, agentId: string) => {
    const ag = agents.find((a) => a.id === agentId);
    if (!ag) return;
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            assignedAgentId: ag.id,
            assignedAgentName: ag.name,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
    notifyToast(`Ticket réattribué à l’agent ${ag.name} (${ag.level}).`, 'info');
  };

  // Escalade Room Live pour assistance visuelle
  const handleCreateSupportRoomLive = () => {
    createRoomLive(
      `Assistance Support Direct — ${selectedTicket.id} (${selectedTicket.requesterCompany})`,
      new Date().toISOString().slice(0, 16).replace('T', ' ')
    );
    notifyToast(
      `Salle Room Live d’assistance créée avec succès pour le ticket ${selectedTicket.id}. Lien transmis au client.`,
      'success'
    );
  };

  // Déclenchement d'un blocage de sécurité (moindre privilège)
  const triggerSecurityBlock = (actionName: string) => {
    setForbiddenActionName(actionName);
    setSecurityModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* BANDEAU SUPÉRIEUR ESPACE SUPPORT & ASSISTANCE TECHNIQUE B2B           */}
      {/* ===================================================================== */}
      <div className="rounded-3xl bg-white dark:bg-[#0B2D31] p-5 border border-slate-200 dark:border-teal-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-orange-500/10 text-[#E85D22]">
            <Headphones className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="orange">ESPACE SUPPORT CLIENTÈLE & ASSISTANCE B2B V6.0</Badge>
              <Badge variant={agentStatus === 'ONLINE' ? 'success' : agentStatus === 'BUSY' ? 'warning' : 'neutral'}>
                AGENT {agentStatus === 'ONLINE' ? 'EN LIGNE' : agentStatus === 'BUSY' ? 'OCCUPÉ' : 'ABSENT'}
              </Badge>
            </div>
            <h1 className="text-xl font-extrabold mt-1 text-slate-900 dark:text-white">
              Centre d'Assistance & Gestion des Tickets
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Agent Référent : {currentUser.firstName} {currentUser.lastName} • SLA Moyen : {metrics.avgResponseTime} min • Taux Respect : {metrics.slaCompliancePct}%
            </p>
          </div>
        </div>

        {/* Navigation vers les 8 piliers du Support */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { to: '/support/dashboard', label: '1. Dashboard' },
            { to: '/support/tickets', label: '2. Tickets' },
            { to: `/support/tickets/${selectedTicket.id}`, label: 'Détail Ticket' },
            { to: '/support/utilisateurs', label: '3. Utilisateurs' },
            { to: '/support/communication', label: '4. Communication' },
            { to: '/support/base-connaissances', label: '5. Base Savoir' },
            { to: '/support/ia', label: '6. Assistant IA' },
            { to: '/support/room-live', label: '7. Room Live' },
            { to: '/support/parametres', label: '8. Paramètres' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                (section === 'dashboard' && item.to.includes('dashboard')) ||
                (section === 'tickets' && item.to === '/support/tickets') ||
                (section === 'ticket-detail' && item.to.includes(selectedTicket.id)) ||
                (section === 'utilisateurs' && item.to.includes('utilisateurs')) ||
                (section === 'communication' && item.to.includes('communication')) ||
                (section === 'base-connaissances' && item.to.includes('base-connaissances')) ||
                (section === 'assistant-ia' && item.to.includes('ia')) ||
                (section === 'room-live' && item.to.includes('room-live')) ||
                (section === 'parametres' && item.to.includes('parametres'))
                  ? 'bg-[#E85D22] text-white shadow-md'
                  : 'bg-slate-100 dark:bg-teal-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-teal-900/80'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. TABLEAU DE BORD SUPPORT (/support/dashboard)                       */}
      {/* ===================================================================== */}
      {section === 'dashboard' && (
        <div className="space-y-6">
          {/* Métriques KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title="Tickets Ouverts" subtitle="À traiter immédiatement">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-3xl font-black text-blue-600">{metrics.open}</span>
                  <p className="text-xs text-slate-400 mt-1">Nouvelles demandes</p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600">
                  <MessageSquare className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card title="Tickets en Cours" subtitle="En cours d'investigation">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-3xl font-black text-amber-500">{metrics.inProgress}</span>
                  <p className="text-xs text-slate-400 mt-1">{metrics.waiting} en attente usager</p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card title="Demandes Prioritaires" subtitle="Priorité Haute ou Urgente">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-3xl font-black text-rose-600">{metrics.urgent + metrics.high}</span>
                  <p className="text-xs text-slate-400 mt-1">{metrics.urgent} critique(s) active(s)</p>
                </div>
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </Card>

            <Card title="Tickets Résolus" subtitle="Clôturés avec satisfaction">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-3xl font-black text-emerald-600">{metrics.resolved}</span>
                  <p className="text-xs text-slate-400 mt-1">98.4% satisfaction</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </div>

          {/* Grille : Activité des Agents & Alertes SLA */}
          <div className="grid lg:grid-cols-2 gap-6 text-xs">
            {/* Charge et activité de l'équipe support */}
            <Card title="Activité des Agents Support" subtitle="Statuts de disponibilité et volume traité aujourd'hui">
              <div className="space-y-3">
                {agents.map((ag) => (
                  <div
                    key={ag.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-600 font-extrabold flex items-center justify-center text-sm">
                          {ag.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#071E22] ${
                            ag.status === 'ONLINE'
                              ? 'bg-emerald-500'
                              : ag.status === 'BUSY'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          }`}
                        />
                      </div>
                      <div>
                        <strong className="text-slate-900 dark:text-white block">
                          {ag.name} ({ag.level})
                        </strong>
                        <span className="text-[11px] text-slate-400">
                          {ag.specialties.join(' • ')}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-sm text-[#E85D22] block">
                        {ag.activeTicketsCount} en cours
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {ag.resolvedTodayCount} résolus aujourd'hui • {ag.avgResponseMinutes} min moy.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Alertes système & Détection d'urgences */}
            <Card title="Alertes Opérationnelles & Respect SLA" subtitle="Détection proactive des risques de rupture">
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-rose-900 dark:text-rose-200 block">
                      Alerte Thermique Critique — Remorque FR-772-AA (+7.4°C)
                    </strong>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                      Sonde BLE n°4 sur trajet Madrid-Tanger. Le groupe froid a été relancé, surveillance active requise.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Link to="/support/tickets/TCK-2026-415">
                        <Button size="sm" variant="danger">
                          Ouvrir Ticket #TCK-2026-415
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-900 dark:text-amber-200 block">
                      Échéance SLA Approchante — Certificat GDP Casablanca CMN
                    </strong>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                      Le transitaire douane attend la confirmation finale avant 11h30 pour libération du conteneur.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Link to="/support/tickets/TCK-2026-409">
                        <Button size="sm" variant="secondary">
                          Consulter Ticket #TCK-2026-409
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-900 dark:text-emerald-200 block">
                      Plateforme & API Stable (99.98% Disponibilité)
                    </strong>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                      Passerelle Stripe opérationnelle, tunnels Room Live WebRTC actifs sans paquet perdu.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Liste des demandes récentes */}
          <Card
            title="Dernières Demandes d'Assistance Reçues"
            subtitle="Vue consolidée des tickets récents nécessitant attention"
            action={
              <Button size="sm" variant="primary" onClick={() => setCreateTicketOpen(true)}>
                <Plus className="w-4 h-4" /> Créer un Ticket
              </Button>
            }
          >
            <DataTable
              caption="Demandes récentes"
              keyExtractor={(t) => t.id}
              data={tickets.slice(0, 5)}
              columns={[
                {
                  key: 'id',
                  header: 'N° Ticket & Date',
                  isRowHeader: true,
                  render: (t) => (
                    <div>
                      <Link to={`/support/tickets/${t.id}`} className="font-mono font-bold text-[#E85D22] hover:underline">
                        {t.id}
                      </Link>
                      <p className="text-[10px] text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString('fr-FR')} {new Date(t.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'subject',
                  header: 'Sujet & Problème',
                  render: (t) => (
                    <div className="max-w-md">
                      <strong className="text-slate-900 dark:text-white block truncate">{t.subject}</strong>
                      <span className="text-[11px] text-slate-400 truncate block">{t.description}</span>
                    </div>
                  ),
                },
                {
                  key: 'requester',
                  header: 'Demandeur',
                  render: (t) => (
                    <div>
                      <strong className="text-slate-900 dark:text-white block">{t.requesterCompany}</strong>
                      <span className="text-[11px] text-slate-400">{t.requesterName} ({t.requesterRole})</span>
                    </div>
                  ),
                },
                {
                  key: 'category',
                  header: 'Catégorie',
                  render: (t) => <Badge variant="info">{t.category}</Badge>,
                },
                {
                  key: 'priority',
                  header: 'Priorité',
                  render: (t) => (
                    <Badge variant={t.priority === 'URGENT' ? 'danger' : t.priority === 'HIGH' ? 'warning' : 'neutral'}>
                      {t.priority}
                    </Badge>
                  ),
                },
                {
                  key: 'status',
                  header: 'Statut',
                  render: (t) => (
                    <Badge variant={t.status === 'RESOLVED' ? 'success' : t.status === 'IN_PROGRESS' ? 'info' : 'warning'}>
                      {t.status}
                    </Badge>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (t) => (
                    <div className="flex gap-2">
                      <Link to={`/support/tickets/${t.id}`}>
                        <Button size="sm" variant="secondary">
                          Traiter
                        </Button>
                      </Link>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. GESTION DES TICKETS (/support/tickets)                             */}
      {/* ===================================================================== */}
      {section === 'tickets' && (
        <Card
          title="Registre Global des Tickets d'Assistance & SLA"
          subtitle="Suivi, filtrage multicritères, réattribution et pilotage des délais de prise en charge."
          action={
            <Button size="sm" variant="primary" onClick={() => setCreateTicketOpen(true)}>
              <Plus className="w-4 h-4" /> Nouveau Ticket Support
            </Button>
          }
        >
          {/* Barre de recherche et filtres */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="w-full sm:w-80">
              <SearchBar
                value={ticketSearch}
                onChange={setTicketSearch}
                placeholder="Rechercher par N° ticket, sujet, demandeur..."
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-bold"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="OPEN">OPEN (Nouveaux)</option>
                <option value="IN_PROGRESS">IN_PROGRESS (En cours)</option>
                <option value="WAITING_USER">WAITING_USER (Attente usager)</option>
                <option value="RESOLVED">RESOLVED (Résolus)</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-bold"
              >
                <option value="ALL">Toutes les priorités</option>
                <option value="URGENT">URGENT (Critique)</option>
                <option value="HIGH">HIGH (Haute)</option>
                <option value="MEDIUM">MEDIUM (Moyenne)</option>
                <option value="LOW">LOW (Basse)</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-bold"
              >
                <option value="ALL">Toutes catégories</option>
                <option value="DOUANE">DOUANE</option>
                <option value="LOGISTIQUE">LOGISTIQUE</option>
                <option value="FACTURATION">FACTURATION</option>
                <option value="TECHNIQUE">TECHNIQUE</option>
                <option value="COMPTE">COMPTE</option>
              </select>
            </div>
          </div>

          {/* Tableau complet */}
          <DataTable
            caption="Tickets d'assistance"
            keyExtractor={(t) => t.id}
            data={filteredTickets}
            columns={[
              {
                key: 'id',
                header: 'N° Ticket',
                isRowHeader: true,
                render: (t) => (
                  <div>
                    <Link to={`/support/tickets/${t.id}`} className="font-mono font-bold text-[#E85D22] hover:underline">
                      {t.id}
                    </Link>
                    <p className="text-[10px] text-slate-400 font-mono">Urgence IA : {t.urgencyScore}/100</p>
                  </div>
                ),
              },
              {
                key: 'sub',
                header: 'Sujet & Problématique',
                render: (t) => (
                  <div className="max-w-md">
                    <strong className="text-slate-900 dark:text-white block truncate">{t.subject}</strong>
                    <span className="text-[11px] text-slate-500 truncate block">{t.description}</span>
                  </div>
                ),
              },
              {
                key: 'category',
                header: 'Catégorie',
                render: (t) => <Badge variant="info">{t.category}</Badge>,
              },
              {
                key: 'priority',
                header: 'Priorité',
                render: (t) => (
                  <Badge variant={t.priority === 'URGENT' ? 'danger' : t.priority === 'HIGH' ? 'warning' : 'neutral'}>
                    {t.priority}
                  </Badge>
                ),
              },
              {
                key: 'status',
                header: 'Statut',
                render: (t) => (
                  <Badge variant={t.status === 'RESOLVED' ? 'success' : t.status === 'IN_PROGRESS' ? 'info' : 'warning'}>
                    {t.status}
                  </Badge>
                ),
              },
              {
                key: 'agent',
                header: 'Agent Assigné',
                render: (t) => (
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {t.assignedAgentName}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (t) => (
                  <div className="flex gap-2">
                    <Link to={`/support/tickets/${t.id}`}>
                      <Button size="sm" variant="secondary">
                        Ouvrir
                      </Button>
                    </Link>
                    {t.status !== 'RESOLVED' ? (
                      <Button size="sm" variant="ghost" onClick={() => handleResolveTicket(t.id)}>
                        Clôturer
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleReopenTicket(t.id)}>
                        Rouvrir
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 2 & 4. FICHE DÉTAILLÉE D'UN TICKET (/support/tickets/:id)             */}
      {/* ===================================================================== */}
      {section === 'ticket-detail' && (
        <div className="space-y-6">
          {/* Carte d'en-tête du ticket */}
          <Card
            title={`Ticket d'Assistance ${selectedTicket.id}`}
            subtitle={`Demandeur : ${selectedTicket.requesterCompany} (${selectedTicket.requesterName}) • Créé le ${new Date(selectedTicket.createdAt).toLocaleString('fr-FR')}`}
            action={
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={handleCreateSupportRoomLive}>
                  <Video className="w-4 h-4" /> Ouvrir Room Live Support
                </Button>
                {selectedTicket.status !== 'RESOLVED' ? (
                  <Button size="sm" variant="secondary" onClick={() => handleResolveTicket(selectedTicket.id)}>
                    <CheckCircle2 className="w-4 h-4" /> Marquer comme Résolu
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => handleReopenTicket(selectedTicket.id)}>
                    <RefreshCw className="w-4 h-4" /> Rouvrir le Ticket
                  </Button>
                )}
              </div>
            }
          >
            {/* Métadonnées & Classification IA */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 text-xs mb-6">
              <div>
                <span className="text-slate-400 block mb-1">Catégorie Métier :</span>
                <Badge variant="info">{selectedTicket.category}</Badge>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Niveau de Priorité :</span>
                <Badge variant={selectedTicket.priority === 'URGENT' ? 'danger' : selectedTicket.priority === 'HIGH' ? 'warning' : 'neutral'}>
                  {selectedTicket.priority} (Score Urgence : {selectedTicket.urgencyScore}/100)
                </Badge>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Statut Actuel :</span>
                <Badge variant={selectedTicket.status === 'RESOLVED' ? 'success' : selectedTicket.status === 'IN_PROGRESS' ? 'info' : 'warning'}>
                  {selectedTicket.status}
                </Badge>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Agent Titulaire :</span>
                <select
                  value={selectedTicket.assignedAgentId}
                  onChange={(e) => handleReassignTicket(selectedTicket.id, e.target.value)}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-[#082225] border border-slate-300 dark:border-teal-800 font-bold"
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Encadré d'analyse IA & Résumé de conversation */}
            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-xs space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <strong className="text-sm text-teal-900 dark:text-teal-200 flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-4 h-4 text-[#E85D22]" /> Résumé Analytique de l'Assistant IA
                </strong>
                <Badge variant="neutral">Confiance IA : 96%</Badge>
              </div>
              <p className="text-slate-700 dark:text-slate-300">
                <strong>Problème détecté :</strong> {selectedTicket.subject}. Le demandeur sollicite une validation rapide sous contrainte SLA.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="secondary" onClick={handleApplyAiSuggestedReply}>
                  <Sparkles className="w-3.5 h-3.5 text-[#E85D22]" /> Insérer Réponse Suggérée par l'IA
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => notifyToast('Conversation indexée dans la base de connaissances.', 'info')}
                >
                  <BookOpen className="w-3.5 h-3.5" /> Rechercher dans la Documentation
                </Button>
              </div>
            </div>

            {/* Fil des messages chronologiques */}
            <div className="space-y-3 mb-6">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#E85D22]" /> Historique des Échanges & Notes Internes ({selectedTicket.messages.length})
              </h4>

              {selectedTicket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-2xl border text-xs transition-all ${
                    msg.isInternal
                      ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                      : msg.authorRole === 'SUPPORT'
                      ? 'bg-teal-50/60 dark:bg-[#071E22] border-teal-200 dark:border-teal-800'
                      : 'bg-white dark:bg-[#082225] border-slate-200 dark:border-teal-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <strong className={msg.isInternal ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-[#E85D22] font-bold'}>
                        {msg.authorName}
                      </strong>
                      {msg.isInternal && (
                        <Badge variant="warning">NOTE INTERNE PRIVÉE (AGENTS SEULS)</Badge>
                      )}
                      <Badge variant="neutral">{msg.authorRole}</Badge>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • {new Date(msg.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {msg.content}
                  </p>

                  {/* Pièces jointes sécurisées */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-teal-800/60 flex flex-wrap gap-2">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-[11px]"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-[#E85D22]" />
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{att.name}</span>
                          <span className="text-slate-400">({att.size})</span>
                          <Badge variant="success">Scanné Sain</Badge>
                          <button
                            type="button"
                            onClick={() => notifyToast(`Téléchargement sécurisé de ${att.name}`, 'info')}
                            className="text-teal-600 hover:text-teal-700 font-bold"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Formulaire de réponse & Modèles Canned Responses */}
            <form onSubmit={handleSendMessage} className="space-y-4 pt-4 border-t border-slate-200 dark:border-teal-800 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Modèles de réponse rapide :</span>
                  <select
                    value={selectedCannedId}
                    onChange={(e) => handleApplyCannedResponse(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 font-semibold"
                  >
                    <option value="">Sélectionner un modèle pré-enregistré...</option>
                    {CANNED_RESPONSES.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        [{tmpl.category}] {tmpl.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sélecteur Note Interne vs Réponse Client */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-amber-700 dark:text-amber-400">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Note interne privée (Masquée pour l'usager)</span>
                  </label>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isInternalNote ? 'Contenu du Mémo / Note interne :' : 'Message de Réponse :'}
                  </span>
                  <VoiceDictationButton
                    onTranscript={(t) => setReplyContent((prev) => (prev ? `${prev} ${t}` : t))}
                    size="sm"
                  />
                </div>
                <textarea
                  rows={4}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? "Rédigez une note technique ou un compte-rendu interne réservé à l'équipe support..."
                      : "Saisissez votre réponse destinée au demandeur (ou utilisez la suggestion IA)..."
                  }
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E85D22]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => notifyToast('Pièce jointe sécurisée téléversée avec succès (Scan Antivirus OK).', 'success')}
                  >
                    <Paperclip className="w-4 h-4" /> Joindre un Fichier
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={handleApplyAiSuggestedReply}>
                    <Sparkles className="w-4 h-4 text-[#E85D22]" /> Générer Réponse IA
                  </Button>
                </div>

                <Button type="submit" variant="primary" disabled={!replyContent.trim()}>
                  <Send className="w-4 h-4" />
                  {isInternalNote ? 'Enregistrer Note Interne' : 'Transmettre la Réponse'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. GESTION DES UTILISATEURS (/support/utilisateurs)                   */}
      {/* ===================================================================== */}
      {section === 'utilisateurs' && (
        <div className="space-y-6">
          <Card
            title="Annuaire des Utilisateurs & Consultation d'Historique"
            subtitle="Recherche d'un compte usager, consultation des coordonnées autorisées et historique des interactions."
          >
            {/* Recherche utilisateur */}
            <div className="w-full sm:w-96 mb-6">
              <SearchBar
                value={userSearchQuery}
                onChange={setUserSearchQuery}
                placeholder="Rechercher par nom, entreprise, email, rôle..."
              />
            </div>

            {/* Grille utilisateurs */}
            <div className="grid lg:grid-cols-3 gap-6 text-xs">
              {/* Liste des comptes consultables */}
              <div className="space-y-3">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Comptes Référencés sur la Plateforme :
                </span>
                {[
                  {
                    id: 'usr-client-01',
                    name: 'Youssef Berrada',
                    company: 'Atlas Import & Distribution S.A.',
                    role: 'CLIENT',
                    kycStatus: 'SUBMITTED_IN_TIME_PENDING_REVIEW',
                    ticketsCount: 2,
                  },
                  {
                    id: 'usr-supp-01',
                    name: 'Marc Vandenberg',
                    company: 'EuroTech Industrial GmbH',
                    role: 'FOURNISSEUR',
                    kycStatus: 'VALIDATED',
                    ticketsCount: 2,
                  },
                  {
                    id: 'usr-trans-01',
                    name: 'Nadia El Amrani',
                    company: 'MedFreight Multimodal Carriers',
                    role: 'TRANSPORTEUR',
                    kycStatus: 'VALIDATED',
                    ticketsCount: 1,
                  },
                ]
                  .filter(
                    (u) =>
                      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      u.company.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      u.role.toLowerCase().includes(userSearchQuery.toLowerCase())
                  )
                  .map((u) => (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUserForDetail(u.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        selectedUserForDetail === u.id
                          ? 'bg-[#E85D22]/10 border-[#E85D22] shadow-sm'
                          : 'bg-slate-50 dark:bg-[#071E22] border-slate-200 dark:border-teal-800 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-slate-900 dark:text-white">{u.name}</strong>
                        <Badge variant="neutral">{u.role}</Badge>
                      </div>
                      <p className="text-slate-500 font-semibold">{u.company}</p>
                      <div className="flex justify-between items-center mt-2 text-[11px] text-slate-400">
                        <span>Statut KYC : {u.kycStatus === 'VALIDATED' ? 'Validé' : 'En examen'}</span>
                        <span className="font-bold text-[#E85D22]">{u.ticketsCount} tickets</span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Fiche détaillée de l'utilisateur sélectionné & Historique */}
              <div className="lg:col-span-2 space-y-4">
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-teal-800 pb-3">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {selectedUserForDetail === 'usr-client-01'
                          ? 'Atlas Import & Distribution S.A.'
                          : selectedUserForDetail === 'usr-supp-01'
                          ? 'EuroTech Industrial GmbH'
                          : 'MedFreight Multimodal Carriers'}
                      </h4>
                      <p className="text-slate-500 text-xs font-mono">
                        Identifiant : {selectedUserForDetail} • Juridiction : Maroc / UE
                      </p>
                    </div>
                    <Badge variant="success">Compte Actif (Vérifié)</Badge>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                      <Mail className="w-4 h-4 text-[#E85D22]" />
                      <div>
                        <span className="text-[11px] text-slate-400 block">Email Professionnel :</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {selectedUserForDetail === 'usr-client-01'
                            ? 'achats@atlas-import-retail.ma'
                            : selectedUserForDetail === 'usr-supp-01'
                            ? 'export@eurotech-industrial.de'
                            : 'dispatch@medfreight-logistics.com'}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                      <Phone className="w-4 h-4 text-emerald-500" />
                      <div>
                        <span className="text-[11px] text-slate-400 block">Téléphone Ligne Directe :</span>
                        <strong className="text-slate-800 dark:text-slate-200">+212 5 22 90 14 55</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions bloquées / Barrière de sécurité */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-900 dark:text-amber-200 block">
                        Gouvernance Support : Moindre Privilège Actif
                      </strong>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                        Le rôle Support ne peut pas réinitialiser un mot de passe en direct, ni modifier le dossier KYC, ni altérer les autorisations administratives.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => triggerSecurityBlock('Réinitialisation directe du mot de passe usager')}
                        >
                          <Lock className="w-3.5 h-3.5" /> Réinitialiser Mot de Passe (Interdit)
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => triggerSecurityBlock('Validation manuelle forcée de pièces KYC')}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Valider Pièce KYC (Interdit)
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Historique des tickets de cet utilisateur */}
                  <div className="space-y-2 pt-2">
                    <strong className="text-slate-700 dark:text-slate-300 block">
                      Historique des Tickets Rattachés à cette Organisation :
                    </strong>
                    {tickets
                      .filter((t) => t.requesterId === selectedUserForDetail)
                      .map((t) => (
                        <div
                          key={t.id}
                          className="p-3 rounded-xl bg-white dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
                        >
                          <div>
                            <Link to={`/support/tickets/${t.id}`} className="font-bold text-[#E85D22] hover:underline">
                              {t.id} — {t.subject}
                            </Link>
                            <p className="text-[10px] text-slate-400">
                              Créé le {new Date(t.createdAt).toLocaleDateString('fr-FR')} • Catégorie : {t.category}
                            </p>
                          </div>
                          <Badge variant={t.status === 'RESOLVED' ? 'success' : 'warning'}>{t.status}</Badge>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. COMMUNICATION & MODÈLES (/support/communication)                  */}
      {/* ===================================================================== */}
      {section === 'communication' && (
        <div className="space-y-6">
          <Card
            title="Messagerie Interne & Modèles de Réponses Pré-Enregistrées"
            subtitle="Bibliothèque de réponses types (Canned responses) et canal d'échange entre agents support."
          >
            <div className="grid lg:grid-cols-2 gap-6 text-xs">
              {/* Modèles de réponse */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#E85D22]" /> Modèles de Réponses Préréglés ({CANNED_RESPONSES.length})
                </h4>

                <div className="space-y-3">
                  {CANNED_RESPONSES.map((cr) => (
                    <div
                      key={cr.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 dark:text-white">{cr.title}</strong>
                        <Badge variant="info">{cr.category}</Badge>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 italic">
                        "{locale === 'ar' ? cr.content.ar : locale === 'en' ? cr.content.en : cr.content.fr}"
                      </p>
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            navigator.clipboard?.writeText(cr.content.fr);
                            notifyToast(`Modèle "${cr.title}" copié dans le presse-papiers.`, 'success');
                          }}
                        >
                          Copier le Modèle
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Canal de communication interne entre agents */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-teal-600" /> Fil Général d'Astreinte & Passation de Consignes
                </h4>

                <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3">
                  <div className="space-y-2">
                    {[
                      {
                        author: 'Karim Tazi (N3)',
                        time: '09:15',
                        text: 'Rappel pour tous : les expéditions de denrées sous agrément ATP vers Tanger Med font l’objet d’un contrôle thermique renforcé aujourd’hui.',
                      },
                      {
                        author: 'Sarah Mansour (N2)',
                        time: '10:02',
                        text: 'Ticket TCK-2026-418 résolu : explication commission Stripe validée avec le client.',
                      },
                      {
                        author: 'Amine Khelifi (N2)',
                        time: '10:45',
                        text: 'Je prends en charge le ticket critique d’alerte remorque FR-772-AA avec le chauffeur.',
                      },
                    ].map((entry, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white dark:bg-[#082225] border border-slate-200 dark:border-teal-800"
                      >
                        <div className="flex justify-between font-bold text-[#E85D22] mb-1">
                          <span>{entry.author}</span>
                          <span className="font-mono text-slate-400">{entry.time}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{entry.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Input
                      label="Publier une consigne interne"
                      placeholder="Diffuser une consigne à l'équipe support..."
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => notifyToast('Consigne diffusée à l’équipe support connectée.', 'success')}
                      >
                        Diffuser la Consigne
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. BASE DE CONNAISSANCES (/support/base-connaissances)                */}
      {/* ===================================================================== */}
      {section === 'base-connaissances' && (
        <div className="space-y-6">
          <Card
            title="Base de Connaissances & Procédures Métier"
            subtitle="Foire aux questions (FAQ), guides d'exportation, tutoriels vidéo et procédures opérationnelles standard (SOP)."
          >
            {/* Barre de recherche et filtres de catégorie */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="w-full sm:w-80">
                <SearchBar
                  value={kbSearchQuery}
                  onChange={setKbSearchQuery}
                  placeholder="Rechercher par titre, mot-clé, tag..."
                />
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                {(['ALL', 'FAQ', 'GUIDE', 'TUTORIEL', 'PROCEDURE_INTERNE'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setKbCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      kbCategoryFilter === cat
                        ? 'bg-[#E85D22] text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-teal-900/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cat === 'ALL'
                      ? 'Tous'
                      : cat === 'PROCEDURE_INTERNE'
                      ? 'Procédures SOP'
                      : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grille des articles */}
            <div className="space-y-4">
              {filteredArticles.map((art) => (
                <div
                  key={art.id}
                  className="p-5 rounded-3xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm text-slate-900 dark:text-white">{art.title}</strong>
                      <Badge variant={art.isInternalOnly ? 'warning' : 'info'}>
                        {art.isInternalOnly ? 'SOP INTERNE' : art.category}
                      </Badge>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      Auteur : {art.author} • Mis à jour le {art.updatedAt}
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 font-semibold">{art.summary}</p>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#082225] border border-slate-200 dark:border-teal-800 text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                    {art.content}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-teal-800 text-[11px]">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      {art.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-600 font-mono">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-slate-400">
                      <span>{art.viewsCount} consultations</span>
                      <button
                        type="button"
                        onClick={() => {
                          setArticles((prev) =>
                            prev.map((a) => (a.id === art.id ? { ...a, helpfulCount: a.helpfulCount + 1 } : a))
                          );
                          notifyToast('Merci pour votre vote utile.', 'success');
                        }}
                        className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" /> Utile ({art.helpfulCount})
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. ASSISTANT IA SUPPORT (/support/ia)                                 */}
      {/* ===================================================================== */}
      {section === 'assistant-ia' && (
        <div className="space-y-6">
          <Card
            title="Assistant IA Support & Traducteur Multilingue (FR / EN / AR)"
            subtitle="Classification automatique des tickets, analyse de criticité et traduction instantanée des échanges."
          >
            <div className="grid lg:grid-cols-2 gap-6 text-xs">
              {/* Outil de classification & simulation */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E85D22]" /> Simulateur de Classification & Détection d'Urgence
                </h4>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3">
                  <Input
                    label="Tester un Sujet de Ticket"
                    defaultValue="Rupture de chaîne du froid sur remorque frigorifique Madrid-Casablanca"
                    id="test-ia-subject"
                  />
                  <div>
                    <label className="block text-xs font-semibold mb-1">Corps de la demande :</label>
                    <textarea
                      rows={3}
                      id="test-ia-desc"
                      defaultValue="URGENT : La température est montée à +8.2°C depuis 20 minutes, cargaison de vaccins en péril."
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#082225] border border-slate-300 dark:border-teal-800 text-xs"
                    />
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => {
                      const res = SupportEngine.classifyTicketWithAi(
                        'Rupture de chaîne du froid',
                        'URGENT : La température est montée à +8.2°C'
                      );
                      notifyToast(
                        `Analyse IA terminée : Catégorie=${res.suggestedCategory}, Priorité=${res.suggestedPriority}, Urgence=${res.urgencyScore}/100.`,
                        'success'
                      );
                    }}
                  >
                    Exécuter Classification IA
                  </Button>
                </div>
              </div>

              {/* Module de traduction multilingue instantanée */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Languages className="w-4 h-4 text-blue-500" /> Traduction Instantanée pour Dialogue B2B
                </h4>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Texte à traduire :</label>
                    <textarea
                      rows={3}
                      value={aiTranslateInput}
                      onChange={(e) => setAiTranslateInput(e.target.value)}
                      placeholder="Saisissez un message client pour le traduire en Anglais ou en Arabe..."
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-[#082225] border border-slate-300 dark:border-teal-800 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">Vers :</span>
                      <select
                        value={aiTargetLang}
                        onChange={(e) => setAiTargetLang(e.target.value as any)}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-[#082225] border border-slate-300 dark:border-teal-800 font-bold"
                      >
                        <option value="en">English (EN)</option>
                        <option value="ar">العربية (AR)</option>
                        <option value="fr">Français (FR)</option>
                      </select>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        if (!aiTranslateInput.trim()) return;
                        const tr = SupportEngine.translateText(aiTranslateInput, aiTargetLang);
                        setAiTranslatedResult(tr);
                        notifyToast('Traduction générée avec succès.', 'success');
                      }}
                    >
                      Traduire
                    </Button>
                  </div>

                  {aiTranslatedResult && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 font-semibold text-emerald-900 dark:text-emerald-200">
                      <span className="text-[10px] text-slate-400 block mb-1">Résultat traduit :</span>
                      {aiTranslatedResult}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. ROOM LIVE SUPPORT (/support/room-live)                             */}
      {/* ===================================================================== */}
      {section === 'room-live' && (
        <Card
          title="Assistance en Direct Room Live Support"
          subtitle="Ouverture d'une session vidéo sécurisée pour diagnostic conjoint, partage d'écran et levée d'anomalies."
        >
          <div className="grid lg:grid-cols-2 gap-6 text-xs">
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-4">
              <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
                <Video className="w-5 h-5 text-[#E85D22] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white block">
                    Assistance Vidéo Cryptée de Bout-en-Bout
                  </strong>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    Le support peut initier une session WebRTC certifiée et inviter un client, un transporteur ou un fournisseur avec consentement mutuel.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Input
                  label="Intitulé de la Salle d'Assistance"
                  defaultValue={`Support Direct — ${selectedTicket.id}`}
                  readOnly
                />
                <Input
                  label="Participant Invité"
                  defaultValue={`${selectedTicket.requesterCompany} (${selectedTicket.requesterEmail})`}
                  readOnly
                />
              </div>

              <div className="pt-2 flex gap-3">
                <Button size="lg" variant="primary" onClick={handleCreateSupportRoomLive}>
                  <Video className="w-5 h-5" /> Lancer la Room Live Support
                </Button>
                <Link to="/room/room-01">
                  <Button size="lg" variant="secondary">
                    Rejoindre Salle Existante
                  </Button>
                </Link>
              </div>
            </div>

            {/* Règles déontologiques de télé-assistance */}
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-3">
              <strong className="text-sm text-slate-900 dark:text-white block font-bold">
                Protocole de Télé-Assistance Conforme RGPD :
              </strong>
              <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300">
                <li>Le partage d'écran requiert l'accord explicite et révocable de l'usager.</li>
                <li>L'agent support ne prend aucun contrôle distant unilatéral du terminal client.</li>
                <li>L'intégralité de la session génère un relevé horodaté d'audit certifié SHA-256.</li>
                <li>Les documents examinés en session restent confinés dans l'espace isolé TradeLink.</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* 8. PARAMÈTRES AGENT (/support/parametres)                             */}
      {/* ===================================================================== */}
      {section === 'parametres' && (
        <div className="space-y-6">
          <Card
            title="Profil Professionnel & Préférences de l'Agent Support"
            subtitle="Gestion de votre statut de disponibilité, des alertes sonores et des options d'astreinte."
          >
            <div className="grid sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Identité de l'Agent</h4>
                <Input
                  label="Nom & Prénom"
                  defaultValue={`${currentUser.firstName} ${currentUser.lastName}`}
                  readOnly
                />
                <Input
                  label="Email Professionnel d'Assistance"
                  defaultValue={currentUser.email}
                  readOnly
                />
                <Input
                  label="Niveau d'Habilitation Support"
                  defaultValue="Niveau 2 (N2) — Douane, Logistique & Facturation"
                  readOnly
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Disponibilité Opérationnelle</h4>
                <div>
                  <label className="block text-xs font-semibold mb-2">Mon statut actuel :</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { status: 'ONLINE', label: 'En Ligne', color: 'border-emerald-500 bg-emerald-500/10' },
                      { status: 'BUSY', label: 'Occupé / En Appel', color: 'border-amber-500 bg-amber-500/10' },
                      { status: 'AWAY', label: 'En Pause', color: 'border-slate-400 bg-slate-400/10' },
                      { status: 'OFFLINE', label: 'Hors Ligne', color: 'border-rose-500 bg-rose-500/10' },
                    ].map((st) => (
                      <button
                        key={st.status}
                        type="button"
                        onClick={() => {
                          setAgentStatus(st.status as any);
                          notifyToast(`Statut agent mis à jour : ${st.label}`, 'info');
                        }}
                        className={`p-3 rounded-2xl border font-bold text-xs text-left transition-all ${
                          agentStatus === st.status ? st.color + ' ring-2 ring-[#E85D22]' : 'border-slate-200 dark:border-teal-800'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={soundAlertsEnabled}
                      onChange={(e) => setSoundAlertsEnabled(e.target.checked)}
                      className="rounded text-[#E85D22] focus:ring-[#E85D22]"
                    />
                    <span>Activer les alertes sonores pour tickets urgents (SLA &lt; 15 min)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={emailNotificationsEnabled}
                      onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                      className="rounded text-[#E85D22] focus:ring-[#E85D22]"
                    />
                    <span>Recevoir les notifications instantanées par email</span>
                  </label>
                </div>
              </div>
            </div>
          </Card>

          {/* Préférences Langues & Thème */}
          <Card
            title="Langue d'Interface & Thème Visuel"
            subtitle="Personnalisation ergonomique de votre console d'assistance."
          >
            <div className="grid sm:grid-cols-2 gap-6 text-xs">
              <div>
                <label className="font-semibold block mb-2">Langue :</label>
                <div className="flex gap-2">
                  {[
                    { code: 'fr', label: 'Français' },
                    { code: 'en', label: 'English' },
                    { code: 'ar', label: 'العربية (RTL)' },
                  ].map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLocale(l.code as any)}
                      className={`px-3 py-1.5 rounded-xl border font-bold transition-all ${
                        locale === l.code
                          ? 'border-[#E85D22] bg-[#E85D22] text-white'
                          : 'border-slate-300 dark:border-teal-800'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-2">Thème :</label>
                <div className="flex gap-2">
                  {[
                    { mode: 'system', label: 'Système' },
                    { mode: 'light', label: 'Clair' },
                    { mode: 'dark', label: 'Noir / Sombre' },
                  ].map((th) => (
                    <button
                      key={th.mode}
                      type="button"
                      onClick={() => setTheme(th.mode as ThemeMode)}
                      className={`px-3 py-1.5 rounded-xl border font-bold transition-all ${
                        theme === th.mode
                          ? 'border-[#E85D22] bg-[#E85D22] text-white'
                          : 'border-slate-300 dark:border-teal-800'
                      }`}
                    >
                      {th.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : CRÉATION DE TICKET SUPPORT PAR UN AGENT                       */}
      {/* ===================================================================== */}
      {createTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-teal-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#E85D22]" />
                Ouvrir un Nouveau Ticket d'Assistance
              </h3>
              <button
                type="button"
                onClick={() => setCreateTicketOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold">Objet de la demande / Sujet *</label>
                  <VoiceDictationButton
                    onTranscript={(t) => setNewSubject((prev) => (prev ? `${prev} ${t}` : t))}
                    size="sm"
                  />
                </div>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Ex: Problème d'impression étiquettes thermiques SSCC"
                  required
                  className="w-full rounded-xl border px-3.5 py-2 text-sm bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 border-slate-300 dark:border-teal-800 focus:border-[#E85D22] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Catégorie :</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as SupportTicketCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-bold"
                  >
                    <option value="LOGISTIQUE">LOGISTIQUE</option>
                    <option value="DOUANE">DOUANE</option>
                    <option value="FACTURATION">FACTURATION</option>
                    <option value="TECHNIQUE">TECHNIQUE</option>
                    <option value="COMPTE">COMPTE</option>
                    <option value="PRODUITS">PRODUITS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Priorité :</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as SupportTicketPriority)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-bold"
                  >
                    <option value="LOW">LOW (Basse)</option>
                    <option value="MEDIUM">MEDIUM (Moyenne)</option>
                    <option value="HIGH">HIGH (Haute)</option>
                    <option value="URGENT">URGENT (Critique)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Organisation demanderesse"
                  value={newRequesterCompany}
                  onChange={(e) => setNewRequesterCompany(e.target.value)}
                  required
                />
                <Input
                  label="Email de contact"
                  type="email"
                  value={newRequesterEmail}
                  onChange={(e) => setNewRequesterEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold">Description détaillée du problème * :</label>
                  <VoiceDictationButton
                    onTranscript={(t) => setNewDescription((prev) => (prev ? `${prev} ${t}` : t))}
                    size="sm"
                  />
                </div>
                <textarea
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Décrivez avec précision l'incident ou la question posée..."
                  required
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-teal-800">
                <Button type="button" variant="secondary" onClick={() => setCreateTicketOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary">
                  Créer et Classifier via IA
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : RESTRICTION DE SÉCURITÉ MOINDRE PRIVILÈGE                     */}
      {/* ===================================================================== */}
      {securityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="p-3 rounded-2xl bg-amber-500/10">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Action Refusée (Sécurité Support V6.0)
              </h3>
            </div>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Tentative d'exécution de : <strong>"{forbiddenActionName}"</strong>.
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 text-slate-500">
              Le rôle <strong>SUPPORT</strong> est strictement cloisonné : il ne peut pas modifier les données sensibles, altérer les droits KYC, ni modifier les écritures comptables sans intervention d'un administrateur habilité.
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setSecurityModalOpen(false)}>
                Compris
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
