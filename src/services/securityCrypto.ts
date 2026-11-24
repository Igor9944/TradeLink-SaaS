// ============================================================================
// TRADELINK V6.0 — CRYPTOGRAPHIE CONFORME ET SÉCURISÉE :
// ARGON2ID PHC (PBKDF2/SHA-512), JWT HMAC-SHA256, TOTP RFC 6238 SANS BACKDOOR,
// COMPARAISON EN TEMPS CONSTANT & GESTION DES SECRETS VIA ENVIRONNEMENT
// Conforme au Chapitre 2.2, PROMPT 5 et Remédiation Audit P0
// ============================================================================

import { UserRoleCode } from '../types';

// ============================================================================
// 1. PRIMITIVES CRYPTOGRAPHIQUES UNIVERSELLES & ARGON2ID AUTHENTIQUE (RFC 9106)
// ============================================================================

import * as nodeCryptoModule from 'crypto';
import { argon2id as nobleArgon2id } from '@noble/hashes/argon2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha1 } from '@noble/hashes/legacy.js';
import { sha256 } from '@noble/hashes/sha2.js';

const nodeCrypto: any = nodeCryptoModule;

// Chargement dynamique optionnel de @node-rs/argon2 (accélération native Rust en Node.js)
// En cas d'exécution navigateur/Vite, bascule transparente sur @noble/hashes/argon2.js (RFC 9106 bit-à-bit identique)
let nativeNodeRsArgon2: any = null;
try {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const dynamicReq = typeof require === 'function' ? require : null;
    if (dynamicReq) {
      nativeNodeRsArgon2 = dynamicReq('@node-rs/argon2');
    }
  }
} catch {
  nativeNodeRsArgon2 = null;
}

/**
 * Génère N octets cryptographiquement aléatoires
 */
export function getSecureRandomBytes(length: number): Uint8Array {
  if (nodeCrypto && typeof nodeCrypto.randomBytes === 'function') {
    return new Uint8Array(nodeCrypto.randomBytes(length));
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  throw new Error('CSPRNG_UNAVAILABLE: Aucune source aléatoire cryptographique disponible (node:crypto ou WebCrypto requis).');
}

/**
 * Génère une chaîne hexadécimale cryptographiquement aléatoire de byteLength octets (compatible Node & Browser).
 */
export function getSecureRandomHex(byteLength = 8): string {
  return bytesToHex(getSecureRandomBytes(byteLength));
}

/**
 * Génère un entier cryptographiquement aléatoire dans [minInclusive, maxExclusive[ (compatible Node & Browser).
 */
export function getSecureRandomInt(minInclusive: number, maxExclusive: number): number {
  if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive) || maxExclusive <= minInclusive) {
    throw new Error(`INVALID_RANDOM_RANGE: [${minInclusive}, ${maxExclusive})`);
  }
  const range = maxExclusive - minInclusive;
  if (nodeCrypto && typeof nodeCrypto.randomInt === 'function') {
    return nodeCrypto.randomInt(minInclusive, maxExclusive);
  }
  const maxUint32 = 0x100000000;
  const limit = maxUint32 - (maxUint32 % range);
  while (true) {
    const bytes = getSecureRandomBytes(4);
    const val = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    if (val < limit) {
      return minInclusive + (val % range);
    }
  }
}

/**
 * Génère un identifiant alphanumérique CSPRNG de longueur souhaitée (compatible Node & Browser).
 */
export function getSecureRandomAlphanumeric(length = 8): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[getSecureRandomInt(0, alphabet.length)];
  }
  return out;
}

/**
 * Comparaison en temps constant pour prévenir les attaques temporelles (Timing Attacks)
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  if (nodeCrypto && typeof nodeCrypto.timingSafeEqual === 'function') {
    try {
      const bufA = Buffer.from(a, 'utf-8');
      const bufB = Buffer.from(b, 'utf-8');
      if (bufA.length === bufB.length) {
        return nodeCrypto.timingSafeEqual(bufA, bufB);
      }
    } catch {}
  }

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ============================================================================
// 2. SHA-256 STANDARD (NIST FIPS 180-4) UNIVERSEL
// ============================================================================

function pureSha256Hex(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let formatted = ascii + '\x80';
  while ((formatted.length % 64) - 56) formatted += '\x00';
  for (i = 0; i < formatted.length; i++) {
    j = formatted.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words.push((asciiBitLength / maxWord) | 0);
  words.push(asciiBitLength | 0);

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = (i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0) | 0;

      const a = hash[0];
      const e = hash[4];
      const ch = (e & hash[5]) ^ (~e & hash[6]);
      const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 = (hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ch + k[i] + w[i]) | 0;
      const temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

/**
 * Calcule l'empreinte cryptographique SHA-256 standard (NIST FIPS 180-4)
 */
export function generateSha256Hash(input: string): string {
  if (nodeCrypto && typeof nodeCrypto.createHash === 'function') {
    return nodeCrypto.createHash('sha256').update(input, 'utf-8').digest('hex');
  }
  return pureSha256Hex(input);
}

/**
 * Calcule un HMAC-SHA256 standard en hexadécimal via Node.js crypto
 */
export function hmacSha256Hex(secret: string, data: string): string {
  if (nodeCrypto && typeof nodeCrypto.createHmac === 'function') {
    return nodeCrypto.createHmac('sha256', secret).update(data, 'utf-8').digest('hex');
  }
  return pureHmacSha256Hex(secret, data);
}

function pureHmacSha256Hex(secret: string, data: string): string {
  const keyBytes = new TextEncoder().encode(secret);
  const messageBytes = new TextEncoder().encode(data);
  return bytesToHex(hmac(sha256, keyBytes, messageBytes));
}

function pureHmacSha1Bytes(keyBytes: Uint8Array, messageBytes: Uint8Array): Uint8Array {
  return hmac(sha1, keyBytes, messageBytes);
}

// ============================================================================
// 2B. GESTION CENTRALISÉE DES SECRETS D'ENVIRONNEMENT & CONTRÔLE DE PRODUCTION
// ============================================================================

const runtimeEphemeralSecrets = new Map<string, string>();

const FORBIDDEN_WEAK_PATTERNS = [
  'change_me',
  'changeme',
  'mock_tradelink',
  'sample_tradelink',
  'tradelinkstrong2026password',
  'tradelinkredissecret2026',
  'tradelinks3supersecret2026',
  'tradelinkgrafanaadmin2026',
  'tradelink-kms-root-token-2026',
  'tradelink-b2b-attachment-kms-key-2026',
  'tradelink-kyc-vault-master-signing-key-v6',
  'tradelink_kms_hmac_secret_key',
  'tradelink-sfu-room-jwt-hmac-sha256-secret-key-enterprise-v6',
  'tradelink_doc_secret_key_9944',
  'whsec_stripe_secret_key_v6',
  'whsec_test_secret_key',
  'secret_key_v6',
  'replace_with',
];

export function isWeakOrExposedSecret(value: string | undefined | null, minLength = 32): boolean {
  if (!value || typeof value !== 'string') return true;
  const trimmed = value.trim();
  if (trimmed.length < minLength) return true;
  const lower = trimmed.toLowerCase();
  return FORBIDDEN_WEAK_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Récupère un secret HMAC/Service depuis les variables d'environnement.
 * - En production (NODE_ENV === 'production') : refuse de démarrer si le secret est absent ou faible.
 * - En développement/test : utilise la variable d'environnement ou génère une clé aléatoire CSPRNG de 256 bits en mémoire (aucun secret codé en dur).
 */
export function getServiceHmacSecret(envVarName: string): string {
  const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  const envVal = typeof process !== 'undefined' ? process.env?.[envVarName] : undefined;

  if (isProd) {
    if (isWeakOrExposedSecret(envVal, 32)) {
      throw new Error(
        `FATAL_SECURITY_CONFIG_ERROR: Secret requis "${envVarName}" absent, trop court (< 32 chars) ou compromis en environnement de production.`
      );
    }
    return envVal!.trim();
  }

  if (envVal && !isWeakOrExposedSecret(envVal, 16)) {
    return envVal.trim();
  }

  let ephemeral = runtimeEphemeralSecrets.get(envVarName);
  if (!ephemeral) {
    ephemeral = bytesToHex(getSecureRandomBytes(32));
    runtimeEphemeralSecrets.set(envVarName, ephemeral);
  }
  return ephemeral;
}

/**
 * Contrôle strict de la configuration de sécurité au démarrage du serveur.
 * Refuse le démarrage en production si des secrets requis sont absents/faibles ou si Vault est en mode dev.
 */
export function validateProductionSecurityEnv(
  customEnv?: Record<string, string | undefined>
): { valid: boolean; errors: string[] } {
  const env = customEnv ?? (typeof process !== 'undefined' ? process.env : {});
  const isProd = env.NODE_ENV === 'production';
  const errors: string[] = [];

  if (isProd) {
    // 1. Interdiction formelle du mode développement Vault en production
    if (env.VAULT_DEV_ROOT_TOKEN_ID || env.VAULT_DEV_LISTEN_ADDRESS || env.VAULT_DEV_MODE === 'true') {
      errors.push('VAULT_DEV_MODE_FORBIDDEN_IN_PRODUCTION: Configuration Vault de développement interdite en production.');
    }

    // 2. Vérification des secrets critiques
    const jwtSecret = env.JWT_SECRET || env.JWT_ACCESS_SECRET || env.SERVER_JWT_SECRET;
    if (isWeakOrExposedSecret(jwtSecret, 32)) {
      errors.push('JWT_SECRET_MISSING_OR_WEAK: Secret JWT absent, < 32 caractères ou valeur exposée.');
    }

    if (isWeakOrExposedSecret(env.DATABASE_URL, 24) || !env.DATABASE_URL?.startsWith('postgresql://')) {
      errors.push('DATABASE_URL_INVALID_OR_EXPOSED: DATABASE_URL manquante ou contient un mot de passe compromis.');
    }

    if (isWeakOrExposedSecret(env.REDIS_URL, 16)) {
      errors.push('REDIS_URL_INVALID_OR_EXPOSED: REDIS_URL manquante ou contient un mot de passe compromis.');
    }

    if (isWeakOrExposedSecret(env.S3_SECRET_KEY, 20)) {
      errors.push('S3_SECRET_KEY_MISSING_OR_WEAK: Clé secrète S3/MinIO absente ou compromise.');
    }

    if (isWeakOrExposedSecret(env.KMS_VAULT_TOKEN, 20)) {
      errors.push('KMS_VAULT_TOKEN_MISSING_OR_WEAK: Jeton KMS Vault absent ou compromis.');
    }

    if (isWeakOrExposedSecret(env.ATTACHMENT_SECRET, 32)) {
      errors.push('ATTACHMENT_SECRET_MISSING_OR_WEAK: Secret HMAC des fichiers (ATTACHMENT_SECRET) absent ou < 32 caractères.');
    }

    if (isWeakOrExposedSecret(env.KYC_SIGNING_SECRET, 32)) {
      errors.push('KYC_SIGNING_SECRET_MISSING_OR_WEAK: Secret HMAC KYC (KYC_SIGNING_SECRET) absent ou < 32 caractères.');
    }

    if (isWeakOrExposedSecret(env.OCR_HMAC_SECRET, 32)) {
      errors.push('OCR_HMAC_SECRET_MISSING_OR_WEAK: Secret HMAC OCR (OCR_HMAC_SECRET) absent ou < 32 caractères.');
    }

    if (isWeakOrExposedSecret(env.ROOM_ACCESS_TOKEN_SECRET, 32)) {
      errors.push('ROOM_ACCESS_TOKEN_SECRET_MISSING_OR_WEAK: Secret JWT Room Live (ROOM_ACCESS_TOKEN_SECRET) absent ou < 32 caractères.');
    }

    if (isWeakOrExposedSecret(env.STRIPE_WEBHOOK_SECRET, 32)) {
      errors.push('STRIPE_WEBHOOK_SECRET_MISSING_OR_WEAK: Secret Webhook Stripe (STRIPE_WEBHOOK_SECRET) absent ou < 32 caractères.');
    }

    if (isWeakOrExposedSecret(env.DOCUMENT_DOWNLOAD_SECRET, 32)) {
      errors.push('DOCUMENT_DOWNLOAD_SECRET_MISSING_OR_WEAK: Secret de téléchargement documentaire (DOCUMENT_DOWNLOAD_SECRET) absent ou < 32 caractères.');
    }

    if (isWeakOrExposedSecret(env.STRIPE_SECRET_KEY, 24)) {
      errors.push('STRIPE_SECRET_KEY_MISSING_OR_WEAK: Clé secrète API Stripe (STRIPE_SECRET_KEY) absente ou compromise.');
    }
  }

  if (isProd && errors.length > 0) {
    throw new Error(`PRODUCTION_STARTUP_SECURITY_CHECK_FAILED: ${errors.join(' | ')}`);
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// 3. HACHAGE DE MOT DE PASSE ARGON2ID AUTHENTIQUE (RFC 9106) & MIGRATION
// Format PHC standard : $argon2id$v=19$m=<memory>,t=<time>,p=<parallelism>$<salt_b64>$<tag_b64>
// Interdiction absolue de substituer SHA-512 ou FNV à Argon2id.
// ============================================================================

export interface Argon2idCostOptions {
  memoryCost?: number;  // m en KiB (défaut: 65536 = 64 MiB, min: 4096)
  timeCost?: number;    // t en itérations (défaut: 3, min: 2)
  parallelism?: number; // p en degrés de parallélisme (défaut: 4, min: 1)
  outputLen?: number;   // longueur du tag en octets (défaut: 32 octets = 256 bits)
}

const LEGACY_MOCK_SALTS = new Set([
  's1a2l3t4',
  'tradelink_salt',
  'mock_salt',
  'default_salt',
  'czFhMmwzdDQ', // 's1a2l3t4' en base64
]);

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64NoPad(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64').replace(/=+$/, '');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=+$/, '');
}

function base64NoPadToBytes(b64: string): Uint8Array {
  const padLen = (4 - (b64.length % 4)) % 4;
  const padded = b64 + '='.repeat(padLen);
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(padded, 'base64'));
  }
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function getArgon2idDefaultCost(): Required<Argon2idCostOptions> {
  const envMem = typeof process !== 'undefined' ? Number(process.env?.ARGON2_MEMORY_COST) : NaN;
  const envTime = typeof process !== 'undefined' ? Number(process.env?.ARGON2_TIME_COST) : NaN;
  const envPar = typeof process !== 'undefined' ? Number(process.env?.ARGON2_PARALLELISM) : NaN;

  return {
    memoryCost: !Number.isNaN(envMem) && envMem >= 4096 ? envMem : 65536,
    timeCost: !Number.isNaN(envTime) && envTime >= 2 ? envTime : 3,
    parallelism: !Number.isNaN(envPar) && envPar >= 1 ? envPar : 4,
    outputLen: 32,
  };
}

function resolveSaltBytes(customSalt?: string | Uint8Array): Uint8Array {
  if (!customSalt) {
    return getSecureRandomBytes(16);
  }
  if (customSalt instanceof Uint8Array) {
    if (customSalt.length < 8) {
      throw new Error('INSECURE_OR_LEGACY_SALT_REJECTED');
    }
    return customSalt;
  }
  const trimmed = customSalt.trim();
  if (trimmed.length < 8 || LEGACY_MOCK_SALTS.has(trimmed)) {
    throw new Error('INSECURE_OR_LEGACY_SALT_REJECTED');
  }
  return new TextEncoder().encode(trimmed);
}

/**
 * Hache un mot de passe avec le véritable algorithme Argon2id (RFC 9106)
 * via @node-rs/argon2 (Rust N-API) ou @noble/hashes/argon2.js (audit Cure53).
 * Génère une chaîne PHC authentique : $argon2id$v=19$m=<m>,t=<t>,p=<p>$<salt_b64>$<tag_b64>
 */
export function hashPasswordArgon2id(
  plainPassword: string,
  customSalt?: string,
  costOptions?: Argon2idCostOptions
): string {
  if (!plainPassword || plainPassword.length < 8) {
    throw new Error('PASSWORD_TOO_SHORT');
  }

  const defaults = getArgon2idDefaultCost();
  const m = costOptions?.memoryCost ?? defaults.memoryCost;
  const t = costOptions?.timeCost ?? defaults.timeCost;
  const p = costOptions?.parallelism ?? defaults.parallelism;
  const dkLen = costOptions?.outputLen ?? defaults.outputLen;

  if (m < 4096 || t < 2 || p < 1 || dkLen < 16) {
    throw new Error('ARGON2ID_INVALID_COST_PARAMETERS');
  }

  const saltBytes = resolveSaltBytes(customSalt);

  if (nativeNodeRsArgon2 && typeof nativeNodeRsArgon2.hashSync === 'function') {
    return nativeNodeRsArgon2.hashSync(plainPassword, {
      algorithm: 2, // Argon2id
      memoryCost: m,
      timeCost: t,
      parallelism: p,
      outputLen: dkLen,
      salt: Buffer.from(saltBytes),
    });
  }

  const tagBytes = nobleArgon2id(plainPassword, saltBytes, {
    m,
    t,
    p,
    dkLen,
  });

  const saltB64 = bytesToBase64NoPad(saltBytes);
  const tagB64 = bytesToBase64NoPad(tagBytes);
  return `$argon2id$v=19$m=${m},t=${t},p=${p}$${saltB64}$${tagB64}`;
}

/**
 * Détecte si un hash provient d'une ancienne implémentation factice (FNV 64 chars hex)
 * ou d'une dérivation intermédiaire SHA-512 (128 chars hex) non-Argon2id.
 * Un véritable hash Argon2id RFC 9106 (32 octets) possède un tag Base64 sans padding de 43 caractères
 * (et ne doit pas être exclusivement composé d'un condensat hexadécimal 64/128 chars).
 */
export function isLegacyMockHash(phcHash: string): boolean {
  if (!phcHash || typeof phcHash !== 'string' || !phcHash.startsWith('$argon2id$v=19$')) {
    return true;
  }
  const match = phcHash.match(
    /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/
  );
  if (!match) {
    return true;
  }

  const m = Number(match[1]);
  const t = Number(match[2]);
  const p = Number(match[3]);
  const saltB64 = match[4];
  const tagB64 = match[5];

  if (m < 4096 || t < 2 || p < 1) {
    return true;
  }

  if (saltB64.length < 11 || LEGACY_MOCK_SALTS.has(saltB64)) {
    return true;
  }

  // Rejet formel des anciens condensats hexadécimaux FNV (64 chars) et PBKDF2-SHA512 (128 chars)
  if (tagB64.length === 64 || tagB64.length === 128) {
    return true;
  }

  // Un tag Argon2id standard de 32 octets (256 bits) en Base64 sans padding fait exactement 43 caractères
  if (tagB64.length !== 43) {
    return true;
  }

  try {
    const decodedSalt = new TextDecoder().decode(base64NoPadToBytes(saltB64));
    if (LEGACY_MOCK_SALTS.has(decodedSalt)) {
      return true;
    }
  } catch {
    return true;
  }

  return false;
}

/**
 * Indique si le mot de passe utilisateur nécessite une réinitialisation obligatoire
 */
export function needsPasswordReset(phcHash: string): boolean {
  return isLegacyMockHash(phcHash);
}

/**
 * Stratégie de migration sécurisée des anciens hashes (FNV ou SHA-512) incompatibles :
 * - Ne convertit JAMAIS artificiellement un hash SHA-512 ou FNV en hash Argon2id
 * - Invalide immédiatement les sessions et jetons actifs de l'utilisateur
 * - Force la réinitialisation du mot de passe avant toute nouvelle connexion
 */
export function enforceLegacyHashMigration(params: {
  storedHash: string;
  userId?: string;
  onInvalidateUserSessions?: () => void;
}): { isLegacy: boolean; requiresPasswordReset: boolean; sessionsInvalidated: boolean } {
  const legacy = isLegacyMockHash(params.storedHash);
  if (legacy) {
    if (params.userId) {
      invalidateAllUserJwtTokens(params.userId);
    }
    if (params.onInvalidateUserSessions) {
      params.onInvalidateUserSessions();
    }
    return {
      isLegacy: true,
      requiresPasswordReset: true,
      sessionsInvalidated: Boolean(params.onInvalidateUserSessions || params.userId),
    };
  }
  return {
    isLegacy: false,
    requiresPasswordReset: false,
    sessionsInvalidated: false,
  };
}

/**
 * Vérifie un mot de passe avec le véritable algorithme Argon2id (RFC 9106)
 * et rejette catégoriquement tout ancien hash simulé ou SHA-512.
 */
export function verifyPasswordArgon2id(plainPassword: string, phcHash: string): boolean {
  if (!plainPassword || isLegacyMockHash(phcHash)) {
    return false;
  }

  if (nativeNodeRsArgon2 && typeof nativeNodeRsArgon2.verifySync === 'function') {
    try {
      return Boolean(nativeNodeRsArgon2.verifySync(phcHash, plainPassword));
    } catch {
      return false;
    }
  }

  const match = phcHash.match(
    /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/
  );
  if (!match) return false;

  const m = Number(match[1]);
  const t = Number(match[2]);
  const p = Number(match[3]);
  const saltB64 = match[4];
  const expectedTagB64 = match[5];

  try {
    const saltBytes = base64NoPadToBytes(saltB64);
    const expectedTagBytes = base64NoPadToBytes(expectedTagB64);
    const computedBytes = nobleArgon2id(plainPassword, saltBytes, {
      m,
      t,
      p,
      dkLen: expectedTagBytes.length,
    });
    const computedTagB64 = bytesToBase64NoPad(computedBytes);
    return constantTimeEqual(computedTagB64, expectedTagB64);
  } catch {
    return false;
  }
}

// ============================================================================
// 4. GESTION JWT SÉCURISÉE (HMAC-SHA256 & SECRETS D'ENVIRONNEMENT)
// ============================================================================

export type GranularPermission = string;

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: UserRoleCode;
  sessionId: string;
  mfaVerified: boolean;
  deviceId?: string;
  ttlSeconds?: number;
  iss?: string;
  aud?: string;
  jti?: string;
  iat: number;
  exp: number;
}

const JWT_ISSUER = 'urn:tradelink:auth:v6';
const JWT_AUDIENCE = 'urn:tradelink:api:v6';
const revokedJwtJtis = new Set<string>();
const userTokensInvalidatedAtSec = new Map<string, number>();

function getSharedRedisKvStore(): Map<string, { value: string; expiresAtMs: number | null }> | null {
  const sym = Symbol.for('tradelink.v6.shared.redis.cluster');
  const cluster = (globalThis as any)?.[sym];
  return cluster?.kvStore ?? null;
}

export function revokeJwtAccessTokenByJti(jti: string, ttlSeconds = 3600): void {
  if (jti) {
    revokedJwtJtis.add(jti);
    const kv = getSharedRedisKvStore();
    if (kv) {
      kv.set(`tradelink:jwt:revoked:jti:${jti}`, {
        value: '1',
        expiresAtMs: Date.now() + ttlSeconds * 1000,
      });
    }
  }
}

export function invalidateAllUserJwtTokens(userId: string): void {
  if (userId) {
    const nowSec = Math.floor(Date.now() / 1000);
    userTokensInvalidatedAtSec.set(userId, nowSec);
    const kv = getSharedRedisKvStore();
    if (kv) {
      kv.set(`tradelink:jwt:invalidated_before:${userId}`, {
        value: String(nowSec),
        expiresAtMs: Date.now() + 86400 * 7 * 1000,
      });
    }
  }
}

function isJtiRevokedInCluster(jti: string): boolean {
  if (revokedJwtJtis.has(jti)) return true;
  const kv = getSharedRedisKvStore();
  if (!kv) return false;
  const entry = kv.get(`tradelink:jwt:revoked:jti:${jti}`);
  if (!entry) return false;
  if (entry.expiresAtMs !== null && Date.now() > entry.expiresAtMs) {
    kv.delete(`tradelink:jwt:revoked:jti:${jti}`);
    return false;
  }
  return entry.value === '1';
}

function getUserInvalidatedBeforeFromCluster(userId: string): number | undefined {
  const localVal = userTokensInvalidatedAtSec.get(userId);
  const kv = getSharedRedisKvStore();
  if (!kv) return localVal;
  const entry = kv.get(`tradelink:jwt:invalidated_before:${userId}`);
  if (!entry) return localVal;
  if (entry.expiresAtMs !== null && Date.now() > entry.expiresAtMs) {
    kv.delete(`tradelink:jwt:invalidated_before:${userId}`);
    return localVal;
  }
  const clusterVal = Number(entry.value);
  if (Number.isNaN(clusterVal)) return localVal;
  return localVal !== undefined ? Math.max(localVal, clusterVal) : clusterVal;
}

// Secret maître sécurisé récupéré depuis l'environnement ou généré aléatoirement
let cachedJwtSecret: string | null = null;

function getJwtSecret(): string {
  if (cachedJwtSecret) return cachedJwtSecret;

  const envSecret =
    (typeof process !== 'undefined' &&
      (process.env?.JWT_SECRET || process.env?.JWT_ACCESS_SECRET || process.env?.SERVER_JWT_SECRET)) ||
    null;

  if (envSecret && !isWeakOrExposedSecret(envSecret, 32)) {
    cachedJwtSecret = envSecret;
    return cachedJwtSecret;
  }

  // Génération d'une clé cryptographique aléatoire de 256 bits (32 octets)
  const randomSecret = bytesToHex(getSecureRandomBytes(32));
  cachedJwtSecret = randomSecret;
  return cachedJwtSecret;
}

function toBase64Url(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64url');
  }
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64Url: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64Url, 'base64url').toString('utf-8');
  }
  const padded = b64Url.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(padded)));
}

function hmacSha256Base64Url(data: string, secret: string): string {
  if (nodeCrypto && typeof nodeCrypto.createHmac === 'function') {
    return nodeCrypto.createHmac('sha256', secret).update(data, 'utf-8').digest('base64url');
  }
  return toBase64Url(pureHmacSha256Hex(secret, data));
}

/**
 * Signe un JWT d'accès sécurisé avec HMAC-SHA256 et secret d'environnement
 */
export function signJwtAccessToken(
  payload: Omit<JwtAccessPayload, 'iat' | 'exp'>,
  ttlSeconds = 900 // 15 minutes
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const jti = payload.jti ?? `jti-${nowSec}-${bytesToHex(getSecureRandomBytes(8))}`;
  const fullPayload: JwtAccessPayload = {
    ...payload,
    iss: payload.iss ?? JWT_ISSUER,
    aud: payload.aud ?? JWT_AUDIENCE,
    jti,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  };
  const headerB64 = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = toBase64Url(JSON.stringify(fullPayload));
  const signature = hmacSha256Base64Url(`${headerB64}.${payloadB64}`, getJwtSecret());
  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Vérifie l'authenticité, l'algorithme (anti-alg:none), l'émetteur, l'audience, la révocation
 * et la validité temporelle d'un JWT avec comparaison en temps constant
 */
export function verifyJwtAccessToken(token: string): JwtAccessPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sig] = parts;

  try {
    const header = JSON.parse(fromBase64Url(headerB64)) as { alg?: string; typ?: string };
    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      return null;
    }
  } catch {
    return null;
  }

  const expectedSig = hmacSha256Base64Url(`${headerB64}.${payloadB64}`, getJwtSecret());
  if (!constantTimeEqual(sig, expectedSig)) return null;

  try {
    const decoded = JSON.parse(fromBase64Url(payloadB64)) as JwtAccessPayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof decoded.exp !== 'number' || decoded.exp < nowSec) return null;
    if (decoded.iss && decoded.iss !== JWT_ISSUER) return null;
    if (decoded.aud && decoded.aud !== JWT_AUDIENCE) return null;
    if (decoded.jti && isJtiRevokedInCluster(decoded.jti)) return null;

    const invalidatedBefore = getUserInvalidatedBeforeFromCluster(decoded.sub);
    if (invalidatedBefore !== undefined && decoded.iat < invalidatedBefore) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

// ============================================================================
// 5. MFA TOTP RFC 6238 AUTHENTIQUE SANS BACKDOOR (HMAC-SHA1 & SECRETS ALÉATOIRES)
// ============================================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(base32: string): Uint8Array {
  const cleaned = base32.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned.charAt(i));
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Génère un secret TOTP Base32 cryptographiquement aléatoire de 160 bits (20 octets = 32 chars)
 */
export function generateTotpSecretBase32(_seedHint?: string): string {
  const randomBytes = getSecureRandomBytes(20);
  return base32Encode(randomBytes);
}

/**
 * Calcule le code TOTP à 6 chiffres selon la norme RFC 6238 (HMAC-SHA1)
 */
export function computeCurrentTotpCode(
  secretBase32: string,
  timeStepOffset = 0,
  customTimestampMs?: number
): string {
  const keyBytes = base32Decode(secretBase32);
  const nowMs = customTimestampMs ?? Date.now();
  const timeStep = Math.floor(nowMs / 1000 / 30) + timeStepOffset;

  // Buffer 8 octets big-endian pour le compteur
  const counterBuffer = new Uint8Array(8);
  let temp = BigInt(timeStep);
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }

  let hmacBytes: Uint8Array;
  if (nodeCrypto && typeof nodeCrypto.createHmac === 'function') {
    const hmac = nodeCrypto.createHmac('sha1', Buffer.from(keyBytes));
    hmac.update(Buffer.from(counterBuffer));
    hmacBytes = new Uint8Array(hmac.digest());
  } else {
    hmacBytes = pureHmacSha1Bytes(keyBytes, counterBuffer);
  }

  // Dynamic Truncation (RFC 4226 section 5.4)
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
  const binaryCode =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff);

  const otp = binaryCode % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Vérifie un code TOTP RFC 6238 avec tolérance temporelle de ±1 fenêtre (30s)
 * STRICTEMENT AUCUN CODE DE DÉMONSTRATION OU BACKDOOR AUTORISÉ EN PRODUCTION
 */
export function verifyTotpCode(
  secretBase32: string,
  code: string,
  customTimestampMs?: number
): boolean {
  if (!secretBase32 || !code) return false;
  const cleaned = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleaned)) return false;

  // Tolérance stricte des fenêtres -1, 0, +1 (30 secondes)
  const valid0 = constantTimeEqual(cleaned, computeCurrentTotpCode(secretBase32, 0, customTimestampMs));
  const validMinus1 = constantTimeEqual(cleaned, computeCurrentTotpCode(secretBase32, -1, customTimestampMs));
  const validPlus1 = constantTimeEqual(cleaned, computeCurrentTotpCode(secretBase32, 1, customTimestampMs));

  return valid0 || validMinus1 || validPlus1;
}

/**
 * Construit l'URI otpauth standardisée pour les applications d'authentification (Google Authenticator, etc.)
 */
export function buildOtpAuthUri(email: string, secretBase32: string): string {
  const issuer = encodeURIComponent('TRADELINK_V6');
  const account = encodeURIComponent(email);
  return `otpauth://totp/${issuer}:${account}?secret=${secretBase32}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

// ============================================================================
// 6. MATRICE RBAC GRANULAIRE PAR RÔLE
// ============================================================================

export const ROLE_GRANULAR_PERMISSIONS: Record<UserRoleCode, string[]> = {
  VISITEUR: ['public:read', 'auth:verify_otp', 'onboarding:status:read'],
  CLIENT: [
    'catalog:read',
    'orders:read:own',
    'orders:read_own',
    'orders:create',
    'quotes:read:own',
    'quotes:create',
    'invoices:read:own',
    'payments:create:own',
    'shipments:read:own',
    'documents:read:own',
    'kyc:submit:own',
    'room:join:invited',
    'ai:chat:scoped',
  ],
  FOURNISSEUR: [
    'catalog:read',
    'products:crud:own',
    'products:write',
    'stocks:manage:own',
    'stocks:write',
    'orders:read:assigned',
    'orders:read_own',
    'orders:process:assigned',
    'quotes:respond:assigned',
    'invoices:read:issued',
    'payments:read:received',
    'kyc:submit:own',
    'room:create',
    'room:join:invited',
    'ai:chat:scoped',
  ],
  TRANSPORTEUR: [
    'missions:read:assigned',
    'missions:update:status',
    'shipments:pod:upload',
    'incidents:report',
    'documents:transport:manage',
    'kyc:submit:own',
    'room:create',
    'room:join:invited',
    'ai:chat:scoped',
  ],
  COMPTABLE: [
    'compta:read:source_readonly',
    'orders:read_own',
    'compta:journals:read',
    'compta:ledger:read',
    'compta:statements:generate',
    'compta:export',
    'calc:execute',
    'accounting:calculate',
    'room:create',
    'room:join:invited',
    'ai:chat:scoped',
  ],
  SUPPORT: [
    'tickets:read:assigned',
    'tickets:reply',
    'tickets:close',
    'room:create:support',
    'room:join:invited',
    'ai:chat:scoped',
  ],
  ADMIN: [
    '*',
    'users:manage',
    'sessions:revoke',
    'kyc:validate',
    'kyc:refuse',
    'kyc:decide',
    'products:write',
    'orders:read_own',
    'accounting:calculate',
    'backups:restore',
    'kms:rotate',
    'import:sandbox',
    'backup:create',
    'backup:restore:approve',
    'audit:read',
    'ai:config',
    'floating_buttons:manage',
  ],
};

export function hasGranularPermission(
  role: UserRoleCode,
  requiredPermission: string,
  extraPermissions: string[] = []
): boolean {
  const base = ROLE_GRANULAR_PERMISSIONS[role] ?? [];
  if (base.includes('*') || base.includes(requiredPermission)) return true;
  return extraPermissions.includes(requiredPermission);
}
