// ============================================================================
// TRADELINK V6.0 — COMPOSANTS MÉTIERS DU MODULE KYC COMPLET (PROMPT 6)
// Interfaces : Client (/client/kyc, /client/kyc/upload), Fournisseur (/fournisseur/kyc),
// Transporteur (/transporteur/kyc) et Administrateur (/admin/kyc, /admin/kyc/:id)
// Conforme aux guides modern-web-guidance : progress, validate-input-after-interaction, dialog
// ============================================================================

import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Globe,
  History,
  Link2,
  Lock,
  MessageSquarePlus,
  Play,
  RefreshCw,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { translateStatus } from '../../i18n/translations';
import { evaluateKYCDossierRule } from '../../services/backendServices';
import {
  checkMandatoryKycCompletion,
  generateKycPresignedDocumentUrl,
  getRequiredDocsForDossier,
  KYC_REQUIRED_DOCUMENTS_BY_PROFILE,
  KycActorProfile,
  KycCronExecutionReport,
} from '../../services/kycEngine';
import { KYCDocumentItem, KYCDossier } from '../../types';
import { Badge, Button, Card, Modal } from '../ui/DesignSystem';
import { Icon3D } from '../ui/Icon3D';

// ============================================================================
// 1. VUE ACTEUR MÉTIER (CLIENT, FOURNISSEUR, TRANSPORTEUR)
// ============================================================================

export const ActorKycWorkspaceView: React.FC<{
  actorProfile: KycActorProfile;
  focusUploadSection?: boolean;
}> = ({ actorProfile, focusUploadSection = false }) => {
  const {
    locale,
    currentUser,
    kycDossiers,
    uploadKycDocumentForDossier,
    recordKycDocumentPreview,
    updateKycProfile,
  } = useApp();

  const progressId = useId();
  const docRefInputId = useId();
  const docRefHintId = useId();
  const docRefErrorId = useId();

  // Sélection du dossier correspondant au profil actif
  const myDossier: KYCDossier =
    kycDossiers.find((d) => d.userId === currentUser.id) ??
    kycDossiers.find((d) => d.actorType === actorProfile) ??
    kycDossiers[0];

  const requiredSpecs = getRequiredDocsForDossier(actorProfile, myDossier.jurisdiction);
  const completion = checkMandatoryKycCompletion(actorProfile, myDossier.documents, myDossier.jurisdiction);
  const ruleEval = evaluateKYCDossierRule(myDossier);

  const [selectedDocType, setSelectedDocType] = useState<string>(
    requiredSpecs[0]?.docType ?? 'CIN_DIRIGEANT'
  );
  const [documentReferenceNumber, setDocumentReferenceNumber] = useState<string>('REF-2026-99401');
  const [selectedFileName, setSelectedFileName] = useState<string>(
    `${requiredSpecs[0]?.docType ?? 'DOC'}_${myDossier.companyName.replace(/\s+/g, '_')}_2026.pdf`
  );
  const [refInputInvalid, setRefInputInvalid] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<KYCDocumentItem | null>(null);

  // Formulaire d'informations juridiques et représentant légal (Prompt 02)
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [representativeName, setRepresentativeName] = useState(
    myDossier.representativeName ?? myDossier.userName
  );
  const [representativeIdNumber, setRepresentativeIdNumber] = useState(
    myDossier.representativeIdNumber ?? 'CIN-AB98214'
  );
  const [representativeNationality, setRepresentativeNationality] = useState(
    myDossier.representativeNationality ??
      (myDossier.jurisdiction === 'MA'
        ? 'Marocaine'
        : myDossier.jurisdiction === 'FR'
        ? 'Française'
        : myDossier.jurisdiction === 'DE'
        ? 'Allemande'
        : 'Internationale')
  );
  const [companyLegalType, setCompanyLegalType] = useState(
    myDossier.companyLegalType ?? 'SARL'
  );
  const [registrationNumber, setRegistrationNumber] = useState(
    myDossier.registrationNumber ?? 'ICE-002948192000034'
  );
  const [businessAddress, setBusinessAddress] = useState(
    myDossier.businessAddress ?? 'Zone Industrielle Ain Sebaâ, Boulevard Chefchaouni'
  );
  const [city, setCity] = useState(myDossier.city ?? 'Casablanca');
  const [postalCode, setPostalCode] = useState(myDossier.postalCode ?? '20250');
  const [phoneNumber, setPhoneNumber] = useState(
    myDossier.phoneNumber ?? '+212 522 99 88 77'
  );
  const [legalCapital, setLegalCapital] = useState(
    myDossier.legalCapital ? String(myDossier.legalCapital) : '100000'
  );

  const handleSaveLegalProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateKycProfile(myDossier.id, {
      representativeName,
      representativeIdNumber,
      representativeNationality,
      companyLegalType,
      registrationNumber,
      businessAddress,
      city,
      postalCode,
      phoneNumber,
      legalCapital: Number(legalCapital) || 100000,
    });
    setProfileFormOpen(false);
  };

  const handleUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!/^[A-Za-z0-9\-_/]{4,40}$/.test(documentReferenceNumber.trim())) {
      setRefInputInvalid(true);
      return;
    }
    setRefInputInvalid(false);
    const finalFileName = selectedFileName.trim() || `${selectedDocType}_2026.pdf`;
    uploadKycDocumentForDossier(myDossier.id, selectedDocType, finalFileName, 524_288);
  };

  return (
    <div className="space-y-6">
      {/* Bandeau supérieur : Compte à rebours 7 jours & Barre de progression native <progress> */}
      <Card
        title={`Dossier KYC ${actorProfile} — ${myDossier.companyName}`}
        subtitle={`Juridiction : ${myDossier.jurisdiction} • Ouvert le ${myDossier.startedAt} • Échéance J+7 : ${myDossier.deadlineAt}`}
        action={
          <Badge
            variant={
              myDossier.status === 'VALIDATED' ||
              myDossier.status === 'SUBMITTED_IN_TIME_PENDING_REVIEW'
                ? 'success'
                : myDossier.status === 'PENDING_SUBMISSION' ||
                  myDossier.status === 'COMPLEMENT_REQUESTED'
                ? 'warning'
                : 'danger'
            }
          >
            {translateStatus(myDossier.status, locale)}
          </Badge>
        }
      >
        <div className="space-y-5">
          {/* Alerte Règle Métier J+7 */}
          <div
            className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
              ruleEval.protectedFromAutoSuspension
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
            }`}
          >
            <Icon3D
              name={ruleEval.protectedFromAutoSuspension ? 'insured' : 'fast-delivery'}
              size="md"
              withGlow
            />
            <div className="space-y-1 flex-1">
              <p className="font-bold text-sm">
                {ruleEval.protectedFromAutoSuspension
                  ? 'Protection J+7 Active : Documents soumis dans les délais'
                  : `Compte à rebours réglementaire de 7 jours : J+${myDossier.daysElapsed} (${myDossier.daysRemaining} jour(s) restant(s))`}
              </p>
              <p>{ruleEval.explanation}</p>
              {myDossier.rejectionReason && (
                <p className="text-red-600 dark:text-red-300 font-semibold mt-1">
                  Motif de rejet administratif : {myDossier.rejectionReason}
                </p>
              )}
              {myDossier.complementReason && (
                <p className="text-amber-700 dark:text-amber-300 font-semibold mt-1">
                  Demande de complément administratif : {myDossier.complementReason}
                </p>
              )}
            </div>
          </div>

          {/* Barre de progression native <progress> conforme au guide progress */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor={progressId} className="font-bold text-slate-800 dark:text-slate-100">
                Progression des pièces obligatoires ({actorProfile}) : {completion.uploadedMandatory} /{' '}
                {completion.totalMandatory} déposées
              </label>
              <span
                role="status"
                aria-live="polite"
                className="font-mono font-bold text-[#E85D22]"
              >
                {completion.progressPercent}% complété
              </span>
            </div>
            <progress
              id={progressId}
              className="tradelink-progress w-full h-3 block"
              max={100}
              value={completion.progressPercent}
            />
          </div>

          {/* Frise chronologique J+0 -> J+1 -> J+3 -> J+5 -> J+6 -> J+7 */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center text-xs">
            {[
              {
                day: 'J+0',
                label: 'Ouverture & OTP',
                sent: true,
                active: false,
              },
              {
                day: 'J+1',
                label: 'Relance #1',
                sent: myDossier.remindersSent.includes('J+1'),
                active: myDossier.daysElapsed === 1,
              },
              {
                day: 'J+3',
                label: 'Relance #2',
                sent: myDossier.remindersSent.includes('J+3'),
                active: myDossier.daysElapsed === 3,
              },
              {
                day: 'J+5',
                label: 'Relance #3',
                sent: myDossier.remindersSent.includes('J+5'),
                active: myDossier.daysElapsed === 5,
              },
              {
                day: 'J+6',
                label: 'Relance Finale',
                sent: myDossier.remindersSent.includes('J+6'),
                active: myDossier.daysElapsed === 6,
              },
              {
                day: 'J+7',
                label: completion.allMandatoryUploaded
                  ? 'Protégé (Soumis à temps)'
                  : 'Suspension si non soumis',
                sent: completion.allMandatoryUploaded,
                active: myDossier.daysElapsed >= 7,
              },
            ].map((step) => (
              <div
                key={step.day}
                className={`p-3 rounded-xl border transition-all ${
                  step.day === 'J+7' && completion.allMandatoryUploaded
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold'
                    : step.active
                    ? 'bg-orange-500/15 border-[#E85D22] font-bold'
                    : 'bg-slate-50 dark:bg-[#082225] border-slate-200 dark:border-teal-800'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="font-mono font-bold text-[#E85D22]">{step.day}</span>
                  {step.sent && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
                <p className="mt-1 text-[11px]">{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Profil Juridique de l'Entreprise et du Représentant Légal (PROMPT 02) */}
      <Card
        title="Informations Légales & Identité du Représentant"
        subtitle={`Raison sociale : ${myDossier.companyName} • Forme : ${myDossier.companyLegalType ?? 'SARL'} • Immatriculation : ${myDossier.registrationNumber ?? 'ICE / SIRET'}`}
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setProfileFormOpen((prev) => !prev)}
          >
            <Building2 className="w-3.5 h-3.5" />
            {profileFormOpen ? 'Fermer le formulaire' : 'Modifier les coordonnées légales'}
          </Button>
        }
      >
        {profileFormOpen ? (
          <form onSubmit={handleSaveLegalProfile} className="space-y-4 text-xs">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                  Nom & Prénom du représentant :
                </label>
                <input
                  type="text"
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                  N° Pièce d'identité (CIN / Passeport) :
                </label>
                <input
                  type="text"
                  value={representativeIdNumber}
                  onChange={(e) => setRepresentativeIdNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                  Nationalité du dirigeant :
                </label>
                <input
                  type="text"
                  value={representativeNationality}
                  onChange={(e) => setRepresentativeNationality(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                  Forme juridique de l'entreprise :
                </label>
                <select
                  value={companyLegalType}
                  onChange={(e) => setCompanyLegalType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-3 py-2 text-xs"
                >
                  <option value="SARL">SARL / SARL-AU (Société à Responsabilité Limitée)</option>
                  <option value="SA">SA (Société Anonyme)</option>
                  <option value="SAS">SAS / SASU (Société par Actions Simplifiée)</option>
                  <option value="GmbH">GmbH / AG (Allemagne)</option>
                  <option value="LLC">LLC / FZE / Free Zone (UAE / Intl)</option>
                  <option value="EI">Entreprise Individuelle / Auto-entrepreneur</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                  N° Immatriculation (ICE / SIRET / RC) :
                </label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-3 py-2 text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                  Capital social (€ ou équivalent) :
                </label>
                <input
                  type="number"
                  value={legalCapital}
                  onChange={(e) => setLegalCapital(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-3 py-2 text-xs font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                  Adresse du siège social :
                </label>
                <input
                  type="text"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                  Ville & Code Postal :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ville"
                    className="flex-1 rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-3 py-2 text-xs"
                    required
                  />
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="CP"
                    className="w-20 rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-3 py-2 text-xs font-mono"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
                  Téléphone professionnel vérifié :
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-3 py-2 text-xs font-mono"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-teal-800">
              <Button type="button" variant="secondary" onClick={() => setProfileFormOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Enregistrer les Coordonnées Légales
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
              <span className="text-slate-400">Représentant légal :</span>
              <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {myDossier.representativeName ?? myDossier.userName}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                {myDossier.representativeIdNumber ?? 'CIN-AB98214'} ({myDossier.representativeNationality ?? 'Marocaine'})
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
              <span className="text-slate-400">Forme & Immatriculation :</span>
              <p className="font-bold text-[#E85D22] mt-0.5">
                {myDossier.companyLegalType ?? 'SARL'}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                N° : {myDossier.registrationNumber ?? 'ICE-002948192000034'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
              <span className="text-slate-400">Siège social :</span>
              <p className="font-medium text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                {myDossier.businessAddress ?? 'Zone Industrielle Ain Sebaâ'}
              </p>
              <p className="text-[11px] text-slate-500">
                {myDossier.city ?? 'Casablanca'} ({myDossier.postalCode ?? '20250'})
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
              <span className="text-slate-400">Juridiction & Contact :</span>
              <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {myDossier.jurisdiction} • {myDossier.phoneNumber ?? '+212 522 99 88 77'}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Capital : {myDossier.legalCapital ? `${myDossier.legalCapital} EUR` : '100 000 EUR'}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Liste des documents requis selon le profil (CLIENT / FOURNISSEUR / TRANSPORTEUR) */}
      <Card
        title={`Liste des Justificatifs Requis selon le Profil ${actorProfile}`}
        subtitle="Chiffrement par enveloppe AES-256-GCM (KMS) + Empreinte SHA-256 + Scan Antivirus ClamAV"
      >
        <div className="grid md:grid-cols-2 gap-4">
          {requiredSpecs.map((spec) => {
            const uploadedDoc = myDossier.documents.find(
              (d) =>
                d.docType === spec.docType ||
                (spec.docType === 'CIN_DIRIGEANT' && d.docType === 'CIN') ||
                (spec.docType === 'PATENTE_FISCAL' && d.docType === 'PATENTE') ||
                ((spec.docType === 'RNE_KBIS' || spec.docType === 'RNE_HANDELSREGISTER') &&
                  d.docType === 'RNE') ||
                (spec.docType === 'PERMIS_CE_CARTE_GRISE' && d.docType === 'PERMIS')
            );

            return (
              <div
                key={spec.docType}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-col justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[#E85D22]">{spec.docType}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={spec.mandatory ? 'orange' : 'neutral'}>
                        {spec.mandatory ? 'Obligatoire' : 'Optionnel'}
                      </Badge>
                      {uploadedDoc ? (
                        <Badge
                          variant={
                            uploadedDoc.status === 'VALIDATED'
                              ? 'success'
                              : uploadedDoc.status === 'REJECTED'
                              ? 'danger'
                              : 'info'
                          }
                        >
                          {uploadedDoc.status === 'VALIDATED'
                            ? 'Validé Admin'
                            : uploadedDoc.status === 'REJECTED'
                            ? 'Rejeté'
                            : 'Déposé & Chiffré'}
                        </Badge>
                      ) : (
                        <Badge variant="warning">Pièce manquante</Badge>
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {locale === 'ar'
                      ? spec.labelAr
                      : locale === 'en'
                      ? spec.labelEn
                      : spec.labelFr}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">{spec.descriptionFr}</p>
                  <p className="text-[11px] text-slate-400">
                    Formats : {spec.acceptedFormats} • Taille max : {spec.maxSizeMb} Mo
                  </p>
                </div>

                {uploadedDoc ? (
                  <div className="pt-2 border-t border-slate-200/70 dark:border-teal-800/60 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono truncate max-w-[220px] ltr-preserve">
                        {uploadedDoc.fileName}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ AES-256-GCM
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          recordKycDocumentPreview(
                            myDossier.id,
                            uploadedDoc.id,
                            uploadedDoc.fileName
                          );
                          setPreviewDoc(uploadedDoc);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Prévisualiser (Déchiffrement KMS)
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedDocType(spec.docType);
                          setSelectedFileName(
                            `${spec.docType}_${myDossier.companyName.replace(/\s+/g, '_')}_MAJ.pdf`
                          );
                        }}
                      >
                        Remplacer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200/70 dark:border-teal-800/60 flex justify-end">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setSelectedDocType(spec.docType);
                        setSelectedFileName(
                          `${spec.docType}_${myDossier.companyName.replace(/\s+/g, '_')}_2026.pdf`
                        );
                      }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Sélectionner pour dépôt
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Formulaire de Dépôt Sécurisé & Upload Chiffré (conforme à validate-input-after-interaction) */}
      <Card
        title="Dépôt & Téléversement Sécurisé de Justificatif KYC (Chiffrement KMS AES-256-GCM)"
        subtitle={
          focusUploadSection
            ? 'Sélectionnez le type de pièce, renseignez sa référence officielle et déposez le fichier.'
            : 'Chaque fichier est contrôlé par l’antivirus, haché en SHA-256 et chiffré avant stockage S3/MinIO.'
        }
      >
        <form onSubmit={handleUploadSubmit} className="grid sm:grid-cols-3 gap-4 items-start text-xs">
          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
              1. Type de document requis ({actorProfile})
            </label>
            <span className="block text-[11px] text-slate-500 mb-1.5">
              Choisissez la pièce correspondant à votre profil métier
            </span>
            <select
              value={selectedDocType}
              onChange={(e) => {
                setSelectedDocType(e.target.value);
                setSelectedFileName(
                  `${e.target.value}_${myDossier.companyName.replace(/\s+/g, '_')}_2026.pdf`
                );
              }}
              className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#082225] px-3 py-2.5 text-xs font-semibold"
            >
              {requiredSpecs.map((s) => (
                <option key={s.docType} value={s.docType}>
                  {s.docType} — {s.labelFr} ({s.mandatory ? 'Obligatoire' : 'Optionnel'})
                </option>
              ))}
            </select>
          </div>

          {/* Champ avec validation différée après interaction (validate-input-after-interaction) */}
          <div>
            <label
              htmlFor={docRefInputId}
              className="block font-bold mb-1 text-slate-700 dark:text-slate-200"
            >
              2. N° de référence officielle de la pièce
            </label>
            {/* Indication placée AU-DESSUS de l'input pour ne jamais être masquée par le clavier ou l'autofill */}
            <span id={docRefHintId} className="block text-[11px] text-slate-500 mb-1.5">
              Format : 4 à 40 caractères alphanumériques (ex: RC-448912 ou ICE-002918)
            </span>
            <input
              id={docRefInputId}
              type="text"
              required
              pattern="[A-Za-z0-9\-_/]{4,40}"
              value={documentReferenceNumber}
              aria-invalid={refInputInvalid ? 'true' : 'false'}
              aria-describedby={
                refInputInvalid ? `${docRefHintId} ${docRefErrorId}` : docRefHintId
              }
              data-error={docRefErrorId}
              onChange={(e) => {
                setDocumentReferenceNumber(e.target.value);
                if (refInputInvalid && /^[A-Za-z0-9\-_/]{4,40}$/.test(e.target.value.trim())) {
                  setRefInputInvalid(false);
                }
              }}
              onBlur={(e) => {
                const valid = /^[A-Za-z0-9\-_/]{4,40}$/.test(e.target.value.trim());
                setRefInputInvalid(!valid);
              }}
              className="tradelink-validated-input w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#082225] px-3 py-2.5 text-xs font-mono"
            />
            {refInputInvalid && (
              <div id={docRefErrorId} className="text-red-600 dark:text-red-400 text-[11px] mt-1 font-semibold">
                <span role="img" aria-label="Erreur">
                  ❌
                </span>{' '}
                Veuillez saisir un numéro de pièce valide (4 à 40 caractères : lettres, chiffres, tirets).
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-200">
              3. Fichier à chiffrer et déposer (PDF, JPG, PNG)
            </label>
            <span className="block text-[11px] text-slate-500 mb-1.5">
              Taille maximale : 10 Mo • Scan ClamAV automatique
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedFileName}
                onChange={(e) => setSelectedFileName(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#082225] px-3 py-2.5 text-xs font-mono"
              />
              <Button type="submit" variant="primary">
                <Lock className="w-3.5 h-3.5" />
                Chiffrer & Déposer
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Commentaires Administratifs & Historique Complet du Dossier */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card
          title="Commentaires Administratifs & Demandes de Complément"
          subtitle="Annotations officielles de l’équipe Conformité TRADELINK"
        >
          <div className="space-y-3 text-xs">
            {(myDossier.adminComments ?? [])
              .filter((c) => c.visibility === 'SHARED_WITH_APPLICANT')
              .map((com) => (
                <div
                  key={com.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-bold text-[#E85D22]">{com.authorName}</span>
                    <span className="font-mono">{com.createdAt}</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{com.comment}</p>
                </div>
              ))}
            {(myDossier.adminComments ?? []).filter((c) => c.visibility === 'SHARED_WITH_APPLICANT')
              .length === 0 && (
              <p className="text-slate-500 italic">Aucun commentaire administratif pour le moment.</p>
            )}
          </div>
        </Card>

        <Card
          title="Historique Complet & Journal d’Audit KYC"
          subtitle="Traçabilité horodatée des dépôts, relances J+1/J+3/J+5/J+6 et décisions"
        >
          <div className="space-y-2.5 text-xs max-h-72 overflow-y-auto pe-1">
            {(myDossier.history ?? []).map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <Badge variant="info">{h.action}</Badge>
                  <span className="font-mono text-slate-400">{h.timestamp}</span>
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{h.summary}</p>
                <p className="text-[11px] text-slate-500">
                  Acteur : {h.actorName} ({h.actorRole})
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Visionneuse de Prévisualisation Sécurisée (Modale native <dialog>) */}
      <Modal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={`Prévisualisation Sécurisée KMS : ${previewDoc?.fileName ?? ''}`}
      >
        {previewDoc && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold">
                  Déchiffrement à la volée AES-256-GCM autorisé & journalisé dans l’Audit
                </span>
              </div>
              <Badge variant="success">{previewDoc.virusScanStatus ?? 'CLEAN'}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
              <div>
                <span className="text-slate-500">Type de pièce :</span>
                <p className="font-bold text-[#E85D22]">{previewDoc.docType}</p>
              </div>
              <div>
                <span className="text-slate-500">Date de dépôt :</span>
                <p className="font-mono font-semibold">{previewDoc.uploadedAt}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Empreinte d’intégrité SHA-256 :</span>
                <p className="font-mono text-[11px] break-all ltr-preserve">{previewDoc.sha256}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Enveloppe KMS (KEK &rarr; DEK) :</span>
                <p className="font-mono text-[11px] ltr-preserve">{previewDoc.encryptionKeyId}</p>
              </div>
              {previewDoc.encryptedVaultUri && (
                <div className="col-span-2">
                  <span className="text-slate-500">URI Coffre S3/MinIO chiffré :</span>
                  <p className="font-mono text-[11px] break-all ltr-preserve">
                    {previewDoc.encryptedVaultUri}
                  </p>
                </div>
              )}
            </div>

            {/* Aperçu visuel simulé du document officiel */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#061C1E] border-2 border-dashed border-slate-300 dark:border-teal-700 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-teal-800 pb-2">
                <span className="font-extrabold text-sm">
                  APERÇU DOCUMENT OFFICIEL CERTIFIÉ — {myDossier.companyName}
                </span>
                <Badge variant="orange">{myDossier.jurisdiction}</Badge>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>Intitulé :</strong> {previewDoc.label}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                <strong>Titulaire :</strong> {myDossier.companyName} ({myDossier.userName})
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                ✓ Signature numérique et intégrité binaire vérifiées sans altération.
              </p>
            </div>

            {/* Lien Présigné Sécurisé (Validité 15 min / 900s) */}
            {(() => {
              const presigned = generateKycPresignedDocumentUrl({
                dossierId: myDossier.id,
                docId: previewDoc.id,
                fileName: previewDoc.fileName,
              });
              return (
                <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-[#E85D22]">
                      <Link2 className="w-4 h-4" />
                      Lien de Téléchargement Présigné S3/MinIO (Valide 15 min)
                    </span>
                    <Badge variant="orange">900 s restantes</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Jeton HMAC-SHA256 éphémère restreint à votre identité. Évite toute exposition de clé d'API.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={presigned.url}
                      className="flex-1 font-mono text-[10px] bg-white dark:bg-[#082225] border border-slate-300 dark:border-teal-700 rounded-lg px-2 py-1 truncate"
                    />
                    <a
                      href={presigned.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-[#E85D22] text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ouvrir
                    </a>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setPreviewDoc(null)}>
                Fermer la visionneuse
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============================================================================
// 2. VUE SUPERVISION ADMINISTRATEUR (/admin/kyc & /admin/kyc/:id)
// ============================================================================

export const AdminKycSupervisionView: React.FC<{
  selectedDossierIdParam?: string;
}> = ({ selectedDossierIdParam }) => {
  const {
    locale,
    kycDossiers,
    reviewKYCDossier,
    addAdminKycComment,
    triggerKycScheduledCron,
    recordKycDocumentPreview,
  } = useApp();

  const [profileFilter, setProfileFilter] = useState<'ALL' | KycActorProfile>('ALL');
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modalAction, setModalAction] = useState<{
    dossierId: string;
    decision: 'REJECTED' | 'COMPLEMENT_REQUESTED' | 'REACTIVATE';
  } | null>(null);
  const [selectedComplementDocs, setSelectedComplementDocs] = useState<string[]>([]);
  const [decisionReason, setDecisionReason] = useState('');
  const [newAdminComment, setNewAdminComment] = useState('');
  const [commentVisibility, setCommentVisibility] = useState<
    'SHARED_WITH_APPLICANT' | 'INTERNAL_ADMIN_ONLY'
  >('SHARED_WITH_APPLICANT');
  const [cronReport, setCronReport] = useState<KycCronExecutionReport | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    dossier: KYCDossier;
    doc: KYCDocumentItem;
  } | null>(null);

  const filteredDossiers = kycDossiers.filter((d) => {
    if (profileFilter !== 'ALL' && d.actorType !== profileFilter) return false;
    if (jurisdictionFilter !== 'ALL' && d.jurisdiction !== jurisdictionFilter) return false;
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    return true;
  });

  const focusedDossier = selectedDossierIdParam
    ? kycDossiers.find((d) => d.id === selectedDossierIdParam) ?? kycDossiers[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Console de Tâches Programmées KYCCronService (Relances J+1/J+3/J+5/J+6 & Échéance J+7) */}
      <Card
        title="Moteur Planifié KYCCronService — Relances J+1 / J+3 / J+5 / J+6 & Règle J+7"
        subtitle="Règle métier stricte : Suspension à J+7 uniquement si les pièces obligatoires ne sont pas soumises à temps. Les dossiers soumis dans les délais en attente de revue Admin ne sont jamais suspendus."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCronReport(triggerKycScheduledCron())}
            >
              <Play className="w-3.5 h-3.5" />
              Exécuter Cron Quotidien (J courant)
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setCronReport(triggerKycScheduledCron(7))}
            >
              <Clock className="w-3.5 h-3.5" />
              Simuler Échéance J+7 (Test Protection vs Suspension)
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-500">Profil :</span>
              {(['ALL', 'CLIENT', 'FOURNISSEUR', 'TRANSPORTEUR'] as const).map((prof) => (
                <button
                  key={prof}
                  type="button"
                  onClick={() => setProfileFilter(prof)}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
                    profileFilter === prof
                      ? 'bg-[#E85D22] text-white border-[#E85D22]'
                      : 'bg-slate-50 dark:bg-[#082225] border-slate-200 dark:border-teal-800'
                  }`}
                >
                  {prof === 'ALL' ? `Tous (${kycDossiers.length})` : prof}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-500 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Pays :
              </span>
              <select
                value={jurisdictionFilter}
                onChange={(e) => setJurisdictionFilter(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="ALL">Tous pays (Juridictions)</option>
                <option value="MA">Maroc (MA)</option>
                <option value="FR">France (FR)</option>
                <option value="DE">Allemagne (DE)</option>
                <option value="ES">Espagne (ES)</option>
                <option value="AE">Émirats (AE)</option>
                <option value="INTL">International (INTL)</option>
              </select>

              <span className="font-bold text-slate-500 ms-2">Statut :</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="ALL">Tous statuts</option>
                <option value="NON_COMMENCE">1. Non commencé</option>
                <option value="EN_COURS">2. En cours</option>
                <option value="DOCUMENTS_SOUMIS">3. Documents soumis</option>
                <option value="EN_VERIFICATION">4. En vérification</option>
                <option value="COMPLEMENT_DEMANDE">5. Complément demandé</option>
                <option value="VALIDE">6. Validé</option>
                <option value="REJETE">7. Rejeté</option>
                <option value="SUSPENDU">8. Suspendu</option>
              </select>
            </div>

            <Badge variant="info">
              Seul l’Administrateur autorisé (MFA TOTP vérifié) peut valider, rejeter ou réactiver
            </Badge>
          </div>

          {cronReport && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <p className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                Rapport d’exécution KYCCronService ({cronReport.executedAt}) —{' '}
                {cronReport.evaluatedCount} dossiers inspectés :
              </p>
              <ul className="list-disc ps-5 space-y-1">
                <li>
                  <strong>Dossiers soumis à temps protégés contre la suspension J+7 :</strong>{' '}
                  {cronReport.protectedInTimeAtJ7.map((p) => p.companyName).join(', ') || 'Aucun'}
                </li>
                <li>
                  <strong>Dossiers incomplets suspendus automatiquement à J+7 :</strong>{' '}
                  {cronReport.suspendedAtJ7
                    .map((s) => `${s.companyName} (manquant: ${s.missingDocs.join(', ')})`)
                    .join(' ; ') || 'Aucun'}
                </li>
                <li>
                  <strong>Relances J+1 / J+3 / J+5 / J+6 émises :</strong>{' '}
                  {cronReport.remindersTriggered
                    .map((r) => `${r.companyName} (${r.milestone})`)
                    .join(', ') || 'Toutes les relances étaient déjà envoyées'}
                </li>
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Liste ou Vue Détaillée des Dossiers KYC */}
      {(focusedDossier ? [focusedDossier] : filteredDossiers).map((dos) => {
        const evalRule = evaluateKYCDossierRule(dos);
        const completion = checkMandatoryKycCompletion(dos.actorType, dos.documents);
        const specs = KYC_REQUIRED_DOCUMENTS_BY_PROFILE[dos.actorType];

        return (
          <Card
            key={dos.id}
            title={`${dos.companyName} (${dos.actorType}) — ${dos.jurisdiction}`}
            subtitle={`Contact : ${dos.userName} • Début : ${dos.startedAt} • Échéance J+7 : ${dos.deadlineAt} • Rappels envoyés : ${
              dos.remindersSent.join(', ') || 'Aucun'
            }`}
            action={
              <div className="flex items-center gap-2">
                {focusedDossier && (
                  <Link to="/admin/kyc">
                    <Button size="sm" variant="secondary">
                      ← Retour Liste KYC
                    </Button>
                  </Link>
                )}
                <Badge
                  variant={
                    dos.status === 'VALIDATED' ||
                    dos.status === 'SUBMITTED_IN_TIME_PENDING_REVIEW'
                      ? 'success'
                      : dos.status === 'PENDING_SUBMISSION' ||
                        dos.status === 'COMPLEMENT_REQUESTED'
                      ? 'warning'
                      : 'danger'
                  }
                >
                  {translateStatus(dos.status, locale)}
                </Badge>
              </div>
            }
          >
            <div className="space-y-4 text-xs">
              {/* Diagnostic de la règle J+7 & Progression */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>Diagnostic Moteur KYC :</strong> {evalRule.explanation}
                  </span>
                  <span className="font-mono font-bold text-[#E85D22]">
                    Pièces obligatoires : {completion.uploadedMandatory}/{completion.totalMandatory}{' '}
                    ({completion.progressPercent}%)
                  </span>
                </div>
                <progress
                  className="tradelink-progress w-full h-2.5 block"
                  max={100}
                  value={completion.progressPercent}
                  aria-label={`Progression KYC ${dos.companyName}`}
                />
              </div>

              {/* Grille des documents requis vs déposés */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {specs.map((spec) => {
                  const uploaded = dos.documents.find(
                    (d) =>
                      d.docType === spec.docType ||
                      (spec.docType === 'CIN_DIRIGEANT' && d.docType === 'CIN') ||
                      (spec.docType === 'PATENTE_FISCAL' && d.docType === 'PATENTE') ||
                      ((spec.docType === 'RNE_KBIS' || spec.docType === 'RNE_HANDELSREGISTER') &&
                        d.docType === 'RNE') ||
                      (spec.docType === 'PERMIS_CE_CARTE_GRISE' && d.docType === 'PERMIS')
                  );

                  return (
                    <div
                      key={spec.docType}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono font-bold text-[11px] text-[#E85D22]">
                            {spec.docType}
                          </span>
                          <Badge variant={uploaded ? 'success' : spec.mandatory ? 'danger' : 'neutral'}>
                            {uploaded ? 'Chiffré KMS' : spec.mandatory ? 'Manquant' : 'Optionnel'}
                          </Badge>
                        </div>
                        <p className="font-semibold mt-1 line-clamp-2">{spec.labelFr}</p>
                      </div>

                      {uploaded ? (
                        <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-teal-800/60">
                          <p className="font-mono text-[10px] text-slate-500 truncate ltr-preserve">
                            {uploaded.fileName}
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full"
                            onClick={() => {
                              recordKycDocumentPreview(dos.id, uploaded.id, uploaded.fileName);
                              setPreviewDoc({ dossier: dos, doc: uploaded });
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspecter / Déchiffrer
                          </Button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Non déposé</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ajout de commentaire administratif & Historique */}
              {focusedDossier && (
                <div className="grid md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <MessageSquarePlus className="w-4 h-4 text-[#E85D22]" />
                      Commentaires Administratifs ({dos.adminComments?.length ?? 0})
                    </h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newAdminComment}
                        onChange={(e) => setNewAdminComment(e.target.value)}
                        placeholder="Ajouter une note de conformité ou instruction au dossier..."
                        className="flex-1 rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-3 py-2 text-xs"
                      />
                      <select
                        value={commentVisibility}
                        onChange={(e) =>
                          setCommentVisibility(
                            e.target.value as 'SHARED_WITH_APPLICANT' | 'INTERNAL_ADMIN_ONLY'
                          )
                        }
                        className="rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B2D31] px-2 py-2 text-xs"
                      >
                        <option value="SHARED_WITH_APPLICANT">Visible par l’entreprise</option>
                        <option value="INTERNAL_ADMIN_ONLY">Note interne Admin</option>
                      </select>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          addAdminKycComment(dos.id, newAdminComment, commentVisibility);
                          setNewAdminComment('');
                        }}
                      >
                        Publier
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {(dos.adminComments ?? []).map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-bold text-[#E85D22]">{c.authorName}</span>
                            <span>
                              {c.visibility === 'INTERNAL_ADMIN_ONLY' ? '🔒 Interne' : '🌐 Partagé'}{' '}
                              • {c.createdAt}
                            </span>
                          </div>
                          <p className="mt-1">{c.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3">
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <History className="w-4 h-4 text-[#E85D22]" />
                      Historique d’Audit du Dossier ({dos.history?.length ?? 0})
                    </h4>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {(dos.history ?? []).map((h) => (
                        <div
                          key={h.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono font-bold text-[#E85D22]">{h.action}</span>
                            <span className="font-mono text-slate-400">{h.timestamp}</span>
                          </div>
                          <p className="mt-1 font-medium">{h.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Barre d'actions Administrateur : Valider, Demander un complément, Rejeter avec motif, Réactiver */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-teal-800/60">
                <div>
                  {!focusedDossier && (
                    <Link to={`/admin/kyc/${dos.id}`}>
                      <Button size="sm" variant="secondary">
                        <FileCheck2 className="w-3.5 h-3.5" />
                        Ouvrir Dossier Complet, Commentaires & Historique (Page 15)
                      </Button>
                    </Link>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(dos.status === 'SUSPENDED_J7' ||
                    dos.status === 'SUSPENDED_J7_UNSUBMITTED' ||
                    dos.status === 'REJECTED') && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setModalAction({ dossierId: dos.id, decision: 'REACTIVATE' });
                        setDecisionReason(
                          'Pièces justificatives régularisées — Réactivation administrative autorisée.'
                        );
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Réactiver le compte
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setModalAction({ dossierId: dos.id, decision: 'COMPLEMENT_REQUESTED' });
                      setDecisionReason('');
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Demander un complément
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => reviewKYCDossier(dos.id, 'VALIDATED')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Valider le dossier KYC
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setModalAction({ dossierId: dos.id, decision: 'REJECTED' });
                      setDecisionReason('');
                    }}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Rejeter (Motif obligatoire)
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {/* Modale de Décision Motivée (Rejet, Demande de complément ou Réactivation) */}
      <Modal
        open={Boolean(modalAction)}
        onClose={() => setModalAction(null)}
        title={
          modalAction?.decision === 'REJECTED'
            ? 'Rejet Motivé d’un Dossier KYC (Chapitre 6.3)'
            : modalAction?.decision === 'COMPLEMENT_REQUESTED'
            ? 'Demande de Complément Documentaire KYC'
            : 'Réactivation Administrative d’un Compte Suspendu'
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            {modalAction?.decision === 'REJECTED'
              ? 'Conformément au cahier des charges, tout rejet KYC doit obligatoirement comporter un motif explicite qui sera notifié à l’entreprise et journalisé dans l’Audit.'
              : modalAction?.decision === 'COMPLEMENT_REQUESTED'
              ? 'Précisez les pièces à remplacer ou les informations complémentaires attendues de la part de l’entreprise.'
              : 'Indiquez le motif de réactivation administrative du compte.'}
          </p>
          {modalAction?.decision === 'COMPLEMENT_REQUESTED' && (
            <div>
              <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                Sélectionner les pièces requises en complément :
              </label>
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800">
                {['CIN_DIRIGEANT', 'PATENTE_FISCAL', 'RNE_KBIS', 'RIB_ATTESTATION', 'LICENCE_TRANSPORT_INT', 'ISO_GDP_CERT'].map((d) => (
                  <label key={d} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedComplementDocs.includes(d)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedComplementDocs([...selectedComplementDocs, d]);
                        } else {
                          setSelectedComplementDocs(selectedComplementDocs.filter((x) => x !== d));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="font-mono text-[11px]">{d}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold mb-1">
              Motif explicite ({modalAction?.decision}) — Obligatoire :
            </label>
            <textarea
              rows={3}
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="Ex: Extrait RNE daté de plus de 3 mois — veuillez téléverser un extrait RNE/Kbis de moins de 90 jours."
              className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#082225] p-3 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalAction(null)}>
              Annuler
            </Button>
            <Button
              variant={modalAction?.decision === 'REJECTED' ? 'danger' : 'primary'}
              onClick={() => {
                if (modalAction) {
                  reviewKYCDossier(modalAction.dossierId, modalAction.decision, decisionReason);
                  setModalAction(null);
                  setDecisionReason('');
                }
              }}
            >
              Confirmer ({modalAction?.decision})
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modale de Prévisualisation Déchiffrée Admin */}
      <Modal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={`Inspection Cryptographique Admin : ${previewDoc?.doc.fileName ?? ''}`}
      >
        {previewDoc && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <span className="font-bold">
                Pièce déchiffrée à la volée via KMS — Consultation enregistrée dans AuditLog
              </span>
              <Badge variant="success">SHA-256 Vérifié</Badge>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-1.5">
              <p>
                <strong>Entreprise :</strong> {previewDoc.dossier.companyName} (
                {previewDoc.dossier.actorType})
              </p>
              <p>
                <strong>Document :</strong> {previewDoc.doc.label} ({previewDoc.doc.docType})
              </p>
              <p className="font-mono text-[11px] break-all ltr-preserve">
                <strong>SHA-256 :</strong> {previewDoc.doc.sha256}
              </p>
              <p className="font-mono text-[11px] ltr-preserve">
                <strong>Clé KMS :</strong> {previewDoc.doc.encryptionKeyId}
              </p>
            </div>

            {/* Lien Présigné Sécurisé (Validité 15 min / 900s) */}
            {(() => {
              const presigned = generateKycPresignedDocumentUrl({
                dossierId: previewDoc.dossier.id,
                docId: previewDoc.doc.id,
                fileName: previewDoc.doc.fileName,
              });
              return (
                <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-[#E85D22]">
                      <Link2 className="w-4 h-4" />
                      Lien Administrateur Présigné S3/MinIO (Valide 15 min)
                    </span>
                    <Badge variant="orange">Signature HMAC-SHA256</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    URL sécurisée avec jeton cryptographique à usage temporaire (900 s). Journalisation dans l’audit de consultation.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={presigned.url}
                      className="flex-1 font-mono text-[10px] bg-white dark:bg-[#082225] border border-slate-300 dark:border-teal-700 rounded-lg px-2 py-1 truncate"
                    />
                    <a
                      href={presigned.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-[#E85D22] text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Télécharger
                    </a>
                  </div>
                </div>
              );
            })()}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPreviewDoc(null)}>
                Fermer
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  reviewKYCDossier(previewDoc.dossier.id, 'VALIDATED');
                  setPreviewDoc(null);
                }}
              >
                <FileText className="w-3.5 h-3.5" />
                Valider le dossier suite à l’inspection
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
