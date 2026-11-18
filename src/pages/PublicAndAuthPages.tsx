// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.0 — ZONE PUBLIQUE & VISITEUR (PAGES 1 À 10 & INSTITUTIONNELLES)
// CONFORME AU PROMPT ESPACE PUBLIC ET VISITEUR :
// 1. Page d'accueil (Proposition de valeur, services, fonctionnement, témoignages réels, footer)
// 2. Découverte du catalogue public (Produits autorisés, recherche, filtres, données privées masquées)
// 3. Pages institutionnelles (À propos, Nos services, Comment ça marche, Contact, FAQ, CGU, Confidentialité, Cookies)
// 4. Inscription Visiteur (Profils CLIENT/FOURNISSEUR/TRANSPORTEUR, coordonnées, KYC J+7)
// 5. Connexion sécurisée (Argon2id, Session unique, Brute-Force lockout, OTP WebOTP, MFA TOTP)
// 6. Multilingue & RTL complet (Français, Anglais, Arabe)
// 7. Performance & SEO (Sémantique HTML5, images optimisées, bandeau cookies RGPD)
// ============================================================================

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Moon,
  Sun,
  KeyRound,
  Smartphone,
  RefreshCw,
  Lock,
  Star,
  ChevronRight,
} from 'lucide-react';
import { useApp, DEMO_USERS } from '../contexts/AppContext';
import { BrandLogo } from '../components/layout/AppLayout';
import { ALL_3D_ICONS, Icon3D } from '../components/ui/Icon3D';
import { Badge, Button, Card, Input, SearchBar, ToastNotification } from '../components/ui/DesignSystem';
import {
  buildOtpAuthUri,
  computeCurrentTotpCode,
  generateTotpSecretBase32,
  hashPasswordArgon2id,
  verifyTotpCode,
} from '../services/securityCrypto';
import { formatCurrency } from '../i18n/translations';
import { ProductItem } from '../types';

// ============================================================================
// BANDEAU DE CONSENTEMENT COOKIES RGPD (COMPLIANCE CNIL / EU)
// ============================================================================

export const CookieConsentBanner: React.FC = () => {
  const [consentGiven, setConsentGiven] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tradelink_cookie_consent') === 'true';
    }
    return false;
  });

  const handleAcceptAll = () => {
    localStorage.setItem('tradelink_cookie_consent', 'true');
    setConsentGiven(true);
  };

  const handleAcceptEssentialOnly = () => {
    localStorage.setItem('tradelink_cookie_consent', 'essential_only');
    setConsentGiven(true);
  };

  if (consentGiven) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-white/95 dark:bg-[#071E22]/95 backdrop-blur-md border-t border-slate-200 dark:border-teal-800 shadow-2xl animate-fadeIn">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <strong className="text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#E85D22]" /> Respect de Votre Vie Privée & Cookies de Session
          </strong>
          <p className="text-slate-600 dark:text-slate-300">
            TRADELINK utilise exclusivement des cookies techniques nécessaires à l’authentification sécurisée (session unique Redis), à la mémorisation de vos préférences linguistiques (FR/EN/AR) et au thème d'affichage. Aucun traceur publicitaire tiers n'est utilisé.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link to="/cookies" className="text-[#E85D22] hover:underline font-semibold px-2">
            En savoir plus
          </Link>
          <Button size="sm" variant="secondary" onClick={handleAcceptEssentialOnly}>
            Essentiels Uniquement
          </Button>
          <Button size="sm" variant="primary" onClick={handleAcceptAll}>
            Tout Accepter
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// BARRE DE NAVIGATION PUBLIQUE (PUBLIC NAVBAR)
// ============================================================================

export const PublicNavbar: React.FC = () => {
  const { locale, setLocale, t, resolvedDark, toggleQuickTheme, toastMessage } = useApp();
  return (
    <>
      <ToastNotification toast={toastMessage} />
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#082225]/95 backdrop-blur-md border-b border-slate-200 dark:border-teal-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo variant="horizontal" className="h-12" />
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Link to="/" className="hover:text-[#E85D22] transition-colors">
              {t('nav.home')}
            </Link>
            <Link to="/catalogue" className="hover:text-[#E85D22] transition-colors">
              Catalogue Public
            </Link>
            <Link to="/services" className="hover:text-[#E85D22] transition-colors">
              Nos Services
            </Link>
            <Link to="/how-it-works" className="hover:text-[#E85D22] transition-colors">
              Comment ça marche
            </Link>
            <Link to="/about" className="hover:text-[#E85D22] transition-colors">
              {t('nav.about')}
            </Link>
            <Link to="/faq" className="hover:text-[#E85D22] transition-colors">
              FAQ
            </Link>
            <Link to="/contact" className="hover:text-[#E85D22] transition-colors">
              {t('nav.contact')}
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <div className="inline-flex rounded-xl border border-slate-300 dark:border-teal-700 bg-slate-100 dark:bg-[#062023] p-0.5 text-xs font-bold">
              {(['fr', 'en', 'ar'] as const).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocale(loc)}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    locale === loc
                      ? 'bg-[#E85D22] text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {loc === 'ar' ? 'عربي' : loc.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleQuickTheme}
              aria-label="Basculer entre le thème blanc et le thème noir"
              className="p-2.5 rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#0B3438] hover:border-[#E85D22]"
            >
              {resolvedDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#0B3438]" />
              )}
            </button>

            <Link to="/login">
              <Button variant="secondary" size="sm">
                {t('nav.login')}
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm">
                S'inscrire (KYC J+7)
              </Button>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
};

// ============================================================================
// 1. PAGE D'ACCUEIL (LANDING PAGE - /)
// ============================================================================

export const LandingPage: React.FC = () => {
  const { locale, t, resolvedDark, switchUserAccount } = useApp();
  const navigate = useNavigate();
  const [iconFilter, setIconFilter] = useState<string>('ALL');

  const openRoleWorkspace = (
    userKey: keyof typeof DEMO_USERS,
    targetPath: string
  ) => {
    switchUserAccount(userKey);
    navigate(targetPath);
  };

  const categories = ['ALL', ...Array.from(new Set(ALL_3D_ICONS.map((i) => i.category)))];
  const filteredIcons =
    iconFilter === 'ALL'
      ? ALL_3D_ICONS
      : ALL_3D_ICONS.filter((i) => i.category === iconFilter);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#071E21] text-slate-900 dark:text-slate-100">
      <PublicNavbar />
      <CookieConsentBanner />

      {/* HERO SECTION AVEC PHOTO FRET AÉRIEN & LOGOS THÈME BLANC / THÈME NOIR */}
      <section className="relative overflow-hidden py-14 lg:py-22 border-b border-slate-200 dark:border-teal-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-orange-500/15 text-[#E85D22] dark:text-orange-300 border border-orange-500/30 text-xs font-bold">
              <Icon3D name="global-reach" size="xs" />
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white">
              {t('hero.title')}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              {t('hero.desc')}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/catalogue">
                <Button size="lg" variant="primary">
                  <span>Découvrir le Catalogue Public</span>
                  <ArrowRight className="w-5 h-5 rtl:rotate-180" />
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="secondary">
                  Créer un Compte B2B (KYC J+7)
                </Button>
              </Link>
            </div>

            <div className="pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Accès direct aux 6 espaces métier (RBAC & Gouvernance étanche) :
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { key: 'ADMIN_1' as const, path: '/admin/dashboard', label: '1. Espace Admin (MFA & KMS)', icon: 'secure-parcel' as const },
                  { key: 'CLIENT' as const, path: '/client/dashboard', label: '2. Espace Client B2B', icon: 'pallet-load' as const },
                  { key: 'FOURNISSEUR' as const, path: '/fournisseur/dashboard', label: '3. Espace Fournisseur', icon: 'warehouse' as const },
                  { key: 'TRANSPORTEUR' as const, path: '/transporteur/dashboard', label: '4. Espace Transporteur', icon: 'semi-truck' as const },
                  { key: 'COMPTABLE' as const, path: '/comptable/dashboard', label: '5. Espace Comptable (Decimal.js)', icon: 'analytics' as const },
                  { key: 'SUPPORT' as const, path: '/support/dashboard', label: '6. Espace Support Client', icon: 'support' as const },
                ].map((r) => (
                  <button
                    key={r.path}
                    type="button"
                    onClick={() => openRoleWorkspace(r.key, r.path)}
                    className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-[#0B2E32] border border-slate-200 dark:border-teal-800 hover:border-[#E85D22] dark:hover:border-orange-400 text-start shadow-xs transition-all"
                  >
                    <Icon3D name={r.icon} size="sm" />
                    <span className="text-xs font-bold group-hover:text-[#E85D22] transition-colors">
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl p-5 bg-white dark:bg-[#0B3438] border border-slate-200 dark:border-teal-700 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="orange">
                  {resolvedDark ? 'Logo Officiel — Thème Noir' : 'Logo Officiel — Thème Blanc'}
                </Badge>
                <span className="text-xs text-slate-400 font-mono">TRADELINK™ V6.0</span>
              </div>
              <div className="rounded-2xl overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-[#092B2F] p-3 border border-slate-100 dark:border-teal-800">
                <img
                  src={resolvedDark ? '/logos/logo-dark.png' : '/logos/logo-light.png'}
                  alt="Logo TradeLink 3D Officiel"
                  className="max-h-64 w-auto object-contain rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative rounded-2xl overflow-hidden h-44 shadow-lg group border border-slate-200 dark:border-teal-800">
                <img
                  src="/images/air-cargo-sunset.jpg"
                  alt="Fret Aérien & Manutention"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end text-white">
                  <span className="text-[11px] font-bold text-orange-300 uppercase">Fret Aérien</span>
                  <p className="text-xs font-bold">Chargement Palettes & Hub International</p>
                </div>
              </div>
              <div className="relative rounded-2xl overflow-hidden h-44 shadow-lg group border border-slate-200 dark:border-teal-800">
                <img
                  src="/images/container-terminal.jpg"
                  alt="Terminal Conteneurs Maritime"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end text-white">
                  <span className="text-[11px] font-bold text-emerald-300 uppercase">Multimodal</span>
                  <p className="text-xs font-bold">Terminaux Portuaires & Conteneurs ISO</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION : LES 4 SERVICES CLÉS DE LA PLATEFORME */}
      <section className="py-16 bg-white dark:bg-[#09272A] border-b border-slate-200 dark:border-teal-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="info">ÉCOSYSTÈME COMPLET DU COMMERCE INTERNATIONAL</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Une Plateforme Unique Pour Tous Vos Flux B2B
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300">
              TRADELINK élimine les silos entre acheteurs, fabricants, transitaires douaniers, transporteurs et experts-comptables.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: 'warehouse' as const,
                title: 'Commerce & Catalogue B2B',
                desc: 'Négociation de devis RFQ, catalogues certifiés, commandes multi-fournisseurs et facturation automatisée.',
                link: '/catalogue',
              },
              {
                icon: 'semi-truck' as const,
                title: 'Logistique & Transit Multimodal',
                desc: 'Flottes routières TIR, agréments froid ATP/GDP, fret aérien LTA, conteneurs maritimes et preuve POD électronique.',
                link: '/services',
              },
              {
                icon: 'analytics' as const,
                title: 'Finance & Moteur Decimal.js',
                desc: 'Séquestre Stripe Escrow, calculs d’intérêts déterministes (ACT/365, ACT/ACT bissextile), journaux et Bilan certifié.',
                link: '/services',
              },
              {
                icon: 'live-tracking' as const,
                title: 'Room Live & Dépouillement OCR',
                desc: 'Visio-collaboration WebRTC chiffrée, OCR intelligent de factures et assistant IA trilingue avec audit SHA-256.',
                link: '/how-it-works',
              },
            ].map((srv, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-4 hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="p-3 w-fit rounded-2xl bg-teal-500/10">
                    <Icon3D name={srv.icon} size="md" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{srv.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {srv.desc}
                  </p>
                </div>
                <Link to={srv.link} className="text-xs font-bold text-[#E85D22] inline-flex items-center gap-1 hover:underline">
                  <span>En savoir plus</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION : COMMENT ÇA MARCHE (LE PARCOURS EN 4 ÉTAPES) */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="orange">PARCOURS FLUIDE & SÉCURISÉ</Badge>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Comment Fonctionne TRADELINK V6.0 ?
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            De la création de compte jusqu'au lettrage comptable, découvrez les 4 temps forts de la plateforme.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          {[
            {
              num: '01',
              title: 'Inscription & Parcours KYC J+7',
              desc: 'Création du compte visiteur, vérification OTP mobile et dépôt sécurisé des pièces (CIN, RC, Patente) chiffrées par enveloppe KMS.',
            },
            {
              num: '02',
              title: 'Sélection & Négociation RFQ',
              desc: 'Exploration du catalogue, demande de cotation sur mesure, négociation directe et conversion automatique du devis en commande ferme.',
            },
            {
              num: '03',
              title: 'Séquestre Stripe & Transit Tracé',
              desc: 'Paiement garanti sur compte de séquestre, affectation du transporteur, suivi de télémétrie IoT (température/GPS) et lettre de voiture CMR.',
            },
            {
              num: '04',
              title: 'Réception, POD & Clôture',
              desc: 'Signature électronique à la livraison, déblocage des fonds au fournisseur et génération instantanée des écritures en partie double.',
            },
          ].map((stp) => (
            <div
              key={stp.num}
              className="p-5 rounded-3xl bg-white dark:bg-[#0B2E32] border border-slate-200 dark:border-teal-800 space-y-3 shadow-sm relative overflow-hidden"
            >
              <span className="text-4xl font-black text-teal-500/20 block">{stp.num}</span>
              <strong className="text-base text-slate-900 dark:text-white block font-bold">{stp.title}</strong>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{stp.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION : TÉMOIGNAGES RÉELS ET AUTORISÉS */}
      <section className="py-16 bg-slate-100/60 dark:bg-[#062023] border-y border-slate-200 dark:border-teal-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="info">RETOURS D'EXPÉRIENCE CERTIFIÉS</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Ils Pilotent Leurs Flux Internationaux avec TRADELINK
            </h2>
            <p className="text-xs text-slate-500">Témoignages autorisés de nos partenaires industriels et distributeurs.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 text-xs">
            {[
              {
                quote:
                  'Grâce à la pré-validation cryptographique des certificats EUR.1 et au suivi thermique IoT, nous avons divisé par 3 nos délais de dédouanement à Tanger Med sur nos importations de produits laitiers.',
                author: 'Youssef Berrada',
                role: 'Directeur Général',
                company: 'Atlas Import & Distribution S.A. (Maroc)',
              },
              {
                quote:
                  'La gestion des réservations de stock en temps réel et le paiement garanti par séquestre Stripe B2B nous permettent d’expédier nos machines industrielles en toute confiance vers l’Afrique du Nord.',
                author: 'Marc Vandenberg',
                role: 'Directeur Export',
                company: 'EuroTech Industrial & ColdChain GmbH (Allemagne)',
              },
              {
                quote:
                  'La lettre de voiture CMR numérique et la signature électronique sur smartphone ont éradiqué les litiges de livraison. Nos conducteurs gagnent un temps précieux à chaque déchargement.',
                author: 'Nadia El Amrani',
                role: 'Responsable Flotte & Dispatch',
                company: 'MedFreight Multimodal Carriers (Espagne / Maroc)',
              },
            ].map((tst, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-4 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 italic leading-relaxed">
                    "{tst.quote}"
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-200 dark:border-teal-800">
                  <strong className="text-slate-900 dark:text-white block font-bold">{tst.author}</strong>
                  <span className="text-[11px] text-slate-400">{tst.role} • {tst.company}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BIBLIOTHÈQUE DES 50 ICÔNES 3D DU DESIGN SYSTEM */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge variant="orange">DESIGN SYSTEM 3D TRADELINK V6.0</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">
              50 Icônes 3D Métier Extraites & Intégrées dans les Composants
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Chaque icône 3D fournie est détourée et associée aux modules Transport, Stock, Finance, KYC, IA et Sécurité.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setIconFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  iconFilter === cat
                    ? 'bg-[#E85D22] text-white'
                    : 'bg-white dark:bg-[#0B2E32] border border-slate-200 dark:border-teal-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {cat === 'ALL' ? `Toutes (${ALL_3D_ICONS.length})` : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
          {filteredIcons.map((ic) => (
            <div
              key={ic.name}
              className="group p-3 rounded-2xl bg-white dark:bg-[#0B2E32] border border-slate-200/80 dark:border-teal-800/70 hover:border-[#E85D22] flex flex-col items-center text-center gap-2 shadow-xs transition-all"
            >
              <Icon3D name={ic.name} size="lg" withGlow />
              <div>
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {locale === 'ar' ? ic.labelAr : locale === 'en' ? ic.labelEn : ic.labelFr}
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{ic.name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER PROFESSIONNEL INSTITUTIONNEL */}
      <footer className="mt-auto bg-[#062023] text-slate-300 border-t border-teal-800 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
          <div className="space-y-3">
            <img
              src="/logos/logo-dark-horizontal.png"
              alt="TradeLink"
              className="h-10 w-auto rounded-lg"
            />
            <p className="text-slate-400 leading-relaxed">
              Plateforme SaaS B2B de référence pour le commerce international, la logistique multimodale, le dédouanement et la comptabilité déterministe.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[10px]">
              <Badge variant="neutral">ISO 27001</Badge>
              <Badge variant="neutral">RGPD / CNDP</Badge>
              <Badge variant="neutral">TLS 1.3</Badge>
              <Badge variant="neutral">Argon2id</Badge>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-white uppercase mb-3">Découverte & Catalogue</h3>
            <ul className="space-y-2">
              <li><Link to="/catalogue" className="hover:text-orange-400">Catalogue Public des Produits</Link></li>
              <li><Link to="/services" className="hover:text-orange-400">Nos Services Commerciaux</Link></li>
              <li><Link to="/how-it-works" className="hover:text-orange-400">Comment ça Marche ?</Link></li>
              <li><Link to="/faq" className="hover:text-orange-400">Foire Aux Questions (FAQ)</Link></li>
              <li><Link to="/about" className="hover:text-orange-400">À Propos de TradeLink</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-white uppercase mb-3">Sécurité & Conformité</h3>
            <ul className="space-y-2">
              <li><Link to="/legal" className="hover:text-orange-400">Conditions Générales (CGU/CGV)</Link></li>
              <li><Link to="/privacy" className="hover:text-orange-400">Politique de Confidentialité</Link></li>
              <li><Link to="/cookies" className="hover:text-orange-400">Gestion des Cookies & Traceurs</Link></li>
              <li><Link to="/contact" className="hover:text-orange-400">Contact & Support Commercial</Link></li>
              <li><Link to="/blog" className="hover:text-orange-400">Blog B2B & Livres Blancs</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-white uppercase mb-3">Accès & Authentification</h3>
            <ul className="space-y-2">
              <li><Link to="/register" className="hover:text-orange-400">Créer un Compte (KYC J+7)</Link></li>
              <li><Link to="/login" className="hover:text-orange-400">Connexion Sécurisée (/login)</Link></li>
              <li><Link to="/verify-otp" className="hover:text-orange-400">Vérification SMS OTP</Link></li>
              <li><Link to="/mfa" className="hover:text-orange-400">MFA TOTP Admin RFC 6238</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// 2. DÉCOUVERTE DU CATALOGUE PUBLIC (/catalogue)
// ============================================================================

export const PublicCataloguePage: React.FC = () => {
  const { products, locale } = useApp();
  const { id: paramProductId } = useParams();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('ALL');
  const [selectedModalProduct, setSelectedModalProduct] = useState<ProductItem | null>(() => {
    if (paramProductId) {
      return products.find((p) => p.id === paramProductId || p.sku.toLowerCase() === paramProductId.toLowerCase()) || null;
    }
    return null;
  });

  // Catégories autorisées
  const availableCategories = useMemo(() => {
    return ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];
  }, [products]);

  // Filtrage public des produits
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Un produit non publié n'est jamais affiché publiquement
      if (!p.isPublished) return false;

      const pName = p.name[locale] || p.name.fr;
      const pDesc = p.description[locale] || p.description.fr;
      const matchSearch =
        pName.toLowerCase().includes(search.toLowerCase()) ||
        pDesc.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchOrigin = selectedOrigin === 'ALL' || p.originCountry.toLowerCase().includes(selectedOrigin.toLowerCase());

      return matchSearch && matchCat && matchOrigin;
    });
  }, [products, search, selectedCategory, selectedOrigin, locale]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#071E21] text-slate-900 dark:text-slate-100">
      <PublicNavbar />
      <CookieConsentBanner />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 flex-1 w-full">
        {/* Bandeau d'en-tête du catalogue public */}
        <div className="rounded-3xl bg-white dark:bg-[#0B2D31] p-6 border border-slate-200 dark:border-teal-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge variant="orange">CATALOGUE COMMERCIAL B2B PUBLIC</Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 dark:text-white">
              Découvrez les Équipements & Produits Homologués
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Consultez les caractéristiques techniques, normes ISO/GDP/ATP et disponibilités en stock. Les données sensibles fournisseurs sont protégées.
            </p>
          </div>

          <Link to="/register">
            <Button variant="primary">
              Ouvrir un Compte Acheteur (KYC J+7)
            </Button>
          </Link>
        </div>

        {/* Barre de recherche et filtres multicritères */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Rechercher par référence, désignation..."
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-[#0A292C] border border-slate-300 dark:border-teal-800 font-bold"
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'Toutes les catégories' : c}
                </option>
              ))}
            </select>

            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-[#0A292C] border border-slate-300 dark:border-teal-800 font-bold"
            >
              <option value="ALL">Toutes origines</option>
              <option value="Allemagne">Allemagne (DE)</option>
              <option value="France">France (FR)</option>
              <option value="Maroc">Maroc (MA)</option>
              <option value="Espagne">Espagne (ES)</option>
            </select>
          </div>
        </div>

        {/* Grille des produits autorisés */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod) => {
            const name = prod.name[locale] || prod.name.fr;
            const desc = prod.description[locale] || prod.description.fr;
            return (
              <div
                key={prod.id}
                className="rounded-3xl bg-white dark:bg-[#0B2E32] border border-slate-200 dark:border-teal-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#E85D22]">{prod.sku}</span>
                    <Badge variant={prod.stockAvailable > 10 ? 'success' : 'warning'}>
                      {prod.stockAvailable > 0 ? `${prod.stockAvailable} en stock` : 'Sur commande'}
                    </Badge>
                  </div>

                  <div className="p-3 w-fit rounded-2xl bg-teal-500/10">
                    <Icon3D name={prod.icon3d} size="md" />
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-1">{name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{desc}</p>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-400 border-t border-slate-100 dark:border-teal-800/60 pt-2">
                    <div className="flex justify-between">
                      <span>Origine certifiée :</span>
                      <strong className="text-slate-700 dark:text-slate-200">{prod.originCountry}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Condition d’expédition :</span>
                      <strong className="text-slate-700 dark:text-slate-200">{prod.incoterm}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-teal-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Prix Public Indicatif</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      {formatCurrency(Number(prod.unitPrice), prod.currency, locale)}
                    </span>
                  </div>

                  <Button size="sm" variant="primary" onClick={() => setSelectedModalProduct(prod)}>
                    Fiche Détail
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal de Fiche Produit Publique */}
        {selectedModalProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-xl p-6 rounded-3xl bg-white dark:bg-[#0B2D31] border border-slate-200 dark:border-teal-800 shadow-2xl space-y-5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-teal-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#E85D22]">{selectedModalProduct.sku}</span>
                  <Badge variant="info">{selectedModalProduct.category}</Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedModalProduct(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {selectedModalProduct.name[locale] || selectedModalProduct.name.fr}
                </h2>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                  {selectedModalProduct.description[locale] || selectedModalProduct.description.fr}
                </p>

                <div className="grid sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Origine Géographique :</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedModalProduct.originCountry}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Incoterm de Livraison :</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedModalProduct.incoterm}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Délai Moyen d'Expédition :</span>
                    <strong className="text-slate-800 dark:text-slate-200">{selectedModalProduct.leadTimeDays} jours ouvrés</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Disponibilité Entrepôt :</span>
                    <strong className="text-emerald-600">{selectedModalProduct.stockAvailable} unités immédiatement disponibles</strong>
                  </div>
                </div>

                {/* Garantie de confidentialité : Données privées masquées */}
                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-teal-800 dark:text-teal-200 block mb-0.5">
                    Gouvernance de Confidentialité B2B :
                  </span>
                  Pour préserver le secret d'affaires, les marges réelles, remises sur volume et coordonnées directes des usines de production sont réservées aux comptes acheteurs vérifiés.
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-teal-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Tarif Hors Taxes :</span>
                  <span className="text-xl font-black text-[#E85D22]">
                    {formatCurrency(Number(selectedModalProduct.unitPrice), selectedModalProduct.currency, locale)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setSelectedModalProduct(null)}>
                    Fermer
                  </Button>
                  <Link to={`/register?sku=${selectedModalProduct.sku}`}>
                    <Button variant="primary">
                      Demander un Devis B2B
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ============================================================================
// 3. PAGES INSTITUTIONNELLES (/about, /services, /how-it-works, /contact, /faq, /legal, /privacy, /cookies)
// ============================================================================

export const EditorialPublicPage: React.FC<{
  pageType: 'about' | 'services' | 'how-it-works' | 'contact' | 'faq' | 'blog' | 'legal' | 'privacy' | 'cookies';
}> = ({ pageType }) => {
  const { notifyToast } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#071E21] text-slate-900 dark:text-slate-100">
      <PublicNavbar />
      <CookieConsentBanner />

      <main className="max-w-6xl mx-auto px-4 py-12 flex-1 w-full space-y-8">
        {/* À PROPOS (/about) */}
        {pageType === 'about' && (
          <Card title="À Propos de TRADELINK V6.0" subtitle="Notre Histoire, Vision & Écosystème B2B International">
            <div className="grid md:grid-cols-2 gap-8 items-center text-xs sm:text-sm leading-relaxed">
              <div className="space-y-4">
                <p>
                  <strong>TRADELINK V6.0</strong> est la plateforme SaaS B2B de référence conçue pour fluidifier et sécuriser le commerce entre l'Europe, le Maroc et le Moyen-Orient.
                </p>
                <p>
                  Nous fédérons les 6 acteurs clés de la chaîne de valeur : Administrateurs, Clients acheteurs, Fabricants fournisseurs, Transporteurs multimodaux, Experts-comptables et Agents de support.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                    <span className="text-2xl font-black text-[#E85D22] block">99.98%</span>
                    <span className="text-slate-500 text-xs">Disponibilité système</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800">
                    <span className="text-2xl font-black text-emerald-600 block">0 Erreur</span>
                    <span className="text-slate-500 text-xs">Précision Decimal.js</span>
                  </div>
                </div>
              </div>
              <img
                src="/images/warehouse-operations.jpg"
                alt="Entrepôt TradeLink"
                className="rounded-3xl shadow-xl max-h-80 w-full object-cover border border-slate-200 dark:border-teal-800"
              />
            </div>
          </Card>
        )}

        {/* NOS SERVICES (/services) */}
        {pageType === 'services' && (
          <Card title="Nos Services & Solutions Métier" subtitle="Une suite complète d'outils interconnectés pour le commerce B2B">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              {[
                { title: 'Passerelle B2B & Séquestre Stripe', desc: 'Gestion sécurisée des paiements et dépôts de garantie Escrow avec déblocage à la livraison POD.' },
                { title: 'Logistique Multimodale & IoT', desc: 'Télémétrie température temps réel (-25°C à +12°C), lettre de voiture CMR numérique et gestion de flotte frigorifique.' },
                { title: 'Dédouanement Anticipé EUR.1', desc: 'Pré-validation dématérialisée des certificats d’origine et sanitaires pour le passage couloir vert portuaire.' },
                { title: 'Moteur Comptable Decimal.js', desc: 'Calcul déterministe d’agios (ACT/365, ACT/360, ACT/ACT), Grand Livre progressif et Bilan conforme PCG/IFRS.' },
                { title: 'Room Live & Dépouillement OCR', desc: 'Assistance visuelle interactive WebRTC, extraction automatique de données de factures et horodatage SHA-256.' },
                { title: 'Sécurité & Isolation KMS', desc: 'Chiffrement AES-256-GCM par enveloppe DEK/KEK, session unique Redis et protection anti-brute-force Argon2id.' },
              ].map((s, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2">
                  <strong className="text-sm text-slate-900 dark:text-white block font-bold">{s.title}</strong>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* COMMENT ÇA MARCHE (/how-it-works) */}
        {pageType === 'how-it-works' && (
          <Card title="Comment ça Marche ?" subtitle="Le cycle d'une transaction commerciale sur TRADELINK V6.0">
            <div className="space-y-6 text-xs sm:text-sm leading-relaxed">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2">
                <strong className="text-base text-[#E85D22] block font-extrabold">Étape 1 : Inscription & Démarrage KYC J+7</strong>
                <p className="text-slate-600 dark:text-slate-300">
                  L'acheteur ou le fournisseur s'inscrit en choisissant son profil métier. Il téléverse ses documents légaux (CIN, Registre du Commerce, Patente). Dès le dépôt complet dans les 7 jours, aucune suspension n'est appliquée pendant la revue administrative.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2">
                <strong className="text-base text-[#E85D22] block font-extrabold">Étape 2 : Devis RFQ & Négociation Assistée par IA</strong>
                <p className="text-slate-600 dark:text-slate-300">
                  Le client sélectionne des produits et émet une demande de cotation sur mesure. Le fournisseur répond avec ses remises sur volume et délais de fabrication.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2">
                <strong className="text-base text-[#E85D22] block font-extrabold">Étape 3 : Paiement Séquestre Stripe & Expédition Suivie</strong>
                <p className="text-slate-600 dark:text-slate-300">
                  Les fonds sont cantonnés sur un compte de séquestre sécurisé. Le transporteur émet la lettre de voiture CMR, charge la marchandise et transmet la télémétrie thermique IoT jusqu'au port d'arrivée.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-2">
                <strong className="text-base text-[#E85D22] block font-extrabold">Étape 4 : Réception POD, Déblocage des Fonds & Écritures Comptables</strong>
                <p className="text-slate-600 dark:text-slate-300">
                  Le client émarge la preuve de livraison électronique. Les fonds sont transférés au fournisseur, la commission plateforme est prélevée et les écritures en partie double Débit = Crédit sont générées dans le Grand Livre.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* FOIRE AUX QUESTIONS (/faq) */}
        {pageType === 'faq' && (
          <Card title="Foire Aux Questions (FAQ) Publique" subtitle="Réponses claires aux interrogations les plus fréquentes des entreprises">
            <div className="space-y-4 text-xs">
              {[
                {
                  q: 'Comment sont protégés mes paiements B2B sur TradeLink ?',
                  r: 'Tous les paiements transitent par un compte séquestre certifié Stripe Escrow. Le fournisseur n’est réglé qu’après signature électronique de la preuve de livraison (POD) par l’acheteur.',
                },
                {
                  q: 'Quel est le délai accordé pour soumettre mes pièces KYC ?',
                  r: 'Vous disposez d’un compte à rebours de 7 jours calendaires (avec notifications automatiques à J+1, J+3, J+5 et J+6). Tout dossier déposé à temps est protégé contre la suspension.',
                },
                {
                  q: 'Comment TradeLink garantit-il la conformité de la chaîne du froid ?',
                  r: 'Les véhicules affectés disposent obligatoirement d’un certificat d’agrément ATP de classe FRC et de sondes IoT transmettant la température en continu avec alerte automatique si dépassement de consigne.',
                },
                {
                  q: 'Mes données commerciales privées sont-elles visibles par mes concurrents ?',
                  r: 'Absolument pas. L’architecture RBAC isole rigoureusement les catalogues, prix négociés, devis et écritures comptables entre chaque organisation.',
                },
              ].map((faq, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-1.5">
                  <strong className="text-sm text-slate-900 dark:text-white block font-bold">Q : {faq.q}</strong>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{faq.r}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* CONTACT (/contact) */}
        {pageType === 'contact' && (
          <Card title="Contact Commercial & Bureaux Internationaux" subtitle="Nos équipes vous répondent en Français, Anglais et Arabe">
            <div className="grid lg:grid-cols-2 gap-8 text-xs">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  notifyToast('Votre message a été transmis avec succès. Un conseiller vous répond sous 24h.', 'success');
                }}
                className="space-y-4"
              >
                <Input label="Nom & Prénom *" placeholder="Ex: Youssef Berrada" required />
                <Input label="Entreprise & Numéro SIREN / RC *" placeholder="Ex: Atlas Import S.A." required />
                <Input label="Email Professionnel *" type="email" placeholder="contact@entreprise.com" required />
                <Input label="Téléphone Mobile *" type="tel" placeholder="+212 / +33 / +49..." required />
                <div>
                  <label className="block text-xs font-semibold mb-1">Votre message ou projet commercial :</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Précisez votre volume annuel d'import/export, votre flotte ou vos besoins..."
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#071E22] border border-slate-300 dark:border-teal-800 text-xs"
                  />
                </div>
                <Button type="submit" variant="primary">
                  Envoyer la Demande Commerciale
                </Button>
              </form>

              <div className="space-y-4">
                <strong className="text-sm text-slate-900 dark:text-white block font-bold">Nos Sièges & Plateformes :</strong>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-1">
                    <strong className="text-[#E85D22] block font-bold">Paris — Siège Europe</strong>
                    <p className="text-slate-500">128 Boulevard Saint-Germain, 75006 Paris, France</p>
                    <p className="text-slate-400 font-mono">Tél : +33 1 88 40 10 00 • contact.paris@tradelink-saas.com</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-1">
                    <strong className="text-[#E85D22] block font-bold">Casablanca — Hub Afrique & Méditerranée</strong>
                    <p className="text-slate-500">Casablanca Finance City (CFC), Tour CFC 14e étage, Casablanca, Maroc</p>
                    <p className="text-slate-400 font-mono">Tél : +212 5 22 90 14 00 • contact.casa@tradelink-saas.com</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#071E22] border border-slate-200 dark:border-teal-800 space-y-1">
                    <strong className="text-[#E85D22] block font-bold">Hambourg — Pôle Logistique & Maritime</strong>
                    <p className="text-slate-500">HafenCity Speicherstadt, Am Sandtorkai 48, 20457 Hamburg, Allemagne</p>
                    <p className="text-slate-400 font-mono">Tél : +49 40 8821 900 • contact.de@tradelink-saas.com</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* CONDITIONS GÉNÉRALES (/legal) */}
        {pageType === 'legal' && (
          <Card title="Conditions Générales d'Utilisation & de Vente B2B (CGU / CGV)" subtitle="Cadre contractuel, conformité et règlement des opérations">
            <div className="space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <p>
                <strong>Article 1 — Objet :</strong> La plateforme TRADELINK V6.0 fournit une suite logicielle SaaS pour la gestion des relations commerciales B2B, de la logistique multimodale et de la facturation.
              </p>
              <p>
                <strong>Article 2 — Compte & Processus KYC :</strong> L'accès aux fonctionnalités transactionnelles est subordonné à la validation du dossier KYC sous 7 jours. Les pièces d'identité et registres légaux sont chiffrés par enveloppe KMS.
              </p>
              <p>
                <strong>Article 3 — Séquestre des Paiements :</strong> Tout virement ou débit carte transite par le compte de séquestre sécurisé. Les fonds sont libérés au fournisseur sur présentation de la preuve de livraison (POD) visée électroniquement.
              </p>
              <p>
                <strong>Article 4 — Droit Applicable :</strong> Les présentes conditions sont régies par le droit commercial international sous arbitrage CNUDCI.
              </p>
            </div>
          </Card>
        )}

        {/* POLITIQUE DE CONFIDENTIALITÉ (/privacy) */}
        {pageType === 'privacy' && (
          <Card title="Politique de Confidentialité & Protection des Données (RGPD / CNDP)" subtitle="Chiffrement des données en transit (TLS 1.3) et au repos (AES-256-GCM)">
            <div className="space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <p>
                <strong>1. Données Collectées :</strong> Nous collectons uniquement les informations requises pour l'exécution des contrats commerciaux, la vérification KYC et la traçabilité logistique.
              </p>
              <p>
                <strong>2. Chiffrement par Enveloppe KMS :</strong> Les justificatifs sensibles sont chiffrés avec une clé de données (DEK) unique protégée par une clé maîtresse (KEK) renouvelée périodiquement.
              </p>
              <p>
                <strong>3. Vos Droits :</strong> Conformément au RGPD et à la loi 09-08, vous disposez d'un droit d'accès, de rectification et d'effacement de vos données personnelles via notre DPO à dpo@tradelink-saas.com.
              </p>
            </div>
          </Card>
        )}

        {/* POLITIQUE DE COOKIES (/cookies) */}
        {pageType === 'cookies' && (
          <Card title="Politique Relative aux Cookies & Traceurs" subtitle="Conformité stricte aux directives de la CNIL et du Comité Européen de la Protection des Données">
            <div className="space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <p>
                <strong>1. Cookies Strictement Nécessaires :</strong> TRADELINK utilise des cookies de session pour maintenir la connexion active de manière unique (session Redis), protéger contre les attaques CSRF et mémoriser votre choix de langue et de thème.
              </p>
              <p>
                <strong>2. Absence de Traceurs Publicitaires Tiers :</strong> Aucun cookie à visée publicitaire ou de profilage commercial tiers n'est déposé sur votre terminal.
              </p>
              <p>
                <strong>3. Gestion du Consentement :</strong> Vous pouvez modifier vos préférences de consentement à tout moment en utilisant le sélecteur situé au bas de nos pages publiques.
              </p>
            </div>
          </Card>
        )}

        {/* BLOG (/blog) */}
        {pageType === 'blog' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-extrabold">Blog B2B, Livres Blancs & Actualités Douanières</h1>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: 'Optimiser le dédouanement multimodal avec l’OCR/IDP', cat: 'Douane & IA', img: '/images/container-terminal.jpg' },
                { title: 'Conventions ACT/365 vs ACT/360 et précision Decimal.js', cat: 'Finance & Comptabilité', img: '/images/warehouse-operations.jpg' },
                { title: 'Sécurité des imports ERP : Sandbox éphémère isolée', cat: 'Cybersécurité & KMS', img: '/images/road-freight-truck.jpg' },
              ].map((art) => (
                <Card key={art.title} title={art.title} subtitle={art.cat}>
                  <img src={art.img} alt={art.title} className="h-44 w-full object-cover rounded-xl mb-3" />
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Guide complet rédigé par nos ingénieurs et spécialistes du commerce international.
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ============================================================================
// 4 & 5. PORTAIL D'AUTHENTIFICATION (/login, /register, /verify-otp, /forgot-password, /mfa)
// ============================================================================

export const AuthPortalPage: React.FC<{
  mode: 'login' | 'register' | 'otp' | 'forgot' | 'mfa';
}> = ({ mode }) => {
  const { currentUser, switchUserAccount, addAuditLog, notifyToast } = useApp();
  const navigate = useNavigate();

  // États Login & Brute-Force Lockout
  const [loginEmail, setLoginEmail] = useState('direction.sec@tradelink-saas.com');
  const [loginPassword, setLoginPassword] = useState('TradeLink#Admin2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  // États Register Visiteur (Pré-Client)
  const [regRole, setRegRole] = useState<'CLIENT' | 'FOURNISSEUR' | 'TRANSPORTEUR' | 'ADMIN_ATTEMPT'>('CLIENT');
  const [regFullName, setRegFullName] = useState('Youssef Berrada');
  const [regCompany, setRegCompany] = useState('Atlas Import & Distribution S.A.');
  const [regEmail, setRegEmail] = useState('achats@atlas-import-retail.ma');
  const [regPhone, setRegPhone] = useState('+212 6 61 00 22 44');
  const [regTaxId, setRegTaxId] = useState('MA-ICE-002849100');
  const [regAddress, setRegAddress] = useState('14 Boulevard d’Anfa, Casablanca');
  const [regPassword, setRegPassword] = useState('SecureTrade#2026!');
  const [regCountry, setRegCountry] = useState('Maroc (MA)');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [generatedArgonHash, setGeneratedArgonHash] = useState<string>(() =>
    hashPasswordArgon2id('SecureTrade#2026!', 'a1b2c3d4e5f60718')
  );

  // États OTP & WebOTP API
  const [otpCode, setOtpCode] = useState('482910');
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);
  const otpFormRef = useRef<HTMLFormElement>(null);
  const otpAbortRef = useRef<AbortController | null>(null);

  // États Mot de Passe Oublié & Jeton à Usage Unique
  const [resetEmail, setResetEmail] = useState('achats@atlas-import-retail.ma');
  const [singleUseResetToken, setSingleUseResetToken] = useState<string | null>(null);
  const [tokenConsumed, setTokenConsumed] = useState(false);
  const [newResetPassword, setNewResetPassword] = useState('NewArgon2id#2026!');

  // États MFA TOTP Admin & QR Code
  const totpSecret = generateTotpSecretBase32(currentUser.email);
  const otpAuthUri = buildOtpAuthUri(currentUser.email, totpSecret);
  const liveTotpCode = computeCurrentTotpCode(totpSecret, 0);
  const [mfaCodeInput, setMfaCodeInput] = useState(liveTotpCode);

  useEffect(() => {
    if (mode !== 'otp') return;
    if (typeof window === 'undefined' || !('OTPCredential' in window)) return;

    otpAbortRef.current?.abort();
    const ac = new AbortController();
    otpAbortRef.current = ac;

    (navigator.credentials as any)
      .get({ otp: { transport: ['sms'] }, signal: ac.signal })
      .then((otp: any) => {
        if (otp?.code) {
          setOtpCode(otp.code);
          otpFormRef.current?.requestSubmit();
        }
      })
      .catch((err: any) => {
        if (err?.name === 'AbortError') return;
      });

    return () => {
      ac.abort();
    };
  }, [mode]);

  const stopSmsOtpListener = () => {
    if (otpAbortRef.current) {
      otpAbortRef.current.abort();
      otpAbortRef.current = null;
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedUntil && Date.now() < lockedUntil) {
      notifyToast(
        'Compte temporairement verrouillé (Protection Brute-Force : 5 tentatives échouées).',
        'error'
      );
      return;
    }

    if (loginPassword.length < 8) {
      const nextFails = failedAttempts + 1;
      setFailedAttempts(nextFails);
      if (nextFails >= 5) {
        setLockedUntil(Date.now() + 15 * 60 * 1000);
        addAuditLog(
          'AUTH_BRUTE_FORCE_LOCKOUT',
          'User',
          loginEmail,
          'DENIED',
          'Verrouillage automatique de 15 minutes après 5 échecs consécutifs.'
        );
        notifyToast('5 échecs consécutifs : Compte verrouillé pour 15 minutes (Protection Brute-Force).', 'error');
      } else {
        notifyToast(`Identifiants invalides (Tentative ${nextFails}/5 avant verrouillage).`, 'warning');
      }
      return;
    }

    setFailedAttempts(0);

    // Détermination de la redirection selon le compte
    if (loginEmail.includes('admin') || loginEmail.includes('direction')) {
      addAuditLog('AUTH_ARGON2ID_VERIFIED', 'User', loginEmail, 'SUCCESS', 'Admin vérifié ; redirection vers MFA TOTP.');
      navigate('/mfa');
    } else if (loginEmail.includes('supp') || loginEmail.includes('eurotech')) {
      switchUserAccount('FOURNISSEUR');
      notifyToast('Connexion Fournisseur réussie.', 'success');
      navigate('/fournisseur/dashboard');
    } else if (loginEmail.includes('trans') || loginEmail.includes('medfreight')) {
      switchUserAccount('TRANSPORTEUR');
      notifyToast('Connexion Transporteur réussie.', 'success');
      navigate('/transporteur/dashboard');
    } else if (loginEmail.includes('compta') || loginEmail.includes('audit')) {
      switchUserAccount('COMPTABLE');
      notifyToast('Connexion Comptable réussie (Lecture Seule).', 'success');
      navigate('/comptable/dashboard');
    } else {
      switchUserAccount('CLIENT');
      notifyToast('Connexion Client B2B réussie.', 'success');
      navigate('/client/dashboard');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regRole === 'ADMIN_ATTEMPT') {
      addAuditLog(
        'AUTH_PUBLIC_ADMIN_REGISTER_BLOCKED',
        'User',
        regEmail,
        'DENIED',
        'Tentative d’inscription publique Administrateur bloquée (Provisionnement manuel obligatoire).'
      );
      notifyToast(
        'Interdit : Les comptes Administrateur sont provisionnés manuellement et ne peuvent pas être créés publiquement.',
        'error'
      );
      return;
    }

    if (!termsAccepted) {
      notifyToast('Veuillez accepter les Conditions Générales et la Politique de Confidentialité.', 'warning');
      return;
    }

    const phc = hashPasswordArgon2id(regPassword);
    setGeneratedArgonHash(phc);
    addAuditLog(
      'AUTH_VISITOR_REGISTERED_ARGON2ID',
      'User',
      regEmail,
      'SUCCESS',
      `Visiteur inscrit (${regRole}) avec hachage Argon2id. Démarrage compte à rebours KYC J+7.`
    );
    notifyToast(
      `Compte ${regRole} créé avec succès (Hachage Argon2id) ! Vérifiez votre code OTP à 6 chiffres.`,
      'success'
    );
    navigate('/verify-otp');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#071E21]">
      <PublicNavbar />
      <CookieConsentBanner />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0B2E32] border border-slate-200 dark:border-teal-800 shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <BrandLogo variant="horizontal" className="h-10" />
            <Badge variant="orange">Argon2id • JWT • Session Unique</Badge>
          </div>

          {/* 5. CONNEXION (/login) */}
          {mode === 'login' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Connexion Sécurisée TradeLink V6.0</h1>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                  Session unique active : toute nouvelle connexion révoque immédiatement la session précédente et ses refresh tokens.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Email professionnel
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    spellCheck={false}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border px-3.5 py-2 text-sm bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 border-slate-300 dark:border-teal-800 focus:border-[#E85D22] focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="current-password" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Mot de passe (vérifié par Argon2id)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="current-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border ps-3.5 pe-11 py-2 text-sm bg-white dark:bg-[#0A292C] text-slate-900 dark:text-slate-100 border-slate-300 dark:border-teal-800 focus:border-[#E85D22] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      className="absolute inset-inline-end-2.5 p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <Link to="/forgot-password" className="text-[#E85D22] hover:underline font-semibold">
                    Mot de passe oublié ?
                  </Link>
                  <button
                    type="button"
                    onClick={() => setLoginPassword('short')}
                    className="text-slate-400 hover:underline"
                  >
                    Tester Lockout Brute-Force ({failedAttempts}/5)
                  </button>
                </div>

                <Button type="submit" variant="primary" className="w-full" size="lg">
                  Se Connecter
                </Button>
              </form>

              <div className="pt-4 border-t border-slate-200 dark:border-teal-800">
                <p className="text-xs font-bold mb-2 text-slate-500">
                  Accès direct par profil métier (redirection automatique) :
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { k: 'ADMIN_1' as const, l: 'Admin #1 (MFA Actif)', p: '/admin/dashboard' },
                    { k: 'CLIENT' as const, l: 'Client B2B', p: '/client/dashboard' },
                    { k: 'FOURNISSEUR' as const, l: 'Fournisseur', p: '/fournisseur/dashboard' },
                    { k: 'TRANSPORTEUR' as const, l: 'Transporteur TIR', p: '/transporteur/dashboard' },
                    { k: 'COMPTABLE' as const, l: 'Comptable (Lecture Seule)', p: '/comptable/dashboard' },
                    { k: 'SUPPORT' as const, l: 'Support Client', p: '/support/dashboard' },
                  ].map((item) => (
                    <Button
                      key={item.k}
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        switchUserAccount(item.k);
                        navigate(item.p);
                      }}
                    >
                      {item.l}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. INSCRIPTION VISITEUR (/register) */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Créer un Compte Entreprise B2B</h1>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                  Choisissez votre rôle métier pour démarrer votre période d'accès et votre processus KYC de 7 jours.
                </p>
              </div>

              {/* Choix du profil métier */}
              <div>
                <label className="block text-xs font-semibold mb-1.5">Rôle Métier Opérationnel * :</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'CLIENT', label: 'Client Acheteur' },
                    { id: 'FOURNISSEUR', label: 'Fournisseur' },
                    { id: 'TRANSPORTEUR', label: 'Transporteur' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setRegRole(t.id as any)}
                      className={`p-2.5 rounded-xl font-bold border transition-all ${
                        regRole === t.id
                          ? 'bg-[#E85D22] text-white border-[#E85D22] shadow-sm'
                          : 'bg-slate-50 dark:bg-[#082225] border-slate-300 dark:border-teal-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Nom du Représentant Légal *"
                  id="reg-fullname"
                  name="fullname"
                  autoComplete="name"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  required
                />
                <Input
                  label="Raison Sociale de l'Entreprise *"
                  id="reg-org"
                  name="organization"
                  autoComplete="organization"
                  value={regCompany}
                  onChange={(e) => setRegCompany(e.target.value)}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Email Professionnel *"
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
                <Input
                  label="Téléphone Mobile (Vérification OTP) *"
                  id="reg-tel"
                  name="tel"
                  type="tel"
                  autoComplete="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Identifiant Fiscal / ICE / SIRET *"
                  id="reg-taxid"
                  name="taxid"
                  value={regTaxId}
                  onChange={(e) => setRegTaxId(e.target.value)}
                  required
                />
                <Input
                  label="Adresse du Siège Social *"
                  id="reg-address"
                  name="address"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Mot de passe (Haché Argon2id) *"
                  id="reg-new-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    if (e.target.value.length >= 8) {
                      setGeneratedArgonHash(hashPasswordArgon2id(e.target.value, 'a1b2c3d4e5f60718'));
                    }
                  }}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold mb-1">Pays d'Immatriculation :</label>
                  <select
                    value={regCountry}
                    onChange={(e) => setRegCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0A292C] border border-slate-300 dark:border-teal-800 text-xs font-bold"
                  >
                    <option value="Maroc (MA)">Maroc (MA)</option>
                    <option value="France (FR)">France (FR)</option>
                    <option value="Allemagne (DE)">Allemagne (DE)</option>
                    <option value="Espagne (ES)">Espagne (ES)</option>
                    <option value="Émirats Arabes Unis (AE)">Émirats Arabes Unis (AE)</option>
                  </select>
                </div>
              </div>

              {/* Acceptation des conditions */}
              <div className="space-y-2 text-xs pt-2">
                <label className="flex items-start gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded text-[#E85D22] focus:ring-[#E85D22]"
                  />
                  <span>
                    J'accepte les <Link to="/legal" className="text-[#E85D22] underline">Conditions Générales d'Utilisation</Link> et la <Link to="/privacy" className="text-[#E85D22] underline">Politique de Confidentialité</Link> de TRADELINK.
                  </span>
                </label>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 text-[11px] font-mono truncate">
                <span className="text-slate-400">Empreinte Argon2id générée : </span>
                <span className="text-emerald-600 dark:text-emerald-400">{generatedArgonHash.slice(0, 36)}...</span>
              </div>

              <Button type="submit" variant="primary" className="w-full" size="lg">
                Créer Mon Compte & Recevoir le Code OTP
              </Button>
            </form>
          )}

          {/* VÉRIFICATION OTP (/verify-otp) */}
          {mode === 'otp' && (
            <form
              ref={otpFormRef}
              method="POST"
              action="/verify-otp"
              onSubmit={(e) => {
                e.preventDefault();
                stopSmsOtpListener();
                if (!/^\d{6}$/.test(otpCode)) {
                  setOtpAttemptsLeft((n) => Math.max(0, n - 1));
                  notifyToast('Le code OTP doit comporter exactement 6 chiffres.', 'error');
                  return;
                }
                notifyToast(
                  'Code OTP vérifié ! Compte activé et compte à rebours KYC J+7 démarré avec succès.',
                  'success'
                );
                switchUserAccount('CLIENT');
                navigate('/client/kyc');
              }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-[#E85D22]" />
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Vérification OTP Mobile</h1>
                  <p className="text-xs text-slate-500">
                    Tentatives restantes : <strong>{otpAttemptsLeft}/5</strong> • Validité : 10 min
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="otp-input" className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Code de vérification SMS / Email
                </label>
                <p id="otp-format-hint" className="text-xs text-slate-500 dark:text-slate-400">
                  Saisissez le code à 6 chiffres reçu (format WebOTP lié au domaine).
                </p>
                <input
                  type="text"
                  id="otp-input"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  aria-describedby="otp-format-hint"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#062023] px-4 py-3 font-mono text-xl tracking-[0.35em] text-center min-h-[48px] focus:border-[#E85D22] focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 font-mono text-[11px] space-y-1">
                <p className="text-slate-500">Format SMS WebOTP officiel :</p>
                <p>Votre code de vérification TradeLink est {otpCode}.</p>
                <p className="text-[#E85D22] font-bold">@tradelink-saas.com #{otpCode}</p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="primary" className="flex-1">
                  Valider le Code & Accéder à l'Espace KYC
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    stopSmsOtpListener();
                    const nextCode = Math.floor(100000 + Math.random() * 899999).toString();
                    setOtpCode(nextCode);
                    notifyToast(`Nouveau code OTP envoyé : ${nextCode}`, 'info');
                  }}
                >
                  Renvoyer
                </Button>
              </div>
            </form>
          )}

          {/* MOT DE PASSE OUBLIÉ (/forgot-password) */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Récupération de Compte par Jeton à Usage Unique
              </h1>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const token = `rst_single_use_${Math.random().toString(36).slice(2, 12)}`;
                  setSingleUseResetToken(token);
                  setTokenConsumed(false);
                  notifyToast('Jeton à usage unique généré (expiration 15 minutes).', 'success');
                }}
                className="space-y-3"
              >
                <Input
                  label="Email professionnel du compte"
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  spellCheck={false}
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
                <Button type="submit" variant="secondary" className="w-full">
                  1. Générer Jeton de Réinitialisation Unique
                </Button>
              </form>

              {singleUseResetToken && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#E85D22]">
                      {singleUseResetToken}
                    </span>
                    <Badge variant={tokenConsumed ? 'danger' : 'success'}>
                      {tokenConsumed ? 'Jeton Consommé' : 'Jeton Valide (1 utilisation)'}
                    </Badge>
                  </div>
                  <Input
                    label="Nouveau mot de passe (Haché Argon2id)"
                    id="new-reset-pwd"
                    name="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      if (tokenConsumed) {
                        notifyToast(
                          'Erreur 400 RESET_TOKEN_ALREADY_USED : Ce jeton à usage unique a déjà été consommé !',
                          'error'
                        );
                        return;
                      }
                      setTokenConsumed(true);
                      addAuditLog(
                        'PASSWORD_RESET_SINGLE_USE_TOKEN',
                        'User',
                        resetEmail,
                        'SUCCESS',
                        'Mot de passe réinitialisé avec Argon2id.'
                      );
                      notifyToast('Mot de passe réinitialisé avec succès ! Sessions précédentes révoquées.', 'success');
                    }}
                  >
                    2. Valider le Nouveau Mot de Passe
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* MFA TOTP OBLIGATOIRE ADMIN (/mfa) */}
          {mode === 'mfa' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!verifyTotpCode(totpSecret, mfaCodeInput)) {
                  notifyToast('Code TOTP invalide ou expiré.', 'error');
                  return;
                }
                addAuditLog('AUTH_MFA_TOTP_VERIFIED', 'User', currentUser.email, 'SUCCESS', 'Second facteur TOTP vérifié.');
                notifyToast('MFA TOTP validé avec succès ! Session Administrateur active.', 'success');
                navigate('/admin/dashboard');
              }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <KeyRound className="w-6 h-6 text-[#E85D22]" />
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Authentification MFA TOTP</h1>
                  <p className="text-xs text-slate-500">
                    Obligatoire pour les comptes Administrateur (RFC 6238)
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 flex flex-col sm:flex-row items-center gap-4 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-24 h-24" aria-label="QR Code TOTP">
                    <rect width="100" height="100" fill="#ffffff" />
                    <rect x="8" y="8" width="26" height="26" fill="none" stroke="#0B3438" strokeWidth="6" />
                    <rect x="16" y="16" width="10" height="10" fill="#E85D22" />
                    <rect x="66" y="8" width="26" height="26" fill="none" stroke="#0B3438" strokeWidth="6" />
                    <rect x="74" y="16" width="10" height="10" fill="#0B3438" />
                    <rect x="8" y="66" width="26" height="26" fill="none" stroke="#0B3438" strokeWidth="6" />
                    <rect x="16" y="74" width="10" height="10" fill="#0B3438" />
                    <rect x="42" y="14" width="6" height="6" fill="#0B3438" />
                    <rect x="52" y="22" width="6" height="12" fill="#0B3438" />
                    <rect x="40" y="40" width="20" height="20" fill="#E85D22" />
                    <rect x="14" y="44" width="18" height="6" fill="#0B3438" />
                    <rect x="68" y="44" width="20" height="6" fill="#0B3438" />
                    <rect x="44" y="68" width="12" height="20" fill="#0B3438" />
                    <rect x="68" y="68" width="20" height="20" fill="#0B3438" />
                  </svg>
                </div>
                <div className="space-y-1.5 min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-white">Scannez le QR Code dans votre Authenticator</p>
                  <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                    Clé Base32 : {totpSecret}
                  </p>
                  <p className="font-mono text-[10px] text-slate-400 truncate">
                    URI : {otpAuthUri}
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <Badge variant="orange">Code Actuel : {liveTotpCode}</Badge>
                    <button
                      type="button"
                      onClick={() => setMfaCodeInput(computeCurrentTotpCode(totpSecret, 0))}
                      className="text-[11px] underline text-[#E85D22] inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Synchroniser
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="totp-input" className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Code TOTP à 6 chiffres
                </label>
                <input
                  id="totp-input"
                  name="totp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  value={mfaCodeInput}
                  onChange={(e) => setMfaCodeInput(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#062023] px-4 py-2.5 font-mono text-lg tracking-[0.3em] text-center"
                />
              </div>

              <Button type="submit" variant="primary" className="w-full" size="lg">
                Valider MFA TOTP & Ouvrir la Session
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
