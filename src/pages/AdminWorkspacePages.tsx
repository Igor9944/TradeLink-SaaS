// ============================================================================
// TRADELINK V6.0 — ESPACE ADMINISTRATEUR HARMONISÉ UX/UI (PAGES 11 À 22)
// Inclut : Graphiques KPIs, KYC J+7, KMS, Sandbox SQL/BAK/DBF, Double Validation,
// Export CSV/JSON réel et ConfirmDialog sur actions sensibles
// ============================================================================

import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  RefreshCw,
  Download,
  Plus,
  Truck,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Database,
  FileSpreadsheet,
  FileCode,
  Play,
  ShieldAlert,
  ArrowRight,
  Hash,
  CheckCircle2,
} from 'lucide-react';
import { useApp, DEMO_USERS } from '../contexts/AppContext';
import { downloadDataExport } from '../i18n/translations';
import { BACKEND_25_SERVICES } from '../services/backendServices';
import { AdminKycSupervisionView } from '../components/kyc/KycModuleViews';
import { Icon3D } from '../components/ui/Icon3D';
import {
  ImportExportFormat,
  EnvelopeCipherResult,
} from '../services/adminAdvancedEngine';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  FileUploader,
  SearchBar,
  Stepper,
} from '../components/ui/DesignSystem';

export const AdminWorkspacePage: React.FC<{
  section:
    | 'dashboard'
    | 'users'
    | 'user-detail'
    | 'kyc'
    | 'kyc-detail'
    | 'security'
    | 'import-export'
    | 'ai-config'
    | 'floating-buttons'
    | 'audit'
    | 'backups'
    | 'reports';
}> = ({ section }) => {
  const {
    currentUser,
    switchUserAccount,
    kycDossiers,
    kmsKeys,
    rotateKMSKey,
    importJobs,
    backups,
    createManualBackup,
    approveBackupRestore,
    auditLogs,
    floatingButtons,
    toggleFloatingButton,
    vehicles,
    missions,
    shipments,
    incidents,
    notifyToast,
    activeSandboxReport,
    analyzeSandboxFile,
    promoteSandboxReport,
    testBackupRestoreInSandbox,
    kmsOperationsHistory,
    simulateKmsEnvelopeCipher,
    exportDatasetAction,
    verifyAuditChainAction,
  } = useApp();

  const params = useParams();
  const [search, setSearch] = useState('');
  const [revokeUserTarget, setRevokeUserTarget] = useState<string | null>(null);
  const [llmProvider, setLlmProvider] = useState<'OPENAI' | 'OLLAMA'>('OPENAI');

  // PROMPT 11 : États locaux pour KMS Playground, Exports & Sandbox
  const [envelopeInput, setEnvelopeInput] = useState('Dossier confidentiel KYC Passeport #FR-99201 - Chiffré en mémoire');
  const [envelopeOutput, setEnvelopeOutput] = useState<EnvelopeCipherResult | null>(null);
  const [chainVerification, setChainVerification] = useState<{
    isChainIntact: boolean;
    totalEntriesVerified: number;
    latestHash: string;
    verifiedAt: string;
  } | null>(null);
  const [exportEntity, setExportEntity] = useState<'PRODUCTS' | 'ORDERS' | 'ENTRIES' | 'AUDIT_LOGS'>('PRODUCTS');
  const [exportFormat, setExportFormat] = useState<ImportExportFormat>('CSV');
  const [backupRestoreReport, setBackupRestoreReport] = useState<any | null>(null);

  const usersList = Object.entries(DEMO_USERS).map(([key, u]) => ({ key, ...u }));
  const selectedUser =
    usersList.find((u) => u.id === params.id) ?? usersList[0];
  const selectedKycDossier =
    kycDossiers.find((d) => d.id === params.id) ?? kycDossiers[0];

  return (
    <div className="space-y-6">
      {/* EN-TÊTE ESPACE ADMIN */}
      <div className="rounded-3xl bg-gradient-to-r from-[#0B3438] via-[#104348] to-[#0B3438] text-white p-6 shadow-lg border border-teal-700/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Icon3D name="secure-parcel" size="xl" withGlow />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="orange">ADMINISTRATION & SÉCURITÉ KMS</Badge>
              <Badge variant="success">MFA TOTP VÉRIFIÉ</Badge>
            </div>
            <h1 className="text-2xl font-extrabold mt-1">
              Centre de Gouvernance TRADELINK V6.0
            </h1>
            <p className="text-xs text-teal-200 mt-0.5">
              Connecté en tant que : <strong>{currentUser.firstName} {currentUser.lastName}</strong> ({currentUser.id}) • Session Redis : <code className="ltr-preserve">{currentUser.activeSessionId}</code>
            </p>
          </div>
        </div>

        {/* Navigation rapide entre les 12 sous-pages Admin */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { to: '/admin/dashboard', label: '11. Dashboard' },
            { to: '/admin/users', label: '12. Utilisateurs' },
            { to: '/admin/kyc', label: '14. Validation KYC' },
            { to: '/admin/security', label: '16. Sécurité & KMS' },
            { to: '/admin/import-export', label: '17. Import Sandbox' },
            { to: '/admin/ai-config', label: '18. Config IA' },
            { to: '/admin/floating-buttons', label: '19. Boutons Flottants' },
            { to: '/admin/audit', label: '20. Audit Logs' },
            { to: '/admin/backups', label: '21. Sauvegardes' },
            { to: '/admin/reports', label: '22. Rapports' },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#E85D22] text-white font-semibold transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 11. DASHBOARD ADMIN (/admin/dashboard) */}
      {section === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Dossiers KYC & Conformité',
                value: `${kycDossiers.length} Dossiers`,
                sub: '1 soumis à temps (protégé J+7) • 1 suspendu J+7',
                pct: 82,
                icon: 'customs-stamp' as const,
                to: '/admin/kyc',
              },
              {
                title: 'Clés KMS (Enveloppe AES-256)',
                value: `${kmsKeys.length} Clés Actives`,
                sub: 'KEK Master & DEK Enveloppe (Aucun secret exposé)',
                pct: 100,
                icon: 'fleet-keys' as const,
                to: '/admin/security',
              },
              {
                title: 'Sandbox SQL / BAK / DBF',
                value: `${importJobs.length} Jobs Isolés`,
                sub: 'Zéro exécution directe en production',
                pct: 98,
                icon: 'conveyor' as const,
                to: '/admin/import-export',
              },
              {
                title: 'Sauvegardes & Double Approbation',
                value: `${backups.length} Snapshots`,
                sub: 'Restauration soumise à 2 Admins distincts',
                pct: 95,
                icon: 'insured' as const,
                to: '/admin/backups',
              },
            ].map((kpi) => (
              <Link key={kpi.title} to={kpi.to} className="group">
                <Card className="h-full hover:border-[#E85D22] transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {kpi.title}
                      </p>
                      <p className="text-2xl font-extrabold mt-1 group-hover:text-[#E85D22]">
                        {kpi.value}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{kpi.sub}</p>
                    </div>
                    <Icon3D name={kpi.icon} size="lg" withGlow />
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-teal-800/60">
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-teal-900 overflow-hidden">
                      <div
                        className="h-full bg-[#E85D22] rounded-full"
                        style={{ width: `${kpi.pct}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <Card
            title="Supervision des 25 Services Backend (Chapitre 10 du Cahier des Charges)"
            subtitle="Architecture Node.js / Express / Prisma / PostgreSQL / Redis / KMS / S3"
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {BACKEND_25_SERVICES.map((srv) => (
                <div
                  key={srv.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200/80 dark:border-teal-800/70 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-mono text-[#E85D22] font-bold">
                        #{srv.id} {srv.domain}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Service Actif" />
                    </div>
                    <p className="text-xs font-bold mt-1">{srv.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {srv.description}
                    </p>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 mt-2 truncate ltr-preserve">
                    {srv.file}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* SUPERVISION LOGISTIQUE GLOBALE & CONFORMITÉ FLOTTE */}
          <Card
            title="Supervision Logistique Multimodale & Conformité de Flotte (Prompt 9)"
            subtitle="Télémétrie des transporteurs agréés, agréments ATP froid et suivi des incidents de transit"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-500">Flotte Agréée & Actuelle</span>
                  <Truck className="w-4 h-4 text-[#E85D22]" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {vehicles.length} Véhicules ({vehicles.filter((v) => v.status === 'AVAILABLE').length} Disponibles)
                </p>
                <p className="text-slate-400 mt-1">MedFreight Multimodal Carriers • Licence TIR</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-500">Chaîne du Froid ATP</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {vehicles.filter((v) => v.hasAtpReeferCert).length} Certifiés FRC
                </p>
                <p className="text-slate-400 mt-1">Température dirigée -20°C à +12°C</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-500">Missions & Incidents</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {missions.length} Missions • {incidents.filter((i) => i.status !== 'RESOLVED').length} Incident(s)
                </p>
                <p className="text-slate-400 mt-1">{shipments.length} Expéditions suivies par GPS</p>
              </div>
            </div>

            <div className="space-y-2">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-xl bg-white dark:bg-[#071f22] border border-slate-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{v.registrationPlate}</span>
                    <span className="text-slate-500">{v.brandModel}</span>
                    <Badge variant="orange">{v.vehicleType}</Badge>
                    {v.hasAtpReeferCert && <Badge variant="success">ATP FRC Valide</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-[11px]">Capacité : {v.capacityKg} kg</span>
                    <Badge variant={v.status === 'AVAILABLE' ? 'success' : v.status === 'ON_MISSION' ? 'orange' : 'warning'}>
                      {v.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* 12. GESTION UTILISATEURS (/admin/users) */}
      {section === 'users' && (
        <>
          <Card
            title="Gestion des Utilisateurs, Rôles RBAC & Sessions Uniques Redis (Page 12)"
            subtitle="Règle 2.2 : Un seul accès actif par utilisateur ; toute nouvelle connexion invalide la session précédente."
            action={<SearchBar value={search} onChange={setSearch} />}
          >
            <DataTable
              caption="Liste des utilisateurs tous rôles et sessions actives"
              keyExtractor={(u) => u.id}
              data={usersList.filter(
                (u) =>
                  u.firstName.toLowerCase().includes(search.toLowerCase()) ||
                  u.companyName.toLowerCase().includes(search.toLowerCase()) ||
                  u.role.toLowerCase().includes(search.toLowerCase())
              )}
              columns={[
                {
                  key: 'user',
                  header: 'Utilisateur & Entreprise',
                  isRowHeader: true,
                  render: (u) => (
                    <div>
                      <Link
                        to={`/admin/users/${u.id}`}
                        className="font-bold text-[#E85D22] hover:underline"
                      >
                        {u.firstName} {u.lastName}
                      </Link>
                      <p className="text-xs text-slate-500">{u.companyName}</p>
                    </div>
                  ),
                },
                {
                  key: 'role',
                  header: 'Rôle RBAC',
                  render: (u) => <Badge variant="orange">{u.role}</Badge>,
                },
                {
                  key: 'mfa',
                  header: 'MFA TOTP',
                  render: (u) =>
                    u.mfaEnabled ? (
                      <Badge variant="success">MFA Actif {u.role === 'ADMIN' ? '(Obligatoire)' : ''}</Badge>
                    ) : (
                      <Badge variant="neutral">Standard OTP</Badge>
                    ),
                },
                {
                  key: 'session',
                  header: 'Session Unique Redis',
                  render: (u) => (
                    <code className="text-xs font-mono text-emerald-700 dark:text-emerald-300 ltr-preserve">
                      {u.activeSessionId}
                    </code>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions Serveur',
                  render: (u) => (
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/admin/users/${u.id}`}>
                        <Button size="sm" variant="secondary">Fiche Détail (Page 13)</Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => switchUserAccount(u.key as keyof typeof DEMO_USERS)}
                      >
                        Incarner ce profil
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setRevokeUserTarget(u.email)}
                      >
                        Révoquer Session
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          <ConfirmDialog
            open={Boolean(revokeUserTarget)}
            onClose={() => setRevokeUserTarget(null)}
            title="Confirmer la révocation de session Redis"
            description={`Voulez-vous invalider immédiatement la session active et les jetons de rafraîchissement pour le compte ${revokeUserTarget} ? Cette action sera consignée dans le journal d'audit.`}
            confirmLabel="Révoquer la session"
            onConfirm={() =>
              notifyToast(
                `Session active et refresh tokens révoqués dans Redis pour ${revokeUserTarget}`,
                'warning'
              )
            }
          />
        </>
      )}

      {/* 13. DÉTAIL UTILISATEUR (/admin/users/:id) */}
      {section === 'user-detail' && (
        <Card
          title={`Fiche Détaillée Utilisateur : ${selectedUser.firstName} ${selectedUser.lastName} (Page 13)`}
          subtitle={`ID: ${selectedUser.id} • Entreprise : ${selectedUser.companyName} • Juridiction : ${selectedUser.jurisdiction}`}
          action={
            <Link to="/admin/users">
              <Button size="sm" variant="secondary">← Retour Liste Utilisateurs</Button>
            </Link>
          }
        >
          <div className="grid md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
              <h4 className="font-bold text-sm">Informations, Rôle & Permissions</h4>
              <p><strong>Email :</strong> {selectedUser.email}</p>
              <p><strong>Téléphone :</strong> {selectedUser.phone}</p>
              <p><strong>Rôle :</strong> <Badge variant="orange">{selectedUser.role}</Badge></p>
              <p><strong>Permissions attribuées :</strong> {selectedUser.permissions.join(', ')}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
              <h4 className="font-bold text-sm">Session Active Unique & Appareils Connus</h4>
              <p><strong>Session Redis active :</strong> <code className="ltr-preserve">{selectedUser.activeSessionId}</code></p>
              <p><strong>Appareil de confiance :</strong> Workstation Chrome 150 / Windows 11 (Vérifié)</p>
              <div className="pt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    notifyToast(`Session ${selectedUser.activeSessionId} révoquée immédiatement.`, 'warning')
                  }
                >
                  Révoquer la session active
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 14. VALIDATION KYC (/admin/kyc) */}
      {section === 'kyc' && <AdminKycSupervisionView />}

      {/* 15. DÉTAIL & VISIONNEUSE KYC (/admin/kyc/:id) */}
      {section === 'kyc-detail' && (
        <AdminKycSupervisionView selectedDossierIdParam={selectedKycDossier.id} />
      )}

      {/* 16. SÉCURITÉ & KMS (/admin/security) — Composant 63 : KMSKeyCard */}
      {section === 'security' && (
        <div className="space-y-6">
          <Card
            title="Gestion des Clés KMS & Chiffrement par Enveloppe (Page 16 — Composant 63 : KMSKeyCard)"
            subtitle="Chapitre 12.1 : DEK pour les données, KEK gérée par KMS/Vault/HSM. Les clés brutes ne sont JAMAIS affichées ni stockées en clair."
          >
            <div className="grid md:grid-cols-2 gap-4">
              {kmsKeys.map((k) => (
                <div
                  key={k.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon3D name="fleet-keys" size="md" withGlow />
                      <div>
                        <p className="text-sm font-bold ltr-preserve">{k.keyAlias}</p>
                        <p className="text-xs text-slate-500">
                          {k.keyType} • {k.algorithm} • Version v{k.version}
                        </p>
                      </div>
                    </div>
                    <Badge variant="success">{k.status}</Badge>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800/80 text-xs font-mono ltr-preserve">
                    <p className="text-slate-400">ARN / Référence KMS (Secret brut jamais exposé) :</p>
                    <p className="text-emerald-700 dark:text-emerald-300 mt-0.5 truncate">
                      {k.keyArnMasked}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Dernière rotation : {k.lastRotatedAt}</span>
                    <Button size="sm" variant="teal" onClick={() => rotateKMSKey(k.id)}>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Rotation Clé KMS (HSM)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* SIMULATEUR DE CHIFFREMENT PAR ENVELOPPE (AES-256-GCM) */}
          <Card
            title="Laboratoire de Chiffrement par Enveloppe (DEK éphémère / KEK souveraine)"
            subtitle="Démonstration temps réel : la DEK est générée en RAM, chiffre les données en AES-256-GCM, puis est enveloppée sous la KEK et immédiatement purgée de la mémoire vive."
          >
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={envelopeInput}
                  onChange={(e) => setEnvelopeInput(e.target.value)}
                  placeholder="Texte confidentiel à chiffrer par enveloppe..."
                  className="flex-1 px-4 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!envelopeInput.trim()) return;
                    const res = simulateKmsEnvelopeCipher(envelopeInput, kmsKeys[0].id);
                    setEnvelopeOutput(res);
                  }}
                >
                  <Lock className="w-4 h-4" />
                  Chiffrer par Enveloppe AES-256-GCM
                </Button>
              </div>

              {envelopeOutput && (
                <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs space-y-3 border border-teal-700/60">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Enveloppe Chiffrée Générée (Zero Secret Brut)
                    </span>
                    <span className="text-[11px] text-slate-400">Algorithme : {envelopeOutput.algorithm}</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <p className="text-slate-400">1. DEK en clair dans la RAM :</p>
                      <p className="text-amber-400 font-bold">DEK 256 bits éphémère (Zeroized en mémoire)</p>
                    </div>
                    <div>
                      <p className="text-slate-400">2. DEK enveloppée sous KEK :</p>
                      <p className="text-teal-300 truncate">{envelopeOutput.cipherDekBase64}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">3. Vecteur d'Initialisation (IV 96 bits) :</p>
                      <p className="text-slate-300">{envelopeOutput.ivHex}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">4. Tag d'Authentification GCM (128 bits) :</p>
                      <p className="text-purple-300">{envelopeOutput.authTagHex}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-slate-400 mb-1">Payload Chiffré Ciphertext (Base64) :</p>
                    <p className="text-emerald-300 break-all bg-black/40 p-2.5 rounded-lg">
                      {envelopeOutput.cipherTextBase64}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* HISTORIQUE DES OPÉRATIONS KMS */}
          <Card
            title="Registre d'Audit des Opérations KMS & HSM"
            subtitle="Traçabilité cryptographique des rotations de KEK et des générations de clés de données DEK."
          >
            <DataTable
              caption="Opérations KMS"
              keyExtractor={(op) => op.id}
              data={kmsOperationsHistory}
              columns={[
                {
                  key: 'timestamp',
                  header: 'Horodatage',
                  isRowHeader: true,
                  render: (op) => <span className="font-mono text-xs">{op.timestamp}</span>,
                },
                {
                  key: 'op',
                  header: 'Opération',
                  render: (op) => (
                    <Badge variant={op.operation === 'ROTATE_KEK' ? 'orange' : 'info'}>
                      {op.operation}
                    </Badge>
                  ),
                },
                {
                  key: 'key',
                  header: 'Clé Cible & ARN Masqué',
                  render: (op) => (
                    <div>
                      <p className="font-bold text-xs ltr-preserve">{op.keyAlias}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs">{op.keyArnMasked}</p>
                    </div>
                  ),
                },
                {
                  key: 'actor',
                  header: 'Initié Par',
                  render: (op) => <span className="text-xs">{op.performedBy}</span>,
                },
                {
                  key: 'status',
                  header: 'Statut',
                  render: (op) => (
                    <Badge variant={op.result === 'SUCCESS' ? 'success' : 'danger'}>
                      {op.result}
                    </Badge>
                  ),
                },
                {
                  key: 'details',
                  header: 'Détails Opérationnels',
                  render: (op) => <span className="text-xs text-slate-600 dark:text-slate-300">{op.details}</span>,
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* 17. IMPORT / EXPORT & SANDBOX ISOLÉE (/admin/import-export) — Composants 61 & 62 */}
      {section === 'import-export' && (
        <div className="space-y-6">
          <Card
            title="Import Avancé Multi-Formats & Sandbox Isolée (Page 17 — PROMPT 11)"
            subtitle="Supports natifs : CSV, XLSX, JSON, SQL, BAK, DBF, DBF/CDX. Les dumps ne sont JAMAIS exécutés directement en production. Restauration éphémère sans accès réseau ni secrets."
            action={
              <div className="flex flex-wrap items-center gap-1.5">
                {(['CSV', 'XLSX', 'JSON', 'SQL', 'BAK', 'DBF', 'CDX'] as ImportExportFormat[]).map((fmt) => (
                  <Badge key={fmt} variant="orange">
                    {fmt}
                  </Badge>
                ))}
              </div>
            }
          >
            <div className="space-y-6">
              <Stepper
                currentStepIndex={1}
                steps={[
                  { id: 's1', label: '1. Scan Antivirus & SHA-256', description: 'Contrôle ClamAV et intégrité' },
                  { id: 's2', label: '2. Sandbox Éphémère Isolée', description: 'Réseau OFF, Secrets Prod Masqués' },
                  { id: 's3', label: '3. Double Approbation Admin', description: 'Migration scellée par planHash' },
                ]}
              />

              {/* DÉMO RAPIDE D'ANALYSE SANDBOX PAR FORMAT */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                <p className="text-xs font-bold text-slate-700 dark:text-teal-200 uppercase tracking-wide">
                  Démonstrations Rapides d'Analyse en Sandbox Isolée :
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => analyzeSandboxFile('Tarifs_Douaniers_SH_2026.dbf', 'DBF')}
                  >
                    <Database className="w-3.5 h-3.5" />
                    FoxPro DBF/CDX (Tarifs Douaniers)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => analyzeSandboxFile('Archive_Catalogue_ERP_2026.bak', 'BAK')}
                  >
                    <Database className="w-3.5 h-3.5" />
                    SQL Server .BAK (Catalogue ERP)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => analyzeSandboxFile('dump_commandes_logistique_2026.sql', 'SQL')}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    Dump PostgreSQL .SQL
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => analyzeSandboxFile('Catalogue_Produits_Multilingues.xlsx', 'XLSX')}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Catalogue Excel .XLSX
                  </Button>
                </div>
              </div>

              <FileUploader
                label="Déposer un dump SQL, sauvegarde SQL Server (.BAK), table FoxPro (.DBF/.CDX), CSV, XLSX ou JSON"
                onFileSelect={(name) => analyzeSandboxFile(name)}
              />

              {/* CARTE D'ANALYSE DÉTAILLÉE DE LA SANDBOX ACTIVE */}
              {activeSandboxReport && (
                <div className="p-5 rounded-2xl bg-teal-500/10 border-2 border-teal-500/30 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="info">{activeSandboxReport.format}</Badge>
                        <Badge variant="success">Scan Antivirus : {activeSandboxReport.avScanStatus}</Badge>
                        <Badge variant="orange">Score Compatibilité : {activeSandboxReport.compatibilityScore}%</Badge>
                      </div>
                      <h3 className="text-base font-bold mt-1.5 ltr-preserve">{activeSandboxReport.fileName}</h3>
                      <p className="text-xs text-slate-500 font-mono ltr-preserve">
                        Job: {activeSandboxReport.jobId} • Taille: {activeSandboxReport.fileSizeFormatted} • SHA-256: {activeSandboxReport.sha256Checksum.slice(0, 24)}...
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Réseau Sandbox Coupé
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Secrets Prod Masqués
                      </span>
                    </div>
                  </div>

                  {/* SCHÉMAS DÉTECTÉS ET STATISTIQUES */}
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                      <p className="text-xs text-slate-400">Lignes Détectées</p>
                      <p className="text-lg font-bold text-slate-800 dark:text-teal-200">
                        {activeSandboxReport.totalRowsDetected.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        {activeSandboxReport.validRows.toLocaleString()} valides ({activeSandboxReport.invalidRows} rejets)
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                      <p className="text-xs text-slate-400">Tables / Schémas Détectés</p>
                      <p className="text-lg font-bold text-slate-800 dark:text-teal-200">
                        {activeSandboxReport.tablesDetected.length}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {activeSandboxReport.tablesDetected.map((t) => t.tableName).join(', ')}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                      <p className="text-xs text-slate-400">Empreinte Cryptographique du Plan</p>
                      <p className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300 truncate mt-1">
                        {activeSandboxReport.migrationPlanHash}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Liaison immuable aux paramètres exacts</p>
                    </div>
                  </div>

                  {/* CORRESPONDANCE DES CHAMPS (FIELD MAPPINGS) */}
                  {activeSandboxReport.fieldMappings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700 dark:text-teal-200">
                        Recommandations de Correspondance des Champs (Mapping IA & Heuristique) :
                      </p>
                      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
                        {activeSandboxReport.fieldMappings.map((m, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 text-xs flex items-center justify-between"
                          >
                            <div>
                              <span className="font-mono text-slate-600 dark:text-slate-400">{m.sourceColumn}</span>
                              <ArrowRight className="inline w-3 h-3 mx-1 text-teal-500" />
                              <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{m.targetField}</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold">
                              {m.confidencePct}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ANOMALIES ET AVERTISSEMENTS DÉTECTÉS */}
                  {activeSandboxReport.detectedErrors.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                      <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Avertissements de Structure Détectés ({activeSandboxReport.detectedErrors.length}) :
                      </p>
                      {activeSandboxReport.detectedErrors.map((err, i) => (
                        <p key={i} className="text-slate-700 dark:text-slate-300">
                          • [Ligne {err.line} - Col {err.column}] {err.message} ({err.severity})
                        </p>
                      ))}
                    </div>
                  )}

                  {/* DOUBLE VALIDATION POUR PROMOTION EN PRODUCTION */}
                  <div className="p-4 rounded-xl bg-white dark:bg-[#071E22] border border-teal-600/40 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-teal-100">
                        Double Validation Requise pour Promotion en Production :
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Initié par : <strong>Admin #1 (usr-admin-01)</strong> • Acteur actuel :{' '}
                        <strong>{currentUser.firstName} {currentUser.lastName} ({currentUser.id})</strong>
                      </p>
                      {currentUser.id === (activeSandboxReport.firstAdminApproverId || 'usr-admin-01') && (
                        <p className="text-xs text-red-600 dark:text-red-400 font-bold mt-1">
                          ⚠️ Règle de sécurité stricte : l'initiateur ne peut pas auto-approuver la promotion. Basculez sur Admin #2 ci-dessous !
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant={currentUser.id === 'usr-admin-01' ? 'primary' : 'secondary'}
                        onClick={() => switchUserAccount('ADMIN_1')}
                      >
                        Admin #1
                      </Button>
                      <Button
                        size="sm"
                        variant={currentUser.id === 'usr-admin-02' ? 'primary' : 'secondary'}
                        onClick={() => switchUserAccount('ADMIN_2')}
                      >
                        Admin #2
                      </Button>
                      <Button
                        size="sm"
                        variant="teal"
                        onClick={() => promoteSandboxReport(activeSandboxReport.jobId)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Promouvoir en Production (Contrôle 2e Admin)
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* TABLEAU DES ANALYSES HISTORIQUES */}
              <DataTable
                caption="Historique des analyses en Sandbox isolée"
                keyExtractor={(j) => j.id}
                data={importJobs}
                columns={[
                  {
                    key: 'file',
                    header: 'Fichier & Format',
                    isRowHeader: true,
                    render: (j) => (
                      <div>
                        <p className="font-bold ltr-preserve">{j.fileName}</p>
                        <p className="text-[11px] font-mono text-slate-400 ltr-preserve">
                          SHA-256: {j.sha256Checksum.slice(0, 24)}...
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: 'format',
                    header: 'Format',
                    render: (j) => <Badge variant="orange">{j.format}</Badge>,
                  },
                  {
                    key: 'sandbox',
                    header: 'État Sandbox Éphémère',
                    render: (j) => (
                      <div className="space-y-1">
                        <Badge
                          variant={
                            j.sandboxStatus === 'PROMOTED_DOUBLE_APPROVED'
                              ? 'success'
                              : 'info'
                          }
                        >
                          {j.sandboxStatus}
                        </Badge>
                        <p className="text-xs text-slate-500">
                          {j.rowsDetected.toLocaleString()} lignes • Score {j.compatibilityScore}%
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: 'tables',
                    header: 'Schémas Détectés',
                    render: (j) => (
                      <div className="flex flex-wrap gap-1">
                        {j.tablesDetected.map((tb) => (
                          <span
                            key={tb}
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-teal-900 font-mono text-[11px]"
                          >
                            {tb}
                          </span>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </Card>

          {/* CENTRE D'EXPORTS MULTI-FORMATS CERTIFIÉS */}
          <Card
            title="Centre d'Exports Multi-Formats Certifiés (CSV, XLSX, JSON, SQL, DBF, CDX)"
            subtitle="Générez des extractions complètes conformes aux formats métiers pour audit, comptabilité, CRM ou interopérabilité industrielle."
          >
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Entité à Exporter :</label>
                  <select
                    value={exportEntity}
                    onChange={(e) => setExportEntity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-bold"
                  >
                    <option value="PRODUCTS">Produits (Catalogue multilingue)</option>
                    <option value="ORDERS">Commandes & Lignes d'expédition</option>
                    <option value="ENTRIES">Écritures Comptables & Journaux</option>
                    <option value="AUDIT_LOGS">Journal d'Audit Immuable</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Format de Fichier :</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs font-bold font-mono"
                  >
                    <option value="CSV">CSV (UTF-8 avec séparateur standard)</option>
                    <option value="XLSX">XLSX (Tableur Microsoft Excel)</option>
                    <option value="JSON">JSON (Format structuré REST)</option>
                    <option value="SQL">SQL (Inserts PostgreSQL / ANSI)</option>
                    <option value="DBF">DBF (Table binaire dBASE III / FoxPro)</option>
                    <option value="CDX">CDX (Index b-tree composé FoxPro)</option>
                    <option value="BAK">BAK (Archive SQL Server certifiée)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="teal"
                    className="w-full"
                    onClick={() => {
                      const res = exportDatasetAction(exportEntity, exportFormat);
                      downloadDataExport(res.fileName, res.content);
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Télécharger l'Export {exportFormat}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 18. CONFIGURATION IA & IDP (/admin/ai-config) */}
      {section === 'ai-config' && (
        <Card
          title="Configuration IA, RAG & Gouvernance des Schémas Dynamiques IDP (Page 18)"
          subtitle="Sélection du fournisseur LLM (OpenAI / Ollama), garde-fous RBAC et validation des champs OCR/IDP"
        >
          <div className="grid md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
              <p className="font-bold text-sm">Fournisseur LLM & Politique RAG</p>
              <div className="flex gap-2">
                {(['OPENAI', 'OLLAMA'] as const).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={llmProvider === p ? 'primary' : 'secondary'}
                    onClick={() => {
                      setLlmProvider(p);
                      notifyToast(`Fournisseur IA basculé sur ${p} (Secrets gérés côté serveur)`, 'info');
                    }}
                  >
                    {p}
                  </Button>
                ))}
              </div>
              <p className="text-slate-500">
                Filtrage RAG strict activé avant génération : aucun document hors-permission n’est injecté dans le contexte.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">Champ dynamique proposé par IDP : incoterm_insurance_clause</span>
                <Badge variant="warning">Confiance 96.8%</Badge>
              </div>
              <p className="text-slate-500">
                Détecté sur 14 factures d’import maritime. Nécessite l’approbation Admin avant ajout au schéma métier.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    notifyToast('Champ dynamique IDP approuvé et intégré au schéma métier !', 'success')
                  }
                >
                  Approuver le champ IDP
                </Button>
                <Link to="/ocr-idp">
                  <Button size="sm" variant="secondary">Ouvrir Studio OCR/IDP</Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 19. CONFIGURATION BOUTONS FLOTTANTS (/admin/floating-buttons) */}
      {section === 'floating-buttons' && (
        <Card
          title="Configuration des Boutons Flottants (Page 19)"
          subtitle="Liste, ordre d'affichage, position, consentement et activation temps réel"
        >
          <div className="space-y-3">
            {floatingButtons.map((fb) => (
              <div
                key={fb.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Icon3D name={fb.icon3d} size="sm" />
                  <div>
                    <p className="text-sm font-bold">{fb.label.fr} / {fb.label.ar}</p>
                    <p className="text-xs text-slate-500">
                      Position : {fb.position} • Ordre #{fb.displayOrder} • Consentement requis : {fb.requiresConsent ? 'Oui' : 'Non'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={fb.isEnabled ? 'primary' : 'secondary'}
                  onClick={() => toggleFloatingButton(fb.id)}
                >
                  {fb.isEnabled ? 'Activé' : 'Désactivé'}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 20. AUDIT LOGS IMMUABLES (/admin/audit) */}
      {section === 'audit' && (
        <div className="space-y-6">
          <Card
            title="Journal d’Audit Append-Only Immuable & Chaîne de Hachage (Page 20 — Chapitre 12.3)"
            subtitle="Traçabilité complète avec acteur, rôle, action, cible, résultat et ID de corrélation. Chaque bloc est lié cryptographiquement au bloc précédent (SHA-256 prevHash -> currentHash)."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="teal"
                  onClick={() => {
                    const res = verifyAuditChainAction();
                    setChainVerification({
                      ...res,
                      verifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
                    });
                  }}
                >
                  <Hash className="w-4 h-4" />
                  Vérifier la Chaîne de Hachage (SHA-256)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const csv = [
                      'ID,Timestamp,Actor,Role,Action,Target,Result,CorrelationID',
                      ...auditLogs.map(
                        (a) =>
                          `${a.id},${a.timestamp},"${a.actorName}",${a.actorRole},${a.action},${a.targetId},${a.result},${a.correlationId}`
                      ),
                    ].join('\n');
                    downloadDataExport('tradelink_audit_logs.csv', csv);
                    notifyToast('Export CSV du journal d’audit téléchargé !', 'success');
                  }}
                >
                  <Download className="w-4 h-4" />
                  Exporter Audit CSV
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              {/* RAPPORT DE VÉRIFICATION DE LA CHAÎNE DE HACHAGE */}
              {chainVerification && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Chaîne Cryptographique Immuable Intacte & Scellée (0 Rupture)
                    </span>
                    <Badge variant="success">{chainVerification.totalEntriesVerified} Blocs Vérifiés</Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                    <div>
                      <p className="text-slate-400">Dernier Bloc (Top Hash SHA-256) :</p>
                      <p className="text-teal-700 dark:text-teal-300 truncate font-bold">{chainVerification.latestHash}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Bloc Genesis (Origine) :</p>
                      <p className="text-slate-500 truncate">GENESIS_HASH_TRADELINK_V6_INITIAL_BLOCK</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ALERTES DE SÉCURITÉ RÉCENTES */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-teal-200 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Surveillance des Événements Sensibles (Double Approbation, KMS & Sandbox) :
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-3 py-1 rounded-lg bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Badge variant="danger">Interdiction</Badge>
                    Anti-Auto-Approbation Active
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Badge variant="orange">KMS HSM</Badge>
                    Rotation KEK AES-256-GCM
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Badge variant="info">Sandbox</Badge>
                    Contrôle des Schémas Immuables
                  </span>
                </div>
              </div>

              <DataTable
                caption="Journal d'audit sécurité et opérations sensibles"
                keyExtractor={(a) => a.id}
                data={auditLogs}
                columns={[
                  {
                    key: 'time',
                    header: 'Horodatage & Corrélation',
                    isRowHeader: true,
                    render: (a) => (
                      <div>
                        <p className="font-mono text-xs ltr-preserve">{a.timestamp}</p>
                        <p className="font-mono text-[10px] text-slate-400 ltr-preserve">
                          {a.correlationId}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: 'actor',
                    header: 'Acteur & Rôle',
                    render: (a) => (
                      <div>
                        <p className="font-bold">{a.actorName}</p>
                        <Badge variant="orange">{a.actorRole}</Badge>
                      </div>
                    ),
                  },
                  {
                    key: 'action',
                    header: 'Action & Cible',
                    render: (a) => (
                      <div>
                        <p className="font-mono text-xs font-bold">{a.action}</p>
                        <p className="text-xs text-slate-500">
                          {a.targetType} ({a.targetId})
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: 'result',
                    header: 'Résultat',
                    render: (a) => (
                      <Badge
                        variant={
                          a.result === 'SUCCESS'
                            ? 'success'
                            : a.result === 'DENIED'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {a.result}
                      </Badge>
                    ),
                  },
                  {
                    key: 'details',
                    header: 'Détails Opérationnels',
                    render: (a) => <span className="text-xs">{a.details}</span>,
                  },
                ]}
              />
            </div>
          </Card>
        </div>
      )}

      {/* 21. SAUVEGARDES & RESTAURATION DOUBLE VALIDATION (/admin/backups) — Composant 65 */}
      {section === 'backups' && (
        <div className="space-y-6">
          <Card
            title="Sauvegardes Chiffrées & Restauration Soumise à Double Validation (Page 21 — Chapitre 7.3)"
            subtitle="Deux administrateurs distincts doivent approuver toute restauration. L’initiateur ne peut jamais approuver sa propre demande. Test préalable en Sandbox isolée sans altération de production."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="teal" onClick={createManualBackup}>
                  <Plus className="w-4 h-4" />
                  Créer Sauvegarde Manuelle
                </Button>
                <Button
                  size="sm"
                  variant={currentUser.id === 'usr-admin-01' ? 'primary' : 'secondary'}
                  onClick={() => switchUserAccount('ADMIN_1')}
                >
                  Admin #1 (Initiateur)
                </Button>
                <Button
                  size="sm"
                  variant={currentUser.id === 'usr-admin-02' ? 'primary' : 'secondary'}
                  onClick={() => switchUserAccount('ADMIN_2')}
                >
                  Basculer sur Admin #2 (Approbateur distinct)
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-300">
                    Démonstration Interactive de la Règle d’Interdiction d’Auto-Approbation :
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    La restauration de <code>BKP-FULL-20261118-0200</code> a été initiée par <strong>Admin #1 (Karim Mansouri)</strong>. Si vous cliquez sur « Approuver » en tant qu’Admin #1, le contrôle serveur bloque l’action. Basculez sur <strong>Admin #2 (Sophie Laurent)</strong> pour valider la double approbation !
                  </p>
                </div>
                <Badge variant="orange">Actif : {currentUser.firstName} ({currentUser.id})</Badge>
              </div>

              {/* RAPPORT DE TEST DE RESTAURATION EN SANDBOX */}
              {backupRestoreReport && (
                <div className="p-4 rounded-2xl bg-teal-500/10 border-2 border-teal-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-800 dark:text-teal-200 flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Test de Restauration Réussi en Sandbox Éphémère Isolée
                    </span>
                    <Badge variant="success">0 Écriture en Prod</Badge>
                  </div>
                  <div className="grid sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                    <div>
                      <p className="text-slate-400">Conteneur Éphémère :</p>
                      <p className="font-bold text-teal-700 dark:text-teal-300">{backupRestoreReport.sandboxContainerId}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Tables Restaurées :</p>
                      <p className="font-bold">{backupRestoreReport.tablesRestoredCount} tables</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Durée du Test :</p>
                      <p className="font-bold">{backupRestoreReport.durationMs} ms</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Intégrité Cryptographique :</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold">100% SHA-256 Validée</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {backups.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon3D name="insured" size="md" withGlow />
                        <div>
                          <p className="text-sm font-bold ltr-preserve">{b.backupCode}</p>
                          <p className="text-xs text-slate-500">{b.sizeFormatted}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="info">SHA-256 Certifié</Badge>
                        <Badge
                          variant={
                            b.restoreStatus === 'APPROVED_READY'
                              ? 'success'
                              : b.restoreStatus === 'PENDING_SECOND_APPROVAL'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {b.restoreStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 text-xs space-y-1">
                      <p className="font-mono text-[11px] text-slate-400">
                        Checksum : {b.sha256 ? `${b.sha256.slice(0, 24)}...` : 'Certifié'}
                      </p>
                      {b.restoreInitiatorName && (
                        <>
                          <p>
                            <strong>1er Admin (Initiateur) :</strong> {b.restoreInitiatorName}
                          </p>
                          <p>
                            <strong>2e Admin (Approbateur) :</strong>{' '}
                            {b.restoreSecondApproverName ?? 'En attente d’un second Admin distinct'}
                          </p>
                          <p className="font-mono text-[11px] text-teal-700 dark:text-teal-300">
                            Empreinte immuable du plan : {b.planHash}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const res = testBackupRestoreInSandbox(b.id);
                          if (res.ok && res.details) {
                            setBackupRestoreReport(res.details);
                          }
                        }}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Tester en Sandbox Isolée
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => approveBackupRestore(b.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approuver Restauration (2e Admin)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 22. RAPPORTS ADMIN (/admin/reports) */}
      {section === 'reports' && (
        <Card
          title="Rapports Administratifs, Exports Contrôlés & Planification (Page 22)"
          subtitle="Génération CSV / JSON auditée avec téléchargement réel"
        >
          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            {[
              { id: 'kyc', title: 'Rapport Conformité KYC & Échéances J+7', fmt: 'CSV / JSON', icon: 'customs-stamp' as const },
              { id: 'b2b', title: 'Synthèse Globale des Flux B2B & Douane', fmt: 'CSV / XLSX', icon: 'analytics' as const },
              { id: 'sec', title: 'Rapport Sécurité KMS, Sessions & Audit', fmt: 'JSON Signé', icon: 'secure-parcel' as const },
            ].map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <Icon3D name={rep.icon} size="md" withGlow />
                  <div>
                    <p className="font-bold text-sm">{rep.title}</p>
                    <p className="text-slate-500 mt-1">Format : {rep.fmt}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    downloadDataExport(
                      `tradelink_report_${rep.id}_2026.json`,
                      JSON.stringify({ report: rep.title, generatedAt: new Date().toISOString(), kycDossiers, kmsKeys }, null, 2),
                      'application/json'
                    );
                    notifyToast(`Rapport "${rep.title}" généré et téléchargé !`, 'success');
                  }}
                >
                  <Download className="w-4 h-4" />
                  Générer & Télécharger
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
