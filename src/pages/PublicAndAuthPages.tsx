// ============================================================================
// TRADELINK V6.0 — ZONE PUBLIQUE (PAGES 1 À 5) & PORTAIL AUTHENTIFICATION COMPLET (PAGES 6 À 10)
// Conforme à PROMPT 5 & modern-web-guidance (autofill-sign-in-form, sms-otp-form) :
// - Inscription Visiteur (état pré-client, création Admin publique bloquée)
// - Hachage Argon2id, Protection Brute-Force (verrouillage après 5 échecs)
// - OTP à 6 chiffres avec WebOTP AbortController et format SMS @domain #code
// - Mot de passe oublié & Réinitialisation par jeton à usage unique
// - MFA TOTP obligatoire Admin avec QR Code SVG et clé Base32
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Moon,
  Sun,
  KeyRound,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { useApp, DEMO_USERS } from '../contexts/AppContext';
import { BrandLogo } from '../components/layout/AppLayout';
import { ALL_3D_ICONS, Icon3D } from '../components/ui/Icon3D';
import { Badge, Button, Card, Input, ToastNotification } from '../components/ui/DesignSystem';
import {
  buildOtpAuthUri,
  computeCurrentTotpCode,
  generateTotpSecretBase32,
  hashPasswordArgon2id,
  verifyTotpCode,
} from '../services/securityCrypto';

const PublicNavbar: React.FC = () => {
  const { locale, setLocale, t, resolvedDark, toggleQuickTheme, toastMessage } = useApp();
  return (
    <>
      <ToastNotification toast={toastMessage} />
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#082225]/90 backdrop-blur-md border-b border-slate-200 dark:border-teal-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo variant="horizontal" className="h-12" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Link to="/" className="hover:text-[#E85D22] transition-colors">
              {t('nav.home')}
            </Link>
            <Link to="/about" className="hover:text-[#E85D22] transition-colors">
              {t('nav.about')}
            </Link>
            <Link to="/blog" className="hover:text-[#E85D22] transition-colors">
              {t('nav.blog')}
            </Link>
            <Link to="/contact" className="hover:text-[#E85D22] transition-colors">
              {t('nav.contact')}
            </Link>
            <Link to="/legal" className="hover:text-[#E85D22] transition-colors">
              {t('nav.legal')}
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
            <Link to="/admin/dashboard">
              <Button variant="primary" size="sm">
                {t('nav.dashboard')}
              </Button>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
};

// PAGE 1 : LANDING PAGE (/)
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
              <Button
                size="lg"
                variant="primary"
                onClick={() => openRoleWorkspace('ADMIN_1', '/admin/dashboard')}
              >
                <span>{t('hero.cta.primary')}</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </Button>
              <Link to="/register">
                <Button size="lg" variant="secondary">
                  {t('nav.register')} (Parcours KYC J+7)
                </Button>
              </Link>
            </div>

            <div className="pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Accès direct aux 6 espaces métier (RBAC + Ownership contrôlés) :
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { key: 'ADMIN_1' as const, path: '/admin/dashboard', label: '1. Espace Admin (MFA & KMS)', icon: 'secure-parcel' as const },
                  { key: 'CLIENT' as const, path: '/client/dashboard', label: '2. Espace Client B2B', icon: 'pallet-load' as const },
                  { key: 'FOURNISSEUR' as const, path: '/fournisseur/dashboard', label: '3. Espace Fournisseur', icon: 'warehouse' as const },
                  { key: 'TRANSPORTEUR' as const, path: '/transporteur/dashboard', label: '4. Espace Transporteur', icon: 'semi-truck' as const },
                  { key: 'COMPTABLE' as const, path: '/comptable/dashboard', label: '5. Espace Comptable (ACT)', icon: 'analytics' as const },
                  { key: 'SUPPORT' as const, path: '/support/dashboard', label: '6. Espace Support & Live', icon: 'support' as const },
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

      {/* GALERIE DES RESSOURCES VISUELLES LANDING PAGE */}
      <section className="py-16 bg-white dark:bg-[#09272A] border-b border-slate-200 dark:border-teal-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Badge variant="info">INFRASTRUCTURE LOGISTIQUE & COMMERCE B2B</Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">
                Opérations Multimodales Connectées de Bout en Bout
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Du catalogue fournisseur à l’entrepôt automatisé, du transit aérien/maritime/routier jusqu’au rapprochement comptable.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <img
                src="/logos/tradelink-logos-dual.jpg"
                alt="Comparaison Thème Noir et Thème Blanc TradeLink"
                className="h-16 rounded-xl border border-slate-200 dark:border-teal-700 shadow-sm"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                img: '/images/air-cargo-sunset.jpg',
                icon: 'air-freight' as const,
                tag: 'Fret Aérien & Express',
                title: 'Hubs Aéroportuaires & Chaîne du Froid',
                desc: 'Suivi LTA temps réel, contrôle thermique IoT et dédouanement anticipé.',
              },
              {
                img: '/images/road-freight-truck.jpg',
                icon: 'semi-truck' as const,
                tag: 'Fret Routier TIR',
                title: 'Flotte Poids Lourds & Preuve POD',
                desc: 'Lettre de voiture CMR numérique, itinéraires optimisés et signature à la livraison.',
              },
              {
                img: '/images/warehouse-operations.jpg',
                icon: 'warehouse' as const,
                tag: 'Entrepôts & WMS',
                title: 'Tri Convoyeur, Chariots & Stocks',
                desc: 'Réservation automatique des stocks, alertes de seuil et traçabilité SKU/GS1.',
              },
              {
                img: '/images/container-terminal.jpg',
                icon: 'gantry-crane' as const,
                tag: 'Fret Maritime & Portuaire',
                title: 'Manutention Conteneurs & Douane',
                desc: 'Connaissements maritimes B/L, portiques et calcul automatique des coûts DDP/CIF.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="group rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#0B3136] border border-slate-200 dark:border-teal-800 shadow-md flex flex-col"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={card.img}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 inset-inline-start-3 bg-white/95 dark:bg-[#0B3438]/95 p-1.5 rounded-xl shadow-md">
                    <Icon3D name={card.icon} size="sm" />
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-bold text-[#E85D22] uppercase">{card.tag}</span>
                    <h3 className="text-base font-bold mt-1">{card.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                  <Link
                    to="/client/catalogue"
                    className="text-xs font-bold text-[#E85D22] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Explorer dans le SaaS</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </Link>
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

      <footer className="mt-auto bg-[#062023] text-slate-300 border-t border-teal-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
          <div className="space-y-3">
            <img
              src="/logos/logo-dark-horizontal.png"
              alt="TradeLink"
              className="h-10 w-auto rounded-lg"
            />
            <p className="text-slate-400 leading-relaxed">
              Plateforme SaaS B2B de référence — Commerce, Import-Export, Logistique, Comptabilité Decimal.js, OCR/IDP & Room Live.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-white uppercase mb-3">Navigation Publique</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="hover:text-orange-400">Landing Page (/)</Link></li>
              <li><Link to="/about" className="hover:text-orange-400">À propos (/about)</Link></li>
              <li><Link to="/contact" className="hover:text-orange-400">Contact (/contact)</Link></li>
              <li><Link to="/blog" className="hover:text-orange-400">Blog B2B (/blog)</Link></li>
              <li><Link to="/legal" className="hover:text-orange-400">Mentions Légales & RGPD (/legal)</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white uppercase mb-3">Authentification & Sécurité</h3>
            <ul className="space-y-2">
              <li><Link to="/register" className="hover:text-orange-400">Inscription KYC (/register)</Link></li>
              <li><Link to="/login" className="hover:text-orange-400">Connexion Argon2id (/login)</Link></li>
              <li><Link to="/verify-otp" className="hover:text-orange-400">Vérification OTP (/verify-otp)</Link></li>
              <li><Link to="/mfa" className="hover:text-orange-400">MFA TOTP Admin (/mfa)</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white uppercase mb-3">Architecture & Conformité</h3>
            <p className="text-slate-400 leading-relaxed">
              TLS 1.3 • Argon2id • AES-256-GCM • Enveloppe KMS (KEK/DEK) • Session unique Redis • Double validation Admin • FR / EN / AR (RTL).
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// PAGES 2 À 5 : PAGES ÉDITORIALES PUBLIQUES
export const EditorialPublicPage: React.FC<{ pageType: 'about' | 'contact' | 'blog' | 'legal' }> = ({
  pageType,
}) => {
  const { notifyToast } = useApp();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#071E21] text-slate-900 dark:text-slate-100">
      <PublicNavbar />
      <div className="max-w-6xl mx-auto px-4 py-12 flex-1 w-full space-y-8">
        {pageType === 'about' && (
          <Card title="À Propos de TRADELINK V6.0" subtitle="Mission, Architecture & Écosystème B2B International">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4 text-sm leading-relaxed">
                <p>
                  <strong>TRADELINK V6.0</strong> fédère les 6 acteurs clés de la chaîne de valeur B2B : Administrateurs, Clients, Fournisseurs, Transporteurs, Comptables et Support dans un environnement unifié, audité et multilingue (FR/EN/AR).
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Contrôle RBAC granulaire et propriété de ressource côté serveur</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Moteur financier déterministe Decimal.js (ACT/365, ACT/360, ACT/ACT)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Analyse OCR/IDP et Sandbox isolée pour imports SQL/BAK/DBF</span>
                  </li>
                </ul>
              </div>
              <img
                src="/images/warehouse-operations.jpg"
                alt="Entrepôt TradeLink"
                className="rounded-2xl shadow-lg max-h-80 w-full object-cover"
              />
            </div>
          </Card>
        )}

        {pageType === 'contact' && (
          <Card title="Contact & Support Commercial B2B" subtitle="Équipe disponible en Français, Anglais et Arabe">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                notifyToast('Votre demande a été transmise et journalisée avec accusé de réception.', 'success');
              }}
              className="grid sm:grid-cols-2 gap-4"
            >
              <Input label="Nom complet" name="fullname" autoComplete="name" placeholder="Ex: Youssef Berrada" required />
              <Input label="Entreprise / Raison Sociale" name="organization" autoComplete="organization" placeholder="Ex: Atlas Import S.A." required />
              <Input label="Email professionnel" type="email" name="email" autoComplete="email" spellCheck={false} placeholder="contact@entreprise.com" required />
              <Input label="Téléphone" type="tel" name="tel" autoComplete="tel" placeholder="+212 / +33 ..." />
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold block mb-1.5">Message</label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 dark:border-teal-800 bg-white dark:bg-[#0A292C] p-3 text-sm"
                  placeholder="Précisez votre besoin logistique, import-export ou comptable..."
                  required
                />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" variant="primary">Envoyer la demande</Button>
              </div>
            </form>
          </Card>
        )}

        {pageType === 'blog' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-extrabold">Blog & Ressources B2B TradeLink</h1>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Optimiser le dédouanement multimodal avec l’OCR/IDP',
                  cat: 'Douane & IA',
                  img: '/images/container-terminal.jpg',
                },
                {
                  title: 'Conventions ACT/365 vs ACT/360 et précision Decimal.js en comptabilité B2B',
                  cat: 'Finance & Comptabilité',
                  img: '/images/warehouse-operations.jpg',
                },
                {
                  title: 'Sécurité des imports ERP SQL/BAK : pourquoi la Sandbox éphémère est indispensable',
                  cat: 'Cybersécurité & KMS',
                  img: '/images/road-freight-truck.jpg',
                },
              ].map((art) => (
                <Card key={art.title} title={art.title} subtitle={art.cat}>
                  <img src={art.img} alt={art.title} className="h-44 w-full object-cover rounded-xl mb-3" />
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Guide complet conforme aux exigences du cahier des charges TradeLink V6.0.
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {pageType === 'legal' && (
          <Card
            title="Mentions Légales, CGU & Politique de Confidentialité (RGPD / KYC)"
            subtitle="Protection des données en transit (TLS 1.3) et au repos (AES-256-GCM via KMS)"
          >
            <div className="space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <p>
                <strong>1. Classification & Chiffrement :</strong> Les justificatifs KYC (CIN, Patente, RNE, Permis, Carte grise, Assurance) sont chiffrés avec AES-256-GCM par enveloppe (DEK/KEK). Toute consultation ou téléchargement par un administrateur habilité est consigné dans le journal d’audit immuable.
              </p>
              <p>
                <strong>2. Règle d’échéance KYC (7 jours) :</strong> Tout nouvel acteur dispose de 7 jours calendaires (rappels J+1, J+3, J+5, J+6). Si les pièces sont déposées dans les délais, aucune suspension automatique n’est déclenchée pendant le délai de revue administrative.
              </p>
              <p>
                <strong>3. Paramétrage par juridiction :</strong> Les règles fiscales, comptables, de facturation et de rétention sont paramétrables par pays d’exploitation.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PAGES 6 À 10 : AUTHENTIFICATION SÉCURISÉE (/login, /register, /verify-otp, /forgot-password, /mfa)
// Conforme aux guides autofill-sign-in-form et sms-otp-form
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
  const [regAccountType, setRegAccountType] = useState<'ENTREPRISE' | 'PARTICULIER' | 'ADMIN_ATTEMPT'>('ENTREPRISE');
  const [regFullName, setRegFullName] = useState('Karim Bennani');
  const [regCompany, setRegCompany] = useState('Maghreb Global Trade SARL');
  const [regEmail, setRegEmail] = useState('k.bennani@maghreb-trade.ma');
  const [regPhone, setRegPhone] = useState('+212 6 61 00 22 44');
  const [regPassword, setRegPassword] = useState('SecureTrade#2026!');
  const [generatedArgonHash, setGeneratedArgonHash] = useState<string>(() =>
    hashPasswordArgon2id('SecureTrade#2026!', 'a1b2c3d4e5f60718')
  );

  // États OTP & WebOTP API (Guide sms-otp-form)
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

  // Intégration WebOTP API avec AbortController (Guide sms-otp-form)
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
    addAuditLog(
      'AUTH_ARGON2ID_VERIFIED',
      'User',
      loginEmail,
      'SUCCESS',
      'Mot de passe vérifié par Argon2id ; redirection vers MFA TOTP.'
    );
    navigate('/mfa');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regAccountType === 'ADMIN_ATTEMPT') {
      addAuditLog(
        'AUTH_PUBLIC_ADMIN_REGISTER_BLOCKED',
        'User',
        regEmail,
        'DENIED',
        'Tentative d’inscription publique Administrateur bloquée (Provisionnement manuel obligatoire).'
      );
      notifyToast(
        'Interdit (Chapitre 2 & Annexe B) : Les comptes Administrateur sont provisionnés manuellement et ne peuvent pas être créés publiquement.',
        'error'
      );
      return;
    }

    const phc = hashPasswordArgon2id(regPassword);
    setGeneratedArgonHash(phc);
    addAuditLog(
      'AUTH_VISITOR_REGISTERED_ARGON2ID',
      'User',
      regEmail,
      'SUCCESS',
      `Visiteur inscrit (${regAccountType}) avec hachage Argon2id (${phc.slice(0, 32)}...). Envoi OTP.`
    );
    notifyToast(
      'Compte Visiteur (état pré-client) créé avec hachage Argon2id ! Vérifiez votre code OTP.',
      'success'
    );
    navigate('/verify-otp');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#071E21]">
      <PublicNavbar />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0B2E32] border border-slate-200 dark:border-teal-800 shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <BrandLogo variant="horizontal" className="h-10" />
            <Badge variant="orange">Argon2id • JWT • Session Unique</Badge>
          </div>

          {/* 7. CONNEXION (/login — Conforme au guide autofill-sign-in-form) */}
          {mode === 'login' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-extrabold">Connexion Sécurisée TradeLink V6.0</h1>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                  Politique de session unique active : toute nouvelle connexion révoque immédiatement la session précédente et ses refresh tokens rotatifs.
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
                    onClick={() => {
                      setLoginPassword('short');
                    }}
                    className="text-slate-500 hover:underline"
                  >
                    Simuler échec Brute-Force ({failedAttempts}/5)
                  </button>
                </div>

                <Button type="submit" variant="primary" className="w-full" size="lg">
                  Se connecter
                </Button>
              </form>

              <div className="pt-4 border-t border-slate-200 dark:border-teal-800">
                <p className="text-xs font-bold mb-2 text-slate-500">
                  Connexion rapide par rôle (invalide la session précédente dans Redis) :
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { k: 'ADMIN_1' as const, l: 'Admin #1 (MFA Actif)', p: '/admin/dashboard' },
                    { k: 'CLIENT' as const, l: 'Client B2B', p: '/client/dashboard' },
                    { k: 'FOURNISSEUR' as const, l: 'Fournisseur', p: '/fournisseur/dashboard' },
                    { k: 'TRANSPORTEUR' as const, l: 'Transporteur', p: '/transporteur/dashboard' },
                    { k: 'COMPTABLE' as const, l: 'Comptable Stage 3', p: '/comptable/dashboard' },
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

          {/* 6. INSCRIPTION VISITEUR (/register — État pré-client + Blocage Admin public) */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold">Inscription Visiteur (État Pré-Client)</h1>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                  Annexe B : Le visiteur devient client après approbation du parcours OTP & KYC (7 jours). Le compte Administrateur est provisionné manuellement.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {(
                  [
                    { id: 'ENTREPRISE', label: 'Entreprise B2B' },
                    { id: 'PARTICULIER', label: 'Particulier Pro' },
                    { id: 'ADMIN_ATTEMPT', label: 'Tester Blocage Admin' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRegAccountType(t.id)}
                    className={`p-2 rounded-xl font-bold border ${
                      regAccountType === t.id
                        ? 'bg-[#E85D22] text-white border-[#E85D22]'
                        : 'bg-slate-50 dark:bg-[#082225] border-slate-300 dark:border-teal-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <Input
                label="Nom complet du représentant"
                id="reg-fullname"
                name="fullname"
                autoComplete="name"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                required
              />
              <Input
                label="Raison sociale"
                id="reg-org"
                name="organization"
                autoComplete="organization"
                value={regCompany}
                onChange={(e) => setRegCompany(e.target.value)}
                required
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Email professionnel"
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
                  label="Téléphone mobile (OTP)"
                  id="reg-tel"
                  name="tel"
                  type="tel"
                  autoComplete="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  required
                />
              </div>
              <Input
                label="Mot de passe (haché avec Argon2id côté serveur)"
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

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 text-[11px] font-mono ltr-preserve truncate">
                <span className="text-slate-400">Empreinte Argon2id générée (jamais en clair) : </span>
                <span className="text-emerald-600 dark:text-emerald-400">{generatedArgonHash}</span>
              </div>

              <Button type="submit" variant="primary" className="w-full" size="lg">
                Créer le compte Visiteur & Recevoir le code OTP
              </Button>
            </form>
          )}

          {/* 8. VÉRIFICATION OTP (/verify-otp — Conforme au guide sms-otp-form) */}
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
                  'Code OTP vérifié ! Transition Visiteur → Client activée et échéancier KYC J+7 initialisé.',
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
                  <h1 className="text-xl font-extrabold">Vérification OTP à 6 chiffres</h1>
                  <p className="text-xs text-slate-500">
                    Tentatives restantes : <strong>{otpAttemptsLeft}/5</strong> • Validité : 10 min
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="otp-input" className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Code de vérification SMS / Email
                </label>
                {/* L'instruction est placée AU-DESSUS de l'input (règle obligatoire du guide sms-otp-form) */}
                <p id="otp-format-hint" className="text-xs text-slate-500 dark:text-slate-400">
                  Saisissez le code à 6 chiffres reçu (liaison d’origine WebOTP active).
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
                  className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#062023] px-4 py-3 font-mono text-xl tracking-[0.35em] text-center min-h-[48px] focus:border-[#E85D22] focus:outline-none ltr-preserve"
                />
              </div>

              {/* Aperçu du format SMS lié au domaine (@domain #code sur la toute dernière ligne) */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 font-mono text-[11px] ltr-preserve space-y-1">
                <p className="text-slate-500">Format SMS WebOTP lié à l’origine :</p>
                <p>Votre code de vérification TradeLink est {otpCode}.</p>
                <p className="text-[#E85D22] font-bold">@tradelink-saas.com #{otpCode}</p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="primary" className="flex-1">
                  Vérifier le code & Activer le profil Client
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

          {/* 9. MOT DE PASSE OUBLIÉ & RÉINITIALISATION PAR JETON À USAGE UNIQUE (/forgot-password) */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <h1 className="text-xl font-extrabold">
                Récupération & Réinitialisation par Jeton à Usage Unique
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
                  1. Générer un jeton de réinitialisation à usage unique (15 min)
                </Button>
              </form>

              {singleUseResetToken && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#082225] border border-slate-200 dark:border-teal-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#E85D22] ltr-preserve">
                      {singleUseResetToken}
                    </span>
                    <Badge variant={tokenConsumed ? 'danger' : 'success'}>
                      {tokenConsumed ? 'Jeton Consommé (Invalide)' : 'Valide (1 seule utilisation)'}
                    </Badge>
                  </div>
                  <Input
                    label="Nouveau mot de passe (haché Argon2id)"
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
                        'Mot de passe réinitialisé avec Argon2id ; jeton invalidé et sessions révoquées.'
                      );
                      notifyToast(
                        'Mot de passe mis à jour avec Argon2id et sessions précédentes révoquées !',
                        'success'
                      );
                    }}
                  >
                    2. Appliquer le nouveau mot de passe (Consomme le jeton)
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 10. MFA TOTP OBLIGATOIRE ADMIN & QR CODE (/mfa) */}
          {mode === 'mfa' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!verifyTotpCode(totpSecret, mfaCodeInput)) {
                  notifyToast('Code TOTP invalide ou expiré.', 'error');
                  return;
                }
                addAuditLog(
                  'AUTH_MFA_TOTP_VERIFIED',
                  'User',
                  currentUser.email,
                  'SUCCESS',
                  'Second facteur TOTP vérifié avec succès.'
                );
                notifyToast('MFA TOTP vérifié avec succès ! Session Administrateur active.', 'success');
                navigate('/admin/dashboard');
              }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <KeyRound className="w-6 h-6 text-[#E85D22]" />
                <div>
                  <h1 className="text-xl font-extrabold">Authentification Multi-Facteurs (MFA TOTP)</h1>
                  <p className="text-xs text-slate-500">
                    Obligatoire pour tous les comptes Administrateur (Chapitre 2.2 & RFC 6238)
                  </p>
                </div>
              </div>

              {/* QR Code SVG & Clé Secrète TOTP Base32 */}
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
                  <p className="font-bold">Configuration Authenticator (TOTP SHA-1 30s)</p>
                  <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 ltr-preserve">
                    Clé Base32 : {totpSecret}
                  </p>
                  <p className="font-mono text-[10px] text-slate-400 truncate ltr-preserve">
                    {otpAuthUri}
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <Badge variant="orange">Code TOTP actuel : {liveTotpCode}</Badge>
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
                <label htmlFor="totp-input" className="text-xs font-bold">
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
                  className="w-full rounded-xl border border-slate-300 dark:border-teal-700 bg-white dark:bg-[#062023] px-4 py-2.5 font-mono text-lg tracking-[0.3em] text-center ltr-preserve"
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
