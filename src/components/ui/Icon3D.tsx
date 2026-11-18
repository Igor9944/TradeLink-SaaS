import React from 'react';
import { Icon3DName } from '../../types';

export const ALL_3D_ICONS: { name: Icon3DName; labelFr: string; labelEn: string; labelAr: string; category: string }[] = [
  { name: 'delivery-van', labelFr: 'Fourgon de livraison', labelEn: 'Delivery Van', labelAr: 'شاحنة توصيل', category: 'Transport' },
  { name: 'scooter', labelFr: 'Scooter express', labelEn: 'Scooter', labelAr: 'سكوتر سريع', category: 'Transport' },
  { name: 'air-freight', labelFr: 'Fret aérien', labelEn: 'Air Freight', labelAr: 'شحن جوي', category: 'Multimodal' },
  { name: 'sea-freight', labelFr: 'Fret maritime', labelEn: 'Sea Freight', labelAr: 'شحن بحري', category: 'Multimodal' },
  { name: 'drone', labelFr: 'Drone autonome', labelEn: 'Drone', labelAr: 'درون توصيل', category: 'Innovation' },
  { name: 'container', labelFr: 'Conteneur ISO', labelEn: 'Container', labelAr: 'حاوية شحن', category: 'Multimodal' },
  { name: 'rail-freight', labelFr: 'Fret ferroviaire', labelEn: 'Rail Freight', labelAr: 'شحن بالسكك الحديدية', category: 'Multimodal' },
  { name: 'parcel-stack', labelFr: 'Pile de colis', labelEn: 'Parcel Stack', labelAr: 'طرود مكدسة', category: 'Stock' },
  { name: 'pallet-load', labelFr: 'Palette filmée', labelEn: 'Pallet Load', labelAr: 'طبلية شحن', category: 'Stock' },
  { name: 'fragile', labelFr: 'Colis fragile', labelEn: 'Fragile', labelAr: 'قابل للكسر', category: 'Manutention' },
  { name: 'cold-chain', labelFr: 'Chaîne du froid', labelEn: 'Cold Chain', labelAr: 'سلسلة التبريد', category: 'Spécialisé' },
  { name: 'returns', labelFr: 'Retours / Reverse', labelEn: 'Returns', labelAr: 'مرتجعات', category: 'Flux' },
  { name: 'warehouse', labelFr: 'Entrepôt logistique', labelEn: 'Warehouse', labelAr: 'مستودع لوجستي', category: 'Infrastructure' },
  { name: 'forklift', labelFr: 'Chariot élévateur', labelEn: 'Forklift', labelAr: 'رافعة شوكية', category: 'Manutention' },
  { name: 'hand-truck', labelFr: 'Diable de manutention', labelEn: 'Hand Truck', labelAr: 'عربة يدوية', category: 'Manutention' },
  { name: 'conveyor', labelFr: 'Convoyeur automatisé', labelEn: 'Conveyor', labelAr: 'حزام ناقل', category: 'Infrastructure' },
  { name: 'mailbox', labelFr: 'Boîte postale B2B', labelEn: 'Mailbox', labelAr: 'صندوق بريد', category: 'Flux' },
  { name: 'location-pin', labelFr: 'Point GPS', labelEn: 'Location Pin', labelAr: 'موقع جغرافي', category: 'Tracking' },
  { name: 'live-tracking', labelFr: 'Suivi temps réel', labelEn: 'Live Tracking', labelAr: 'تتبع مباشر', category: 'Tracking' },
  { name: 'global-reach', labelFr: 'Couverture mondiale', labelEn: 'Global Reach', labelAr: 'تغطية عالمية', category: 'International' },
  { name: 'route-map', labelFr: 'Itinéraire optimisé', labelEn: 'Route Map', labelAr: 'خريطة المسار', category: 'Tracking' },
  { name: 'scanner', labelFr: 'Scanner code-barres', labelEn: 'Scanner', labelAr: 'ماسح ضوئي', category: 'Opérations' },
  { name: 'checklist', labelFr: 'Contrôle conformité', labelEn: 'Checklist', labelAr: 'قائمة فحص', category: 'Conformité' },
  { name: 'weight-check', labelFr: 'Pesée certifiée', labelEn: 'Weight Check', labelAr: 'فحص الوزن', category: 'Opérations' },
  { name: 'courier-helmet', labelFr: 'Équipement coursier', labelEn: 'Courier Helmet', labelAr: 'خوذة سائق', category: 'Transport' },
  { name: 'handover', labelFr: 'Remise en main propre', labelEn: 'Handover', labelAr: 'تسليم مباشر', category: 'Livraison' },
  { name: 'courier-bag', labelFr: 'Sacoche express', labelEn: 'Courier Bag', labelAr: 'حقيبة توصيل', category: 'Livraison' },
  { name: 'fast-delivery', labelFr: 'SLA & Délais urgents', labelEn: 'Fast Delivery', labelAr: 'توصيل سريع', category: 'SLA' },
  { name: 'insured', labelFr: 'Sécurité & Assurance', labelEn: 'Insured', labelAr: 'تأمين وحماية', category: 'Sécurité' },
  { name: 'support', labelFr: 'Support & Room Live', labelEn: 'Support', labelAr: 'الدعم المباشر', category: 'Collaboration' },
  { name: 'semi-truck', labelFr: 'Semi-remorque TIR', labelEn: 'Semi Truck', labelAr: 'شاحنة ثقيلة', category: 'Transport' },
  { name: 'cargo-bike', labelFr: 'Cargo urbain', labelEn: 'Cargo Bike', labelAr: 'دراجة شحن', category: 'Éco' },
  { name: 'shelving-rack', labelFr: 'Rack de stockage', labelEn: 'Shelving Rack', labelAr: 'رفوف تخزين', category: 'Stock' },
  { name: 'warehouse-robot', labelFr: 'Robot AGV / IA', labelEn: 'Warehouse Robot', labelAr: 'روبوت ذكي', category: 'IA & Automatisation' },
  { name: 'gantry-crane', labelFr: 'Portique à conteneurs', labelEn: 'Gantry Crane', labelAr: 'رافعة ميناء', category: 'Multimodal' },
  { name: 'parcel-locker', labelFr: 'Consigne sécurisée', labelEn: 'Parcel Locker', labelAr: 'خزانة طرود', category: 'Livraison' },
  { name: 'secure-parcel', labelFr: 'Chiffrement KMS / Coffre', labelEn: 'Secure Parcel', labelAr: 'تشفير وأمان', category: 'Sécurité' },
  { name: 'eco-delivery', labelFr: 'Logistique verte RSE', labelEn: 'Eco Delivery', labelAr: 'شحن صديق للبيئة', category: 'Éco' },
  { name: 'hazardous-goods', labelFr: 'Matières ADR / Alertes', labelEn: 'Hazardous Goods', labelAr: 'مواد خطرة / تنبيه', category: 'Sécurité' },
  { name: 'temperature', labelFr: 'Sonde thermique IoT', labelEn: 'Temperature', labelAr: 'مراقبة الحرارة', category: 'Spécialisé' },
  { name: 'invoice', labelFr: 'Facture & OCR', labelEn: 'Invoice', labelAr: 'فاتورة إلكترونية', category: 'Finance' },
  { name: 'customs-stamp', labelFr: 'Validation KYC & Douane', labelEn: 'Customs Stamp', labelAr: 'ختم الجمارك والتحقق', category: 'Conformité' },
  { name: 'proof-of-delivery', labelFr: 'Preuve de livraison POD', labelEn: 'Proof of Delivery', labelAr: 'إثبات التسليم', category: 'Livraison' },
  { name: 'shipping-label', labelFr: 'Étiquette code-barres SKU', labelEn: 'Shipping Label', labelAr: 'ملصق شحن', category: 'Catalogue' },
  { name: 'analytics', labelFr: 'KPIs & Comptabilité', labelEn: 'Analytics', labelAr: 'التحليلات والمحاسبة', category: 'Finance' },
  { name: 'scheduled-drop', labelFr: 'Échéancier J+7 & Planning', labelEn: 'Scheduled Drop', labelAr: 'جدولة المواعيد', category: 'Planning' },
  { name: 'payment', labelFr: 'Paiements & Trésorerie', labelEn: 'Payment', labelAr: 'المدفوعات والخزينة', category: 'Finance' },
  { name: 'fuel', labelFr: 'Carburant & Flotte', labelEn: 'Fuel', labelAr: 'وقود الأسطول', category: 'Transport' },
  { name: 'fleet-keys', labelFr: 'Clés & Accès MFA/KMS', labelEn: 'Fleet Keys', labelAr: 'مفاتيح الأمان', category: 'Sécurité' },
  { name: 'doorstep-drop', labelFr: 'Livraison finale B2B', labelEn: 'Doorstep Drop', labelAr: 'تسليم للعميل', category: 'Livraison' },
];

interface Icon3DProps {
  name: Icon3DName;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  alt?: string;
  withGlow?: boolean;
}

const sizeMap = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
  '2xl': 'w-28 h-28',
};

export const Icon3D: React.FC<Icon3DProps> = ({
  name,
  size = 'md',
  className = '',
  alt,
  withGlow = false,
}) => {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none ltr-preserve ${
        withGlow
          ? 'rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white/60 to-orange-500/10 dark:from-emerald-400/15 dark:via-[#0F3D42] dark:to-orange-500/15 p-1.5 shadow-sm ring-1 ring-slate-200/70 dark:ring-teal-700/50'
          : ''
      } ${className}`}
    >
      <img
        src={`/icons/3d/${name}.png`}
        alt={alt ?? name}
        loading="lazy"
        className={`${sizeMap[size]} object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-110`}
      />
    </span>
  );
};
