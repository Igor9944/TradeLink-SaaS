# Dettes techniques

## Critiques

- Aucun moteur OCR réel vérifié dans les dépendances principales.
- Les formats d'import/export ne couvrent pas encore toutes les extensions demandées.
- PostgreSQL externe doit être exécuté contre une instance réelle avant validation finale.
- Redis externe doit être testé en cluster et après perte.
- Les intégrations Google et Gemini restent dépendantes de secrets/OAuth externes.

## Importantes

- Les lecteurs DBF/CDX doivent être natifs et encodés.
- BAK SQL Server ne doit pas être traité comme du SQL.
- Les exports SQL/SQLite/DBF/CDX doivent être implémentés.
- Le traitement volumineux nécessite une file persistante.
- L'OCR doit recevoir une validation réelle de précision.
- Les tests Internet ne sont pas disponibles sans staging autorisé.

## Considération historique

Le dépôt contient des documents affirmant plusieurs niveaux de finalisation. Ces documents doivent être lus comme des assertions à vérifier par les tests, migrations, résultats CI et déploiements réels.
