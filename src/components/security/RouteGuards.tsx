// ============================================================================
// TRADELINK V6.0 — PROTECTION DES ROUTES FRONTEND : ProtectedRoute, RoleGuard & KYCGuard
// Conforme aux Chapitres 2.1, 14.C et PROMPT 5 :
// - "Ne jamais se limiter à masquer les boutons côté frontend : les permissions doivent
//   être appliquées par le backend" ET protégées côté routeur frontend.
// ============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Lock, KeyRound } from 'lucide-react';
import { useApp, DEMO_USERS } from '../../contexts/AppContext';
import { UserRoleCode } from '../../types';
import { Badge, Button, Card } from '../ui/DesignSystem';
import { Icon3D } from '../ui/Icon3D';

export const RoleGuard: React.FC<{
  allowedRoles: UserRoleCode[];
  workspaceLabel: string;
  children: React.ReactNode;
}> = ({ allowedRoles, workspaceLabel, children }) => {
  const { currentUser, switchUserAccount } = useApp();

  // Vérification MFA obligatoire pour l'Administrateur (Chapitre 2.2 & PROMPT 5)
  if (currentUser.role === 'ADMIN' && !currentUser.mfaVerified) {
    return (
      <Card
        title="Vérification MFA TOTP Obligatoire (Administrateur)"
        subtitle="Chapitre 2.2 : Tout accès Administrateur exige une validation MFA TOTP active."
      >
        <div className="py-6 text-center space-y-4">
          <KeyRound className="w-12 h-12 mx-auto text-[#E85D22]" />
          <p className="text-sm">
            Votre compte Administrateur doit valider son second facteur TOTP avant d’accéder à{' '}
            <strong>{workspaceLabel}</strong>.
          </p>
          <Link to="/mfa">
            <Button variant="primary">Valider mon code MFA TOTP →</Button>
          </Link>
        </div>
      </Card>
    );
  }

  // Vérification RBAC stricte du rôle sur l'espace métier
  if (!allowedRoles.includes(currentUser.role)) {
    const recommendedDemoKey =
      allowedRoles[0] === 'ADMIN'
        ? 'ADMIN_1'
        : (allowedRoles[0] as keyof typeof DEMO_USERS);

    return (
      <Card
        title={`403 — Accès Refusé à l'espace « ${workspaceLabel} » (Contrôle RBAC)`}
        subtitle="Protection active côté routeur et côté serveur API"
      >
        <div className="py-8 text-center space-y-4 max-w-xl mx-auto">
          <Icon3D name="hazardous-goods" size="xl" />
          <div className="flex items-center justify-center gap-2">
            <Badge variant="danger">Rôle actuel : {currentUser.role}</Badge>
            <Badge variant="orange">Rôles requis : {allowedRoles.join(' ou ')}</Badge>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Conformément au chapitre 2.1 et au PROMPT 5, un utilisateur connecté avec le rôle{' '}
            <strong>{currentUser.role}</strong> ne peut pas accéder aux routes de l’espace{' '}
            <strong>{workspaceLabel}</strong>. Toute tentative d’appel API direct renvoie également{' '}
            <code>403 RBAC_FORBIDDEN_ROLE</code>.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {!import.meta.env.PROD && DEMO_USERS[recommendedDemoKey] && (
              <Button
                variant="primary"
                onClick={() => switchUserAccount(recommendedDemoKey)}
              >
                <ShieldAlert className="w-4 h-4" />
                Basculer sur le profil {allowedRoles[0]} autorisé (Simulateur)
              </Button>
            )}
            <Link to="/">
              <Button variant="secondary">
                <Lock className="w-4 h-4" />
                Retour à l’accueil
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
};
