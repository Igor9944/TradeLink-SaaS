# Plan de déploiement

## Prérequis

- Nom de domaine et DNS
- Certificat HTTPS
- VPS/cloud ou plateforme backend persistante
- PostgreSQL managé
- Redis managé
- Stockage S3 compatible
- Vault/KMS
- ClamAV
- Worker asynchrone
- Secrets injectés

## Environnement

1. Développement
2. Staging
3. Production

## Déploiement

1. Valider Prisma.
2. Appliquer les migrations.
3. Vérifier PostgreSQL.
4. Vérifier Redis.
5. Vérifier Vault/KMS.
6. Vérifier ClamAV.
7. Déployer backend.
8. Déployer frontend.
9. Configurer le proxy TLS.
10. Exécuter les tests santé.
11. Activer les sauvegardes.
12. Activer les alertes.

## Retour arrière

Sauvegarde avant migration, immutabilité des migrations appliquées, plan de restauration DB/S3 et annulation applicative documentée.

## Internet

Le déploiement Internet n'est pas revendiqué tant qu'un environnement réel n'a pas été autorisé, provisionné et vérifié.
