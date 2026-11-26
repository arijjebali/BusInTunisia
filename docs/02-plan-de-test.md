# 2. Stratégie et plan de test (semaine 2)

## 2.1 Stratégie

La stratégie est **fondée sur les risques** du [chapitre 1](01-fiche-projet-risques.md#14-cartographie-des-risques-qualité) : plus un risque est critique, plus il est testé tôt, à plusieurs niveaux, et automatisé. La logique métier a été extraite de `index.js` vers `src/services/` pour pouvoir être testée unitairement sans base de données ; les routes HTTP sont ensuite vérifiées contre une vraie base MariaDB de test.

| Niveau | Objet | Outil | Ce que ce niveau garantit |
|---|---|---|---|
| Unitaire | Machine à états, tarification, validation des trajets, rôles, service de réservation (dépôt simulé, horloge figée) | Jest | Règles métier exactes, rapides (< 5 s), sans dépendance |
| Intégration | Dépôts `booking` et `bus` sur MariaDB ; routes Express → MySQL (supertest) | Jest + mysql2 + supertest | CRUD, contraintes d'intégrité, transactions, concurrence |
| Système (API) | 36 requêtes REST : codes HTTP, JSON, droits, scénarios négatifs | Postman + Newman | Contrat de l'API vu de l'extérieur |
| Système (IHM) | Parcours critique de réservation dans un vrai navigateur | Playwright (Chromium) | Le besoin du passager est satisfait de bout en bout |
| Non fonctionnel | Charge : 20 clients simultanés, 20 s par scénario | autocannon | Temps de réponse et absence d'erreurs |
| Acceptation | Décision de livraison selon les critères de sortie (§ 2.6) | — | Le produit peut être livré, et à quelles conditions |

**Choix d'outils.** L'énoncé recommande k6 pour la performance ; k6 n'étant pas installé et Docker indisponible sur le poste, nous avons retenu **autocannon**, outil Node.js installé par `npm` comme les autres dépendances : la chaîne reste homogène et la CI n'a besoin d'aucun binaire supplémentaire. Postman est utilisé pour concevoir la collection, Newman pour l'exécuter de façon reproductible.

## 2.2 Environnements

| Environnement | Base | Port API | Usage |
|---|---|---|---|
| Développement | `bus_in_tunisia` (données réelles) | 5000 | Développement ; **jamais** utilisé par les tests |
| Test local | `bus_in_tunisia_test` recréée avant chaque campagne (`tests/fixtures/schema.sql` + `seed.sql`, identifiants fixes) | 5055 (API), 5056 (E2E), 5057 (perf) | Toutes les campagnes |
| Intégration continue | Service MariaDB 10.11 dans GitHub Actions | idem | Régression à chaque push et pull request |

**Garde-fous** : `resetTestDb.js` refuse de réinitialiser une base dont le nom ne se termine pas par `_test` ; les tests d'intégration vérifient `SELECT DATABASE()` avant d'écrire.

**Reproductibilité** : jeu de données minimal à identifiants fixes (4 utilisateurs, 3 bus, 80 sièges, 3 trajets dont un passé, 5 réservations couvrant les statuts `confirmed`, `pending`, `cancelled` et « terminée ») ; chaque test d'intégration de dépôt s'exécute dans une transaction annulée en fin de test.

## 2.3 Organisation du dépôt

```
BusInTunisia/
├── .github/workflows/tests.yml     CI : unitaires + intégration + couverture + API, puis E2E
├── .github/ISSUE_TEMPLATE/          Modèle de fiche d'anomalie (GitHub Issues)
├── docs/                            Dossier de test (ce document et les suivants)
├── client/
│   ├── e2e/                         Scénarios Playwright
│   └── playwright.config.js         Démarre l'API (base de test) et Vite automatiquement
└── server/
    ├── src/services, src/repositories
    └── tests/
        ├── unit/                    Jest (5 fichiers)
        ├── integration/             Jest + MariaDB (3 fichiers)
        ├── api/                     Collection Postman, lanceur Newman, rapports
        ├── perf/                    Test de charge et rapports
        ├── fixtures/                schema.sql, seed.sql
        └── db/                      Réinitialisation de la base de test
```

## 2.4 Responsabilités

Le projet est conduit en **travail individuel** ; les rôles ci-dessous sont tenus par la même personne, à des moments distincts, pour garder la séparation des activités.

| Rôle | Responsabilités |
|---|---|
| Responsable des tests | Plan, risques, critères, décision de livraison |
| Concepteur de tests | Exigences, catalogue de cas de test, données |
| Automaticien | Scripts Jest, Newman, Playwright, autocannon, CI |
| Développeur (correctifs) | Correction des anomalies, sans modifier les attendus des tests |

## 2.5 Critères d'entrée

- La base de test se réinitialise sans erreur (`npm run db:reset`).
- L'API démarre avec un `JWT_SECRET` défini.
- Les tests unitaires passent à 100 % (ils conditionnent l'exécution des niveaux suivants en CI).

## 2.6 Critères de sortie et seuils (fixés avant la campagne finale)

| # | Critère | Seuil |
|---|---|---|
| S1 | Exigences critiques (EX-03, EX-06, EX-07, EX-08, EX-15) couvertes par au moins un test **exécuté** | 100 % |
| S2 | Anomalies bloquantes ou critiques ouvertes | 0 |
| S3 | Anomalies majeures ouvertes | ≤ 1, avec contournement et plan de correction datés |
| S4 | Taux de réussite de la suite de régression (hors défauts connus documentés) | 100 % |
| S5 | Couverture du code — `src/services/**` | ≥ 90 % des lignes et des fonctions, ≥ 85 % des branches |
| S6 | Couverture du code — `src/repositories/**` | ≥ 90 % des lignes, ≥ 70 % des branches |
| S7 | Couverture du code — `index.js` (routes, mesurée par Jest seulement) | plancher anti-régression : ≥ 35 % des lignes. Les routes sont surtout couvertes par Newman, qui s'exécute dans un autre processus et n'est pas instrumenté |
| S8 | Performance (20 clients simultanés) | 0 erreur, p97,5 < 500 ms, p99 < 1 000 ms |

Les seuils S5 à S7 sont appliqués automatiquement par Jest (`coverageThreshold` dans `server/package.json`) : la commande échoue si l'un d'eux n'est pas atteint.

**Classification des anomalies.** Sévérité (impact) : *Bloquante* (empêche une fonction critique, sans contournement), *Critique* (sécurité, perte d'argent ou de données), *Majeure* (règle métier violée, contournement possible), *Mineure* (gêne, message ou code HTTP inexact). Priorité (urgence de correction) : P1 avant livraison, P2 dans la version, P3 planifiable.

## 2.7 Calendrier de la campagne

| Semaine | Activité | Livrable dans le dépôt |
|---|---|---|
| 1 | Analyse, risques, périmètre | [01-fiche-projet-risques.md](01-fiche-projet-risques.md) |
| 2 | Stratégie, plan, dépôt Git | ce document, `.gitignore`, `.env.example` |
| 3 | Exigences, critères d'acceptation, traçabilité | [03-exigences-tracabilite.md](03-exigences-tracabilite.md) |
| 4 | Conception des cas de test, jeux de données | [04-catalogue-cas-de-test.md](04-catalogue-cas-de-test.md), `seed.sql` |
| 5 | Transitions d'état, droits, tests exploratoires | [05-etats-roles-exploratoires.md](05-etats-roles-exploratoires.md), premières fiches du [registre](06-registre-anomalies.md) |
| 6 | Tests unitaires | `server/tests/unit/` |
| 7 | Tests d'intégration et base de données | `server/tests/integration/` |
| 8 | Tests de l'API REST (campagne 1) | collection Postman, `newman-report-avant-correctifs.*` |
| 9 | Parcours IHM, performance, suite de régression | `client/e2e/`, `server/tests/perf/`, `.github/workflows/tests.yml` |
| 10 | Campagne 2, correctifs, réexécution, décision | [07](07-resultats-execution.md), [08](08-couverture-regression.md), [09](09-bilan-decision.md) |
