// ============================================================================
// TRADELINK V6.0 — ROUTAGE EXHAUSTIF DES 79 PAGES AVEC PROTECTION RBAC (RoleGuard)
// Conforme au Chapitre 4 & PROMPT 5 :
// - Chaque espace métier est protégé par <RoleGuard> (et MFA obligatoire pour Admin)
// ============================================================================

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { RoleGuard } from './components/security/RouteGuards';
import {
  LandingPage,
  EditorialPublicPage,
  AuthPortalPage,
} from './pages/PublicAndAuthPages';
import { AdminWorkspacePage } from './pages/AdminWorkspacePages';
import {
  ClientWorkspacePage,
  SupplierWorkspacePage,
} from './pages/ClientAndSupplierPages';
import {
  CarrierWorkspacePage,
  AccountingWorkspacePage,
  SupportWorkspacePage,
  RoomLiveSessionPage,
  OCRStudioPage,
  NotificationsCenterPage,
  ErrorSystemPage,
} from './pages/CarrierAccountingSupportAndTransversalPages';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* ZONE PUBLIQUE (Pages 1 à 5) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<EditorialPublicPage pageType="about" />} />
          <Route path="/contact" element={<EditorialPublicPage pageType="contact" />} />
          <Route path="/blog" element={<EditorialPublicPage pageType="blog" />} />
          <Route path="/legal" element={<EditorialPublicPage pageType="legal" />} />

          {/* ZONE AUTHENTIFICATION (Pages 6 à 10) */}
          <Route path="/register" element={<AuthPortalPage mode="register" />} />
          <Route path="/login" element={<AuthPortalPage mode="login" />} />
          <Route path="/verify-otp" element={<AuthPortalPage mode="otp" />} />
          <Route path="/forgot-password" element={<AuthPortalPage mode="forgot" />} />
          <Route path="/mfa" element={<AuthPortalPage mode="mfa" />} />

          {/* ESPACES PRIVÉS PROTÉGÉS PAR ROLEGUARD & MFA (Pages 11 à 79) */}
          <Route
            path="/*"
            element={
              <AppLayout>
                <Routes>
                  {/* ADMINISTRATEUR (Pages 11 à 22 — Réservé ADMIN + MFA obligatoire) */}
                  <Route path="/admin/dashboard" element={<RoleGuard allowedRoles={['ADMIN']} workspaceLabel="Administration"><AdminWorkspacePage section="dashboard" /></RoleGuard>} />
                  <Route path="/admin/users" element={<RoleGuard allowedRoles={['ADMIN']} workspaceLabel="Administration"><AdminWorkspacePage section="users" /></RoleGuard>} />
                  <Route path="/admin/users/:id" element={<RoleGuard allowedRoles={['ADMIN']} workspaceLabel="Administration"><AdminWorkspacePage section="user-detail" /></RoleGuard>} />
                  <Route path="/admin/kyc" element={<RoleGuard allowedRoles={['ADMIN']} workspaceLabel="Administration"><AdminWorkspacePage section="kyc" /></RoleGuard>} />
                  <Route path="/admin/kyc/:id" element={<RoleGuard allowedRoles={['ADMIN']} workspaceLabel="Administration"><AdminWorkspacePage section="kyc-detail" /></RoleGuard>} />
                  <Route path="/admin/security" element={<RoleGuard allowedRoles={['ADMIN']} workspaceLabel="Administration"><AdminWorkspacePage section="security" /></RoleGuard>} />
                  <Route path="/admin/import-export" element={<RoleGuard allowedRoles={['ADMIN']} workspaceLabel="Administration"><AdminWorkspacePage section="import-export" /></RoleGuard>} />
                  <Route path="/admin/ai-config" element={<RoleGuard allowedRoles={['ADMIN']} workspaceLabel="Administration"><AdminWorkspacePage section="ai-config" /></RoleGuard>} />
                  <Route path="/admin/floating-buttons" element={<RoleGuard allowedRoles={['ADMIN']} workspaceLabel="Administration"><AdminWorkspacePage section="floating-buttons" /></RoleGuard>} />
                  <Route path="/admin/audit" element={<RoleGuard allowedRoles={['ADMIN']} workspaceLabel="Administration"><AdminWorkspacePage section="audit" /></RoleGuard>} />
                  <Route path="/admin/backups" element={<RoleGuard allowedRoles={['ADMIN']} workspaceLabel="Administration"><AdminWorkspacePage section="backups" /></RoleGuard>} />
                  <Route path="/admin/reports" element={<RoleGuard allowedRoles={['ADMIN']} workspaceLabel="Administration"><AdminWorkspacePage section="reports" /></RoleGuard>} />

                  {/* CLIENT B2B (Pages 23 à 39 — Réservé CLIENT & ADMIN) */}
                  <Route path="/client/dashboard" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="dashboard" /></RoleGuard>} />
                  <Route path="/client/kyc" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="kyc" /></RoleGuard>} />
                  <Route path="/client/kyc/upload" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="kyc-upload" /></RoleGuard>} />
                  <Route path="/client/catalogue" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="catalogue" /></RoleGuard>} />
                  <Route path="/client/catalogue/:id" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="product-detail" /></RoleGuard>} />
                  <Route path="/client/panier" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="panier" /></RoleGuard>} />
                  <Route path="/client/checkout" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="checkout" /></RoleGuard>} />
                  <Route path="/client/commandes" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="commandes" /></RoleGuard>} />
                  <Route path="/client/commandes/:id" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="order-detail" /></RoleGuard>} />
                  <Route path="/client/devis" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="devis" /></RoleGuard>} />
                  <Route path="/client/devis/nouveau" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="quote-new" /></RoleGuard>} />
                  <Route path="/client/factures" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="factures" /></RoleGuard>} />
                  <Route path="/client/paiements" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="paiements" /></RoleGuard>} />
                  <Route path="/client/logistique" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="logistique" /></RoleGuard>} />
                  <Route path="/client/documents" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="documents" /></RoleGuard>} />
                  <Route path="/client/room-live" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="room-live" /></RoleGuard>} />
                  <Route path="/client/parametres" element={<RoleGuard allowedRoles={['CLIENT', 'ADMIN']} workspaceLabel="Espace Client B2B"><ClientWorkspacePage section="parametres" /></RoleGuard>} />

                  {/* FOURNISSEUR (Pages 40 à 52 — Réservé FOURNISSEUR & ADMIN) */}
                  <Route path="/fournisseur/dashboard" element={<RoleGuard allowedRoles={['FOURNISSEUR', 'ADMIN']} workspaceLabel="Espace Fournisseur"><SupplierWorkspacePage section="dashboard" /></RoleGuard>} />
                  <Route path="/fournisseur/kyc" element={<RoleGuard allowedRoles={['FOURNISSEUR', 'ADMIN']} workspaceLabel="Espace Fournisseur"><SupplierWorkspacePage section="kyc" /></RoleGuard>} />
                  <Route path="/fournisseur/catalogue" element={<RoleGuard allowedRoles={['FOURNISSEUR', 'ADMIN']} workspaceLabel="Espace Fournisseur"><SupplierWorkspacePage section="catalogue" /></RoleGuard>} />
                  <Route path="/fournisseur/catalogue/nouveau" element={<RoleGuard allowedRoles={['FOURNISSEUR', 'ADMIN']} workspaceLabel="Espace Fournisseur"><SupplierWorkspacePage section="product-new" /></RoleGuard>} />
                  <Route path="/fournisseur/catalogue/:id" element={<RoleGuard allowedRoles={['FOURNISSEUR', 'ADMIN']} workspaceLabel="Espace Fournisseur"><SupplierWorkspacePage section="product-edit" /></RoleGuard>} />
                  <Route path="/fournisseur/stocks" element={<RoleGuard allowedRoles={['FOURNISSEUR', 'ADMIN']} workspaceLabel="Espace Fournisseur"><SupplierWorkspacePage section="stocks" /></RoleGuard>} />
                  <Route path="/fournisseur/commandes" element={<RoleGuard allowedRoles={['FOURNISSEUR', 'ADMIN']} workspaceLabel="Espace Fournisseur"><SupplierWorkspacePage section="commandes" /></RoleGuard>} />
                  <Route path="/fournisseur/commandes/:id" element={<RoleGuard allowedRoles={['FOURNISSEUR', 'ADMIN']} workspaceLabel="Espace Fournisseur"><SupplierWorkspacePage section="order-detail" /></RoleGuard>} />
                  <Route path="/fournisseur/devis" element={<RoleGuard allowedRoles={['FOURNISSEUR', 'ADMIN']} workspaceLabel="Espace Fournisseur"><SupplierWorkspacePage section="devis" /></RoleGuard>} />
                  <Route path="/fournisseur/documents" element={<RoleGuard allowedRoles={['FOURNISSEUR', 'ADMIN']} workspaceLabel="Espace Fournisseur"><SupplierWorkspacePage section="documents" /></RoleGuard>} />
                  <Route path="/fournisseur/paiements" element={<RoleGuard allowedRoles={['FOURNISSEUR', 'ADMIN']} workspaceLabel="Espace Fournisseur"><SupplierWorkspacePage section="paiements" /></RoleGuard>} />
                  <Route path="/fournisseur/room-live" element={<RoleGuard allowedRoles={['FOURNISSEUR', 'ADMIN']} workspaceLabel="Espace Fournisseur"><SupplierWorkspacePage section="room-live" /></RoleGuard>} />
                  <Route path="/fournisseur/parametres" element={<RoleGuard allowedRoles={['FOURNISSEUR', 'ADMIN']} workspaceLabel="Espace Fournisseur"><SupplierWorkspacePage section="parametres" /></RoleGuard>} />

                  {/* TRANSPORTEUR (Pages 53 à 61 — Réservé TRANSPORTEUR & ADMIN) */}
                  <Route path="/transporteur/dashboard" element={<RoleGuard allowedRoles={['TRANSPORTEUR', 'ADMIN']} workspaceLabel="Espace Transporteur"><CarrierWorkspacePage section="dashboard" /></RoleGuard>} />
                  <Route path="/transporteur/kyc" element={<RoleGuard allowedRoles={['TRANSPORTEUR', 'ADMIN']} workspaceLabel="Espace Transporteur"><CarrierWorkspacePage section="kyc" /></RoleGuard>} />
                  <Route path="/transporteur/missions" element={<RoleGuard allowedRoles={['TRANSPORTEUR', 'ADMIN']} workspaceLabel="Espace Transporteur"><CarrierWorkspacePage section="missions" /></RoleGuard>} />
                  <Route path="/transporteur/missions/:id" element={<RoleGuard allowedRoles={['TRANSPORTEUR', 'ADMIN']} workspaceLabel="Espace Transporteur"><CarrierWorkspacePage section="mission-detail" /></RoleGuard>} />
                  <Route path="/transporteur/expeditions" element={<RoleGuard allowedRoles={['TRANSPORTEUR', 'ADMIN']} workspaceLabel="Espace Transporteur"><CarrierWorkspacePage section="expeditions" /></RoleGuard>} />
                  <Route path="/transporteur/documents" element={<RoleGuard allowedRoles={['TRANSPORTEUR', 'ADMIN']} workspaceLabel="Espace Transporteur"><CarrierWorkspacePage section="documents" /></RoleGuard>} />
                  <Route path="/transporteur/incidents" element={<RoleGuard allowedRoles={['TRANSPORTEUR', 'ADMIN']} workspaceLabel="Espace Transporteur"><CarrierWorkspacePage section="incidents" /></RoleGuard>} />
                  <Route path="/transporteur/room-live" element={<RoleGuard allowedRoles={['TRANSPORTEUR', 'ADMIN']} workspaceLabel="Espace Transporteur"><CarrierWorkspacePage section="room-live" /></RoleGuard>} />
                  <Route path="/transporteur/parametres" element={<RoleGuard allowedRoles={['TRANSPORTEUR', 'ADMIN']} workspaceLabel="Espace Transporteur"><CarrierWorkspacePage section="parametres" /></RoleGuard>} />

                  {/* COMPTABLE (Pages 62 à 68 — Réservé COMPTABLE & ADMIN) */}
                  <Route path="/comptable/dashboard" element={<RoleGuard allowedRoles={['COMPTABLE', 'ADMIN']} workspaceLabel="Espace Comptable"><AccountingWorkspacePage section="dashboard" /></RoleGuard>} />
                  <Route path="/comptable/factures" element={<RoleGuard allowedRoles={['COMPTABLE', 'ADMIN']} workspaceLabel="Espace Comptable"><AccountingWorkspacePage section="factures" /></RoleGuard>} />
                  <Route path="/comptable/journaux" element={<RoleGuard allowedRoles={['COMPTABLE', 'ADMIN']} workspaceLabel="Espace Comptable"><AccountingWorkspacePage section="journaux" /></RoleGuard>} />
                  <Route path="/comptable/grand-livre" element={<RoleGuard allowedRoles={['COMPTABLE', 'ADMIN']} workspaceLabel="Espace Comptable"><AccountingWorkspacePage section="grand-livre" /></RoleGuard>} />
                  <Route path="/comptable/etats-financiers" element={<RoleGuard allowedRoles={['COMPTABLE', 'ADMIN']} workspaceLabel="Espace Comptable"><AccountingWorkspacePage section="etats-financiers" /></RoleGuard>} />
                  <Route path="/comptable/calcul" element={<RoleGuard allowedRoles={['COMPTABLE', 'ADMIN']} workspaceLabel="Espace Comptable"><AccountingWorkspacePage section="calcul" /></RoleGuard>} />
                  <Route path="/comptable/parametres" element={<RoleGuard allowedRoles={['COMPTABLE', 'ADMIN']} workspaceLabel="Espace Comptable"><AccountingWorkspacePage section="parametres" /></RoleGuard>} />

                  {/* SUPPORT (Pages 69 à 73 — Réservé SUPPORT & ADMIN) */}
                  <Route path="/support/dashboard" element={<RoleGuard allowedRoles={['SUPPORT', 'ADMIN']} workspaceLabel="Espace Support"><SupportWorkspacePage section="dashboard" /></RoleGuard>} />
                  <Route path="/support/tickets" element={<RoleGuard allowedRoles={['SUPPORT', 'ADMIN']} workspaceLabel="Espace Support"><SupportWorkspacePage section="tickets" /></RoleGuard>} />
                  <Route path="/support/tickets/:id" element={<RoleGuard allowedRoles={['SUPPORT', 'ADMIN']} workspaceLabel="Espace Support"><SupportWorkspacePage section="ticket-detail" /></RoleGuard>} />
                  <Route path="/support/room-live" element={<RoleGuard allowedRoles={['SUPPORT', 'ADMIN']} workspaceLabel="Espace Support"><SupportWorkspacePage section="room-live" /></RoleGuard>} />
                  <Route path="/support/parametres" element={<RoleGuard allowedRoles={['SUPPORT', 'ADMIN']} workspaceLabel="Espace Support"><SupportWorkspacePage section="parametres" /></RoleGuard>} />

                  {/* TRANSVERSAL & ERREURS (Pages 74 à 79) */}
                  <Route path="/room/:id" element={<RoomLiveSessionPage />} />
                  <Route path="/ocr-idp" element={<OCRStudioPage />} />
                  <Route path="/notifications" element={<NotificationsCenterPage />} />
                  <Route path="/404" element={<ErrorSystemPage code="404" />} />
                  <Route path="/403" element={<ErrorSystemPage code="403" />} />
                  <Route path="/500" element={<ErrorSystemPage code="500" />} />
                  <Route path="*" element={<ErrorSystemPage code="404" />} />
                </Routes>
              </AppLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};
