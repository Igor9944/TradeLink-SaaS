# Rapport de sécurité

## Résumé

Les mécanismes principaux sont implémentés et les tests LOT 1.1 passent. La sécurité réelle reste dépendante du provisionnement correct des services externes.

## Authentification

- Argon2id avec PHC authentique.
- JWT avec clés configurées.
- MFA TOTP administrateur.
- Revocation et session unique.
- Brute force verrouillé.

## Autorisations

- RBAC sur 7 rôles.
- Contrôles d'appartenance côté serveur.
- Tests anti-IDOR.

## Fichiers

- Quarantaine systématique.
- Magic bytes.
- Limites de taille.
- ClamAV clamd zINSTREAM.
- Refus si le démon est indisponible.

## Production

Production fail-closed pour PostgreSQL absent ou URL invalide. Les Vault dev et secrets faibles doivent être bloqués.

## Vérifications restantes

- Scan de dépendances en environnement CI réel.
- Test DAST Internet.
- Rotation des secrets.
- Vérification des permissions S3.
- Contrôle CORS avec domaines réels.
- Test Redis perdu sous charge.
- Test PostgreSQL perdu et reprise.
- Audit des tokens et cookies avec navigateur réel.
