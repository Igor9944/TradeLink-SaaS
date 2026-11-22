// Vibe — TRADELINK V6.0 : Performance, Security & Reliability First.
// ============================================================================
// TRADELINK V6.1 — SUITE DE VALIDATION OFFICIELLE LOT 5 :
// GOUVERNANCE ACTEURS ROOM LIVE & INTÉGRATION OFFICIELLE GOOGLE MEET API
// ============================================================================

import {
  GoogleMeetService,
  googleMeetService,
} from '../../services/googleMeetService';
import { canCreateRoomLiveGeneral } from '../../services/backendServices';
import { canActorCreateRoomLive } from '../../services/aiIntelligenceEngine';
import { TradeLinkRepositoryStore, DatabaseStateSnapshot } from '../repositories/domain.repositories';
import { TradeLinkApiApplication } from '../controllers/domain.controllers';
import { registerSingleActiveSession } from '../middlewares/errorAndSecurity.middleware';
import { UserRoleCode } from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Échec Test LOT 5 Room Live & Google Meet] ${message}`);
  }
}

export function createLot5TestInitialDatabase(): DatabaseStateSnapshot {
  return {
    products: [],
    orders: [],
    kycDossiers: [],
    backups: [],
    rooms: [],
    calcHistory: [],
    auditLogs: [],
  };
}

export async function runLot5RoomLiveGoogleMeetTestSuite() {
  console.log('\n================================================================');
  console.log('🎥 TRADELINK V6.1 — SUITE OFFICIELLE LOT 5 : ROOM LIVE & GOOGLE MEET');
  console.log('Gouvernance des 7 Acteurs, API Google Meet v2 & Calendar v3, Fallback SFU');
  console.log('================================================================\n');

  const repo = new TradeLinkRepositoryStore(createLot5TestInitialDatabase());
  const app = new TradeLinkApiApplication(repo);

  // Acteurs de test
  const clientUser = {
    id: 'usr-client-01',
    email: 'client.acheteur@tradelink-saas.com',
    role: 'CLIENT' as UserRoleCode,
    sessionId: 'sess-client-01',
    companyName: 'Atlas Import-Export SARL',
  };
  registerSingleActiveSession(clientUser.id, clientUser.sessionId);

  const supplierUser = {
    id: 'usr-supp-01',
    email: 'fournisseur.industriel@tradelink-saas.com',
    role: 'FOURNISSEUR' as UserRoleCode,
    sessionId: 'sess-supp-01',
    companyName: 'EuroTech Distribution',
  };
  registerSingleActiveSession(supplierUser.id, supplierUser.sessionId);

  const carrierUser = {
    id: 'usr-carrier-01',
    email: 'transporteur.multimodal@tradelink-saas.com',
    role: 'TRANSPORTEUR' as UserRoleCode,
    sessionId: 'sess-carrier-01',
    companyName: 'Atlas Express Logistique',
  };
  registerSingleActiveSession(carrierUser.id, carrierUser.sessionId);

  const accountantUser = {
    id: 'usr-acc-01',
    email: 'comptable.audit@tradelink-saas.com',
    role: 'COMPTABLE' as UserRoleCode,
    sessionId: 'sess-acc-01',
    companyName: 'Cabinet Audit & Finance',
  };
  registerSingleActiveSession(accountantUser.id, accountantUser.sessionId);

  const supportUser = {
    id: 'usr-support-01',
    email: 'support.care@tradelink-saas.com',
    role: 'SUPPORT' as UserRoleCode,
    sessionId: 'sess-supp-care-01',
    companyName: 'TradeLink Customer Care',
  };
  registerSingleActiveSession(supportUser.id, supportUser.sessionId);

  const adminUser = {
    id: 'usr-admin-01',
    email: 'admin.super@tradelink-saas.com',
    role: 'ADMIN' as UserRoleCode,
    sessionId: 'sess-admin-01',
    companyName: 'TradeLink Global HQ',
  };
  registerSingleActiveSession(adminUser.id, adminUser.sessionId);

  // --------------------------------------------------------------------------
  // [TEST-LOT5-01] Gouvernance stricte des 7 Acteurs : Rejet 403 CLIENT
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT5-01] Gouvernance stricte : interdiction de création pour CLIENT (403)...');
  {
    assert(canCreateRoomLiveGeneral('CLIENT') === false, 'canCreateRoomLiveGeneral interdit CLIENT');
    assert(canActorCreateRoomLive('CLIENT') === false, 'canActorCreateRoomLive interdit CLIENT');

    // Tentative sur POST /api/v1/rooms
    const res1 = app.handleRequest({
      method: 'POST',
      path: '/api/v1/rooms',
      headers: {},
      query: {},
      params: {},
      body: { title: 'Tentative Client Interdite' },
      ipAddress: '127.0.0.1',
      correlationId: 'corr-lot5-client-1',
      user: clientUser,
    });
    assert(res1.statusCode === 403, 'Code HTTP 403 renvoyé pour création CLIENT sur /api/v1/rooms');
    assert(res1.body.error?.code === 'CLIENT_ROOM_CREATION_FORBIDDEN', 'Code CLIENT_ROOM_CREATION_FORBIDDEN attendu');

    // Tentative sur POST /api/v1/rooms/google-meet/create
    const res2 = app.handleRequest({
      method: 'POST',
      path: '/api/v1/rooms/google-meet/create',
      headers: {},
      query: {},
      params: {},
      body: { title: 'Tentative Google Meet Client Interdite' },
      ipAddress: '127.0.0.1',
      correlationId: 'corr-lot5-client-2',
      user: clientUser,
    });
    assert(res2.statusCode === 403, 'Code HTTP 403 renvoyé pour création CLIENT sur /api/v1/rooms/google-meet/create');

    // Vérification traçabilité d'audit
    const deniedLogs = repo.listAuditLogs().filter((l) => l.action === 'ROOM_CREATE_DENIED_CLIENT_ROLE');
    assert(deniedLogs.length >= 2, 'Audit logs ROOM_CREATE_DENIED_CLIENT_ROLE enregistrés');

    console.log('  ✅ [TEST-LOT5-01] Blocage 403 et traçabilité d audit pour CLIENT validés.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT5-02] Validation utilitaires Google Meet (Regex, URI, Parsing)
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT5-02] Validation des utilitaires Google Meet (Regex, URI, Code RFC)...');
  {
    assert(GoogleMeetService.isValidGoogleMeetCode('abc-defg-hij') === true, 'Format standard valide');
    assert(GoogleMeetService.isValidGoogleMeetCode('ABC-DEFG-HIJ') === true, 'Format majuscule toléré (normalisé)');
    assert(GoogleMeetService.isValidGoogleMeetCode('abc-def-hij') === false, 'Format trop court rejeté');
    assert(GoogleMeetService.isValidGoogleMeetCode('123-4567-890') === false, 'Chiffres non conformes rejetés');

    const formattedUri = GoogleMeetService.formatGoogleMeetUri('abc-defg-hij');
    assert(formattedUri === 'https://meet.google.com/abc-defg-hij', 'Génération URL meet.google.com conforme');

    const parsed1 = GoogleMeetService.parseGoogleMeetCode('https://meet.google.com/xyz-uvwx-rst');
    assert(parsed1 === 'xyz-uvwx-rst', 'Extraction code depuis URL complète');

    const parsed2 = GoogleMeetService.parseGoogleMeetCode('xyz-uvwx-rst');
    assert(parsed2 === 'xyz-uvwx-rst', 'Extraction depuis code brut');

    const genCode = GoogleMeetService.generateStandardMeetingCode('seed-test-tradelink');
    assert(GoogleMeetService.isValidGoogleMeetCode(genCode) === true, 'Génération déterministe valide');

    console.log('  ✅ [TEST-LOT5-02] Utilitaires Google Meet RFC et parsing conformes.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT5-03] Création de salle Google Meet via POST /api/v1/rooms
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT5-03] Création de salle avec provider GOOGLE_MEET par Fournisseur...');
  let meetRoomId = '';
  let meetRoomCode = '';
  let googleMeetUri = '';
  {
    const createRes = app.handleRequest({
      method: 'POST',
      path: '/api/v1/rooms',
      headers: {},
      query: {},
      params: {},
      body: {
        title: 'Négociation Fournisseur - Acheteur & Audit Chaîne du Froid',
        description: 'Session officielle Google Meet pour revue des certificats GDP et libération séquestre',
        meetingProvider: 'GOOGLE_MEET',
        isImmediate: true,
        durationMinutes: 45,
        isPrivate: true,
        allowedUserIds: [clientUser.id, carrierUser.id],
        invitedEmails: [clientUser.email, carrierUser.email],
      },
      ipAddress: '127.0.0.1',
      correlationId: 'corr-lot5-supp-create-meet',
      user: supplierUser,
    });

    assert(createRes.statusCode === 201, 'Salle créée avec statut 201');
    const room = createRes.body.data as any;
    assert(room.meetingProvider === 'GOOGLE_MEET', 'meetingProvider doit être GOOGLE_MEET');
    assert(Boolean(room.googleMeetSpaceName), 'googleMeetSpaceName présent');
    assert(room.googleMeetSpaceName.startsWith('spaces/'), 'googleMeetSpaceName commence par spaces/');
    assert(Boolean(room.googleMeetUri), 'googleMeetUri présent');
    assert(room.googleMeetUri.startsWith('https://meet.google.com/'), 'googleMeetUri commence par https://meet.google.com/');
    assert(Boolean(room.googleMeetCode), 'googleMeetCode présent');
    assert(GoogleMeetService.isValidGoogleMeetCode(room.googleMeetCode), 'googleMeetCode respecte le format RFC');
    assert(room.googleMeetSyncStatus === 'SYNCED', 'googleMeetSyncStatus initialisé à SYNCED');

    meetRoomId = room.id;
    meetRoomCode = room.roomCode;
    googleMeetUri = room.googleMeetUri;
    assert(Boolean(meetRoomCode) && Boolean(googleMeetUri), 'Code de salle et URI Meet non vides');

    // Vérification de la traçabilité d'audit
    const meetLogs = repo.listAuditLogs().filter((l) => l.action === 'GOOGLE_MEET_SPACE_CREATED');
    assert(meetLogs.length >= 1, 'Audit log GOOGLE_MEET_SPACE_CREATED persisté');

    console.log(`  ✅ [TEST-LOT5-03] Salle Google Meet créée : ${room.googleMeetUri} (${room.googleMeetSpaceName})`);
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT5-04] Création via endpoint dédié POST /api/v1/rooms/google-meet/create
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT5-04] Création via endpoint direct /api/v1/rooms/google-meet/create (Transporteur)...');
  {
    const res = app.handleRequest({
      method: 'POST',
      path: '/api/v1/rooms/google-meet/create',
      headers: {},
      query: {},
      params: {},
      body: {
        title: 'Coordination Logistique Multimodale Tanger Med',
        description: 'Point technique transit portuaire',
        isImmediate: false,
        scheduledAt: '2026-11-23 11:00',
        durationMinutes: 30,
        allowedUserIds: [clientUser.id, supplierUser.id],
      },
      ipAddress: '127.0.0.1',
      correlationId: 'corr-lot5-carrier-meet',
      user: carrierUser,
    });

    assert(res.statusCode === 201, 'Endpoint dédié renvoie 201');
    const room = res.body.data as any;
    assert(room.meetingProvider === 'GOOGLE_MEET', 'Provider automatique GOOGLE_MEET');
    assert(room.isScheduled === true, 'Salle programmée avec succès');
    assert(Boolean(room.googleMeetUri), 'Lien Meet valide généré');

    console.log('  ✅ [TEST-LOT5-04] Endpoint dédié /api/v1/rooms/google-meet/create validé.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT5-05] Consultation des invitations pour CLIENT (Rejoindre autorisé)
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT5-05] Consultation des invitations et accès réunion pour CLIENT...');
  {
    // Le client consulte ses invitations
    const invRes = app.handleRequest({
      method: 'GET',
      path: '/api/v1/rooms/invitations',
      headers: {},
      query: {},
      params: {},
      body: {},
      ipAddress: '127.0.0.1',
      correlationId: 'corr-lot5-client-invitations',
      user: clientUser,
    });

    assert(invRes.statusCode === 200, 'Statut 200 sur consultation invitations');
    const invitations = invRes.body.data as any[];
    assert(Array.isArray(invitations), 'Liste d invitations renvoyée');
    assert(invitations.some((r) => r.id === meetRoomId), 'La réunion Google Meet figure dans les invitations du client');

    // Le client rejoint la réunion
    const joinRes = app.handleRequest({
      method: 'POST',
      path: `/api/v1/rooms/${meetRoomId}/join`,
      headers: {},
      query: {},
      params: { id: meetRoomId },
      body: {},
      ipAddress: '127.0.0.1',
      correlationId: 'corr-lot5-client-join',
      user: clientUser,
    });

    assert(joinRes.statusCode === 200, 'Client autorisé à rejoindre la réunion');
    assert(Boolean((joinRes.body.data as any).room), 'Détails de la salle retournés');

    console.log('  ✅ [TEST-LOT5-05] Consultation invitations et droit de rejoindre confirmés pour CLIENT.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT5-06] Synchronisation de l'espace Google Meet
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT5-06] Synchronisation de l espace Google Meet...');
  {
    const syncRes = app.handleRequest({
      method: 'POST',
      path: `/api/v1/rooms/${meetRoomId}/google-meet/sync`,
      headers: {},
      query: {},
      params: { id: meetRoomId },
      body: {},
      ipAddress: '127.0.0.1',
      correlationId: 'corr-lot5-sync',
      user: supplierUser,
    });

    assert(syncRes.statusCode === 200, 'Statut 200 sur synchronisation Google Meet');
    const syncData = syncRes.body.data as any;
    assert(syncData.sync.synced === true, 'Espace synchronisé avec succès');
    assert(syncData.sync.spaceName.startsWith('spaces/'), 'SpaceName exact synchronisé');

    console.log('  ✅ [TEST-LOT5-06] Synchronisation Google Meet réussie.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT5-07] Clôture et archivage de la conférence Google Meet
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT5-07] Clôture et archivage de la conférence Google Meet...');
  {
    // Tentative par un non-hôte (Client) -> doit renvoyer 403
    const unauthorizedEnd = app.handleRequest({
      method: 'POST',
      path: `/api/v1/rooms/${meetRoomId}/google-meet/end`,
      headers: {},
      query: {},
      params: { id: meetRoomId },
      body: {},
      ipAddress: '127.0.0.1',
      correlationId: 'corr-lot5-unauthorized-end',
      user: clientUser,
    });
    assert(unauthorizedEnd.statusCode === 403, 'Rejet 403 sur clôture par un non-hôte');

    // Clôture légitime par l'hôte (Fournisseur)
    const hostEnd = app.handleRequest({
      method: 'POST',
      path: `/api/v1/rooms/${meetRoomId}/google-meet/end`,
      headers: {},
      query: {},
      params: { id: meetRoomId },
      body: {},
      ipAddress: '127.0.0.1',
      correlationId: 'corr-lot5-host-end',
      user: supplierUser,
    });

    assert(hostEnd.statusCode === 200, 'Clôture par l hôte acceptée avec 200');
    const endData = hostEnd.body.data as any;
    assert(endData.closed === true, 'Statut closed = true');
    assert(endData.room.status === 'ENDED', 'Statut de la salle passé à ENDED');
    assert(Array.isArray(endData.room.sessionArchiveHistory) && endData.room.sessionArchiveHistory.length >= 1, 'Historique de session archivé');

    const endLogs = repo.listAuditLogs().filter((l) => l.action === 'ROOM_MEETING_ENDED');
    assert(endLogs.length >= 1, 'Audit log ROOM_MEETING_ENDED enregistré');

    console.log('  ✅ [TEST-LOT5-07] Clôture, archivage historique et audit log ROOM_MEETING_ENDED validés.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT5-08] Mode dégradé & Fallback automatique SFU WebRTC
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT5-08] Mode dégradé et Fallback sécurisé vers SFU WebRTC...');
  {
    const fallbackRoom = app.handleRequest({
      method: 'POST',
      path: '/api/v1/rooms',
      headers: {},
      query: {},
      params: {},
      body: {
        title: 'Session avec Fallback forcé SFU',
        meetingProvider: 'GOOGLE_MEET',
        forceFallbackToSfu: true, // Simulation d indisponibilité Google Meet
        isImmediate: true,
      },
      ipAddress: '127.0.0.1',
      correlationId: 'corr-lot5-fallback',
      user: supportUser,
    });

    assert(fallbackRoom.statusCode === 201, 'Salle créée malgré le fallback forcé');
    const fbData = fallbackRoom.body.data as any;
    assert(fbData.meetingProvider === 'SFU_WEBRTC', 'Bascule automatique sur SFU_WEBRTC');
    assert(fbData.googleMeetSyncStatus === 'FAILED_FALLBACK_SFU', 'googleMeetSyncStatus = FAILED_FALLBACK_SFU');
    assert(Boolean(fbData.securityToken), 'Jeton d accès SFU généré pour la salle de secours');

    console.log('  ✅ [TEST-LOT5-08] Fallback automatique vers SFU WebRTC validé sans interruption.');
  }

  // --------------------------------------------------------------------------
  // [TEST-LOT5-09] Google Calendar API v3 avec visioconférence Meet intégrée
  // --------------------------------------------------------------------------
  console.log('🔹 [TEST-LOT5-09] Intégration Google Calendar API v3 & Meet conference data...');
  {
    const calResult = await googleMeetService.createCalendarEventWithMeet({
      title: 'Audit Comptable Trimestriel TradeLink',
      description: 'Point de rapprochement bancaire avec exportateur et transitaire',
      startTime: '2026-11-25T14:00:00Z',
      durationMinutes: 60,
      attendees: [supplierUser.email, accountantUser.email],
    });

    assert(Boolean(calResult.eventId), 'Identifiant événement Calendar v3 généré');
    assert(Boolean(calResult.hangoutLink), 'hangoutLink Google Meet présent dans l événement');
    assert(calResult.hangoutLink.startsWith('https://meet.google.com/'), 'hangoutLink commence par meet.google.com');
    assert(GoogleMeetService.isValidGoogleMeetCode(calResult.meetingCode), 'Code de visioconférence valide');

    console.log(`  ✅ [TEST-LOT5-09] Événement Calendar v3 lié à Meet : ${calResult.hangoutLink}`);
  }

  console.log('\n================================================================');
  console.log('🎉 TOUS LES TESTS DU LOT 5 ONT RÉUSSI (9/9) !');
  console.log('Gouvernance des Acteurs, API Google Meet v2 & Fallback SFU entièrement validés.');
  console.log('================================================================\n');
}

if (process.argv[1]?.includes('lot5.roomlive.googlemeet')) {
  runLot5RoomLiveGoogleMeetTestSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Échec de la suite de tests LOT 5 :', err);
      process.exit(1);
    });
}
