# DOCUMENTATION ROOM LIVE ET INTÉGRATION GOOGLE MEET API v2 — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`  
**Conformité** : Phase 8 (Sections 10.1 à 10.6)  
**Fichiers Sources** : `src/services/googleMeetService.ts`, `src/services/roomLiveSfuEngine.ts`, `src/components/room/RoomLiveCreateModal.tsx`

---

## 1. Règle Métier Impérative : Gouvernance des Rôles et Restriction du Client

La gouvernance des accès à **Room Live** et **Google Meet** est appliquée simultanément dans l'interface React, dans les contrôleurs API Express et dans les services métiers :

| Rôle TRADELINK | Créer / Planifier une Room Live | Inviter / Modérer / Gérer le Lobby | Clôturer / Enregistrer la Réunion | Rejoindre une Room Live Invitée |
|---|:---:|:---:|:---:|:---:|
| **Superadministrateur (`ADMIN`)** | **OUI** | **OUI** | **OUI** | **OUI** |
| **Fournisseur (`FOURNISSEUR`)** | **OUI** | **OUI** (Hôte) | **OUI** (Hôte) | **OUI** |
| **Transporteur (`TRANSPORTEUR`)** | **OUI** | **OUI** (Hôte) | **OUI** (Hôte) | **OUI** |
| **Comptable (`COMPTABLE`)** | **OUI** | **OUI** (Hôte) | **OUI** (Hôte) | **OUI** |
| **Support (`SUPPORT`)** | **OUI** | **OUI** (Hôte) | **OUI** (Hôte) | **OUI** |
| **Client Final (`CLIENT`)** | **NON (`403`)** | **NON (`403`)** | **NON (`403`)** | **OUI (Uniquement si autorisé)** |
| **Visiteur (`VISITEUR`)** | **NON (`403`)** | **NON (`403`)** | **NON (`403`)** | **NON (`403`)** |

Toute tentative par un compte `CLIENT` d'appeler `POST /api/v1/rooms`, `POST /api/v1/rooms/google-meet/create`, `GET /api/v1/rooms/google-meet/oauth-url`, `PATCH /api/v1/rooms/:id/google-meet`, `POST /api/v1/rooms/:id/lobby/admit`, `POST /api/v1/rooms/:id/lobby/reject`, `POST /api/v1/rooms/:id/moderate`, `POST /api/v1/rooms/:id/recording/start` ou `POST /api/v1/rooms/:id/end` est immédiatement rejetée avec le code HTTP **`403 Forbidden`** (`CLIENT_ROOM_CREATION_FORBIDDEN` / `CLIENT_ROOM_ADMINISTRATION_FORBIDDEN`) et tracée dans le journal d'audit.

---

## 2. Intégration de l'API Officielle Google Meet v2 (`GoogleMeetService`)

Le service `src/services/googleMeetService.ts` implémente les ressources officielles de l'API REST **Google Meet v2** (`https://meet.googleapis.com/v2/*`) :

1. **`spaces.create` (`POST https://meet.googleapis.com/v2/spaces`)** :
   - Crée un espace de réunion Google Meet avec configuration `accessType` (`OPEN`, `TRUSTED`, `RESTRICTED`) et `entryPointAccess: 'ALL'`.
   - Récupère et persiste l'identifiant stable de la ressource `space.name` (`spaces/<id>`), l'URI `meetingUri` (`https://meet.google.com/xxx-xxxx-xxx`) et le `meetingCode`.
2. **`spaces.get` (`GET https://meet.googleapis.com/v2/{spaceName}`)** :
   - Synchronise l'état de l'espace et vérifie la conférence active (`POST /api/v1/rooms/:id/google-meet/sync`).
3. **`spaces.patch` (`PATCH https://meet.googleapis.com/v2/{spaceName}?updateMask=config.accessType,config.entryPointAccess`)** :
   - Permet à l'hôte créateur ou à l'administrateur de modifier la politique d'accès de l'espace (`PATCH /api/v1/rooms/:id/google-meet`).
4. **`spaces.endActiveConference` (`POST https://meet.googleapis.com/v2/{spaceName}:endActiveConference`)** :
   - Clôture immédiatement la conférence active dans l'espace pour tous les participants (`POST /api/v1/rooms/:id/end`).
5. **Ressources `conferenceRecords`, `participants`, `participantSessions`, `recordings` et `transcripts`** :
   - Consultables via `GET /api/v1/rooms/:id/google-meet/conference-records`.

---

## 3. Authentification OAuth 2.0 Google et Sécurité des Jetons (Section 10.3)

- **Scopes minimaux demandés (`GoogleMeetService.getRequiredScopes()`)** :
  - `https://www.googleapis.com/auth/meetings.space.created`
  - `https://www.googleapis.com/auth/meetings.space.readonly`
- **Génération de l'URL de consentement** : `GET /api/v1/rooms/google-meet/oauth-url` génère l'URL officielle `https://accounts.google.com/o/oauth2/v2/auth` avec paramètre `state` anti-CSRF et `access_type=offline`.
- **Chiffrement au repos et renouvellement** :
  - Les jetons OAuth 2.0 persistés sont chiffrés avec **AES-256-GCM** (`GoogleMeetService.encryptOAuthTokenAtRest` / `decryptOAuthTokenAtRest`).
  - Le renouvellement du jeton d'accès s'effectue via `POST https://oauth2.googleapis.com/token` (`grant_type=refresh_token`), et la révocation via `POST https://oauth2.googleapis.com/revoke`.
  - Aucun secret OAuth (`GOOGLE_MEET_CLIENT_SECRET`, `GOOGLE_MEET_REFRESH_TOKEN`) n'est jamais exposé dans le frontend.

---

## 4. Association Modèle Métier et Gestion des Indisponibilités (Sections 10.4 & 10.6)

Chaque salle `RoomLiveRecord` conserve :
- `id`, `roomCode`, `createdById`, `creatorRole`, `allowedUserIds`, `invitedEmails`, `status`, `scheduledAt`
- `googleMeetSpaceName` (identifiant technique stable `spaces/...`, distinct du simple code d'affichage `googleMeetCode`)
- `googleMeetUri`, `googleCalendarEventId`, `googleMeetSyncStatus`, `sessionArchiveHistory`

En cas d'indisponibilité de l'API Google Meet (protégée par `meetCircuitBreaker`), l'incident est journalisé, les métadonnées de la Room Live sont préservées sans création multiple involontaire, et l'organisateur peut soit réessayer la synchronisation, soit basculer explicitement sur le moteur **WebRTC SFU souverain** de TradeLink (`forceFallbackToSfu`).
