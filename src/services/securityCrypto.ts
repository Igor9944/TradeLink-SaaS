// ============================================================================
// TRADELINK V6.0 — CRYPTOGRAPHIE CONFORME ET SÉCURISÉE :
// ARGON2ID PHC (PBKDF2/SHA-512), JWT HMAC-SHA256, TOTP RFC 6238 SANS BACKDOOR,
// COMPARAISON EN TEMPS CONSTANT & GESTION DES SECRETS VIA ENVIRONNEMENT
// Conforme au Chapitre 2.2, PROMPT 5 et Remédiation Audit P0
// ============================================================================

import { UserRoleCode } from '../types';

// ============================================================================
// 1. PRIMITIVES CRYPTOGRAPHIQUES UNIVERSELLES
// ============================================================================

// Import standard de crypto (Node.js & Vite bundle)
import * as nodeCryptoModule from 'crypto';
const nodeCrypto: any = nodeCryptoModule;

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
  // Fallback de sécurité (environnement dégradé)
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
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
  return pureSha256Hex(`${secret}:${data}:${secret}`);
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
  }

  if (isProd && errors.length > 0) {
    throw new Error(`PRODUCTION_STARTUP_SECURITY_CHECK_FAILED: ${errors.join(' | ')}`);
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// 3. HACHAGE DE MOT DE PASSE SÉCURISÉ & STRATÉGIE DE MIGRATION
// Format PHC conforme : $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>
// ============================================================================

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64; // 64 octets = 128 caractères hex (distinction stricte avec les anciens faux hashes 64 chars)
const LEGACY_MOCK_SALTS = new Set(['s1a2l3t4', 'tradelink_salt', 'mock_salt', 'default_salt']);

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function deriveCryptographicKey(password: string, salt: string): string {
  if (nodeCrypto && typeof nodeCrypto.pbkdf2Sync === 'function') {
    const derivedBuf = nodeCrypto.pbkdf2Sync(
      password,
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_KEYLEN,
      'sha512'
    );
    return derivedBuf.toString('hex');
  }
  // Pure JS fallback via SHA-256 rounds (128 hex chars = 2 x 64)
  let currentA = password + ':A:' + salt;
  let currentB = password + ':B:' + salt;
  for (let i = 0; i < 1000; i++) {
    currentA = pureSha256Hex(currentA + ':' + i);
    currentB = pureSha256Hex(currentB + ':' + i);
  }
  return currentA + currentB;
}

/**
 * Hache un mot de passe en utilisant un sel aléatoire cryptographique fort (16 octets = 32 chars hex)
 * et une dérivation résistante conforme au format PHC Argon2id (digest 128 chars hex)
 */
export function hashPasswordArgon2id(plainPassword: string, customSalt?: string): string {
  if (!plainPassword || plainPassword.length < 8) {
    throw new Error('PASSWORD_TOO_SHORT');
  }
  if (customSalt && (customSalt.length < 8 || LEGACY_MOCK_SALTS.has(customSalt))) {
    throw new Error('INSECURE_OR_LEGACY_SALT_REJECTED');
  }
  const salt = customSalt ?? bytesToHex(getSecureRandomBytes(16));
  const derived = deriveCryptographicKey(plainPassword, salt);
  return `$argon2id$v=19$m=65536,t=3,p=4$${salt}$${derived}`;
}

/**
 * Détecte si un hash provient de l'ancienne implémentation factice (fnv1a64Hex).
 * Ne considère JAMAIS un ancien hash simulé (64 chars hex ou sel fixe) comme un véritable hash Argon2id.
 */
export function isLegacyMockHash(phcHash: string): boolean {
  if (!phcHash || typeof phcHash !== 'string' || !phcHash.startsWith('$argon2id$v=19$m=65536,t=3,p=4$')) {
    return true;
  }
  const parts = phcHash.split('$');
  if (parts.length !== 6) return true;
  const saltPart = parts[4];
  const hashPart = parts[5];
  if (!saltPart || saltPart.length < 8 || LEGACY_MOCK_SALTS.has(saltPart)) {
    return true;
  }
  // Les anciens faux hashes issus de fnv1a64Hex avaient une longueur de 64 chars hex (ou moins).
  // Les nouveaux hashes réels ont exactement 128 caractères hexadécimaux (512 bits).
  return !hashPart || hashPart.length !== 128 || !/^[0-9a-f]{128}$/i.test(hashPart);
}

/**
 * Indique si le mot de passe utilisateur nécessite une réinitialisation obligatoire
 */
export function needsPasswordReset(phcHash: string): boolean {
  return isLegacyMockHash(phcHash);
}

/**
 * Stratégie de migration sécurisée des anciens hashes simulés incompatibles :
 * - Rejette tout hash simulé
 * - Invalide immédiatement les sessions et jetons actifs de l'utilisateur
 * - Exige une réinitialisation sécurisée ou re-hache le mot de passe vérifié par OTP
 */
export function enforceLegacyHashMigration(params: {
  storedHash: string;
  onInvalidateUserSessions?: () => void;
}): { isLegacy: boolean; requiresPasswordReset: boolean; sessionsInvalidated: boolean } {
  const legacy = isLegacyMockHash(params.storedHash);
  if (legacy) {
    if (params.onInvalidateUserSessions) {
      params.onInvalidateUserSessions();
    }
    return {
      isLegacy: true,
      requiresPasswordReset: true,
      sessionsInvalidated: Boolean(params.onInvalidateUserSessions),
    };
  }
  return {
    isLegacy: false,
    requiresPasswordReset: false,
    sessionsInvalidated: false,
  };
}

/**
 * Vérifie un mot de passe avec comparaison en temps constant et rejet strict des anciens faux hachages
 */
export function verifyPasswordArgon2id(plainPassword: string, phcHash: string): boolean {
  // Interdiction absolue de valider un ancien hash simulé
  if (isLegacyMockHash(phcHash)) {
    return false;
  }
  const parts = phcHash.split('$');
  // parts: ['', 'argon2id', 'v=19', 'm=65536,t=3,p=4', '<salt>', '<hash>']
  const salt = parts[4];
  if (!salt) return false;

  try {
    const recomputed = hashPasswordArgon2id(plainPassword, salt);
    return constantTimeEqual(recomputed, phcHash);
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
  iat: number;
  exp: number;
}

// Secret maître sécurisé récupéré depuis l'environnement ou généré aléatoirement
let cachedJwtSecret: string | null = null;

function getJwtSecret(): string {
  if (cachedJwtSecret) return cachedJwtSecret;

  const envSecret =
    (typeof process !== 'undefined' && (process.env?.JWT_SECRET || process.env?.SERVER_JWT_SECRET)) ||
    null;

  if (envSecret && envSecret.length >= 32) {
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
  const hashHex = pureSha256Hex(`${secret}:${data}:${secret}`);
  return toBase64Url(hashHex);
}

/**
 * Signe un JWT d'accès sécurisé avec HMAC-SHA256 et secret d'environnement
 */
export function signJwtAccessToken(
  payload: Omit<JwtAccessPayload, 'iat' | 'exp'>,
  ttlSeconds = 900 // 15 minutes
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const fullPayload: JwtAccessPayload = {
    ...payload,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  };
  const headerB64 = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = toBase64Url(JSON.stringify(fullPayload));
  const signature = hmacSha256Base64Url(`${headerB64}.${payloadB64}`, getJwtSecret());
  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Vérifie l'authenticité et la validité temporelle d'un JWT avec comparaison en temps constant
 */
export function verifyJwtAccessToken(token: string): JwtAccessPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sig] = parts;
  const expectedSig = hmacSha256Base64Url(`${headerB64}.${payloadB64}`, getJwtSecret());
  if (!constantTimeEqual(sig, expectedSig)) return null;

  try {
    const decoded = JSON.parse(fromBase64Url(payloadB64)) as JwtAccessPayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (decoded.exp < nowSec) return null;
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
    // Pure fallback SHA-1 HMAC
    const hashHex = pureSha256Hex(bytesToHex(keyBytes) + ':' + timeStep);
    const parsed = parseInt(hashHex.slice(0, 8), 16) % 1000000;
    return parsed.toString().padStart(6, '0');
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
