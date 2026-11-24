# DOCUMENTATION DE L'ASSISTANT IA EXCLUSIF GOOGLE GEMINI — TRADELINK SaaS B2B

**Date** : 24 novembre 2026  
**Branche** : `main`  
**Conformité** : Phase 7 (Sections 9.1 & 9.2)  
**Fichiers Sources** : `src/services/geminiAiService.ts`, `src/services/copilotEngine.ts`, `src/components/copilot/AiCopilotWidget.tsx`

---

## 1. Architecture Exclusive Google Gemini

Conformément à la décision d'architecture de **TRADELINK SaaS**, **Google Gemini** est l'unique fournisseur d'intelligence artificielle de la plateforme :
- **Zéro dépendance à OpenAI, Anthropic, Ollama ou tout autre LLM tiers** (vérifié par la suite d'audit statique `test:lot6-ai-gemini`).
- **Modèles supportés** :
  - `gemini-1.5-pro` : analyse métier approfondie, assistance commerciale, comptable et logistique.
  - `gemini-1.5-flash` : traduction dynamique rapide, classification de tickets support, résumés de conversations et sous-titres.
  - `gemini-2.0-flash` : interactions temps réel à faible latence.
- **Centralisation Backend Exclusive** : tous les appels vers `https://generativelanguage.googleapis.com/v1beta/models/*` transitent exclusivement par le service backend `GeminiAiService`, protégé par le disjoncteur `geminiCircuitBreaker`. Aucune clé API (`GEMINI_API_KEY`) n'est jamais exposée au navigateur client.

---

## 2. Fonctionnalités du Copilot Transversal (`AiCopilotWidget` & `/api/v1/copilot/*`)

1. **Assistant Flottant Contextuel** : accessible depuis tous les espaces métiers autorisés, adapté dynamiquement à la route courante (`currentPath`), au rôle actif (`activeRole`) et à la langue de l'utilisateur (`locale`).
2. **Aide Métier & RAG Scopé par Rôle** :
   - Aide à la navigation, recherche d'informations dans le catalogue, suivi des commandes, explication des erreurs de validation, préparation de réponses aux demandes de devis (RFQ), résumé de documents commerciaux et synthèse de tickets support.
3. **Actions Assistées avec Confirmation Humaine (`CopilotAssistedAction`)** :
   - Pré-remplissage de formulaires (`PREFILL_FORM`, `PREFILL_PRODUCT`, `PREPARE_QUOTE_RESPONSE`), navigation guidée (`NAVIGATE`) et calculs financiers (`CALCULATE_FINANCE`).

---

## 3. Sécurité, Isolation Multi-Tenant et Garde-Fous (Section 9.2)

1. **Isolation RBAC & Multi-Tenant du Contexte RAG** :
   - L'assistant IA ne reçoit jamais de données appartenant à une autre organisation ou à un rôle supérieur. Le constructeur de contexte (`copilotEngine.ts`) filtre les entités injectées dans le prompt selon `actor.id`, `actor.role` et `actor.companyName`.
2. **Protection Anti-Injection de Prompt & Désensibilisation** :
   - Filtrage préventif des tentatives de jailbreak ou de contournement d'instructions système (`ignore previous instructions`, `reveal system prompt`, `dump database`).
   - Masquage automatique des secrets, mots de passe, jetons JWT et numéros de cartes bancaires avant tout envoi vers l'API Gemini.
3. **Garde-Fou Humain Obligatoire sur les Décisions Sensibles (`BLOCKED_BY_GUARDRAIL`)** :
   - Toute action marquée critique (`isCritical: true` : exécution d'un paiement, validation/rejet d'un dossier KYC, suppression de compte, validation d'écriture comptable ou restauration de sauvegarde) est **matériellement bloquée** dans l'assistant IA (`POST /api/v1/copilot/action/execute` refuse l'exécution automatique et exige une intervention humaine directe dans l'interface métier dédiée).
4. **Gestion des Quotas et Journalisation Sécurisée** :
   - Suivi de la consommation de tokens par utilisateur et par conversation (`totalTokensConsumed`), limitation de débit et journalisation d'audit sans données personnelles sensibles.
