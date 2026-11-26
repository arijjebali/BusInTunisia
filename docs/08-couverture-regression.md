# 8. Indicateurs de couverture et suite de régression

## 8.1 Couverture du code (Jest, unitaires + intégration)

Commande : `npm run test:coverage` (rapport HTML dans `server/coverage/index.html`, régénéré à chaque exécution).

| Périmètre | Instructions | Branches | Fonctions | Lignes | Seuil (plan § 2.6) | Verdict |
|---|---:|---:|---:|---:|---|---|
| `src/services/` (5 fichiers) | **100 %** | **100 %** | **100 %** | **100 %** | ≥ 90 % / 85 % / 90 % / 90 % | ✅ |
| `src/repositories/bookingRepository.js` | 100 % | 75 % | 100 % | 100 % | ≥ 90 % / 70 % / 90 % / 90 % | ✅ |
| `src/repositories/busRepository.js` | 100 % | 83,3 % | 100 % | 100 % | idem | ✅ |
| `index.js` (routes Express) | 37,9 % | 26,1 % | 26,5 % | 39,4 % | plancher ≥ 35 % / 25 % / 25 % / 35 % | ✅ |
| **Global** | 50,7 % | 45,4 % | 54,4 % | 52,3 % | — | — |

### Interprétation

- **La logique métier est intégralement couverte**, y compris les 16 couples état × événement de la machine à états. C'est là que se trouvent les règles les plus risquées (R1, R3, R5).
- Les branches non couvertes des dépôts sont des valeurs par défaut (`seats || []`, `status ?? null`), sans enjeu fonctionnel.
- **Le chiffre de `index.js` sous-estime la couverture réelle des routes** : les 36 requêtes Newman et les 4 scénarios Playwright exercent l'API dans un processus séparé, que Jest n'instrumente pas. La couverture par endpoint ci-dessous complète donc cet indicateur.
- Un taux élevé ne prouve pas l'absence de défauts : `index.js` était couvert sur les routes de réservation, mais ANO-18 (billet incomplet) se trouvait dans l'IHM, et ANO-09 dans les **données** envoyées par l'IHM. Seuls le parcours E2E et la consultation de la base les ont révélés.

## 8.2 Couverture fonctionnelle des endpoints de l'API

| Module | Endpoints testés / existants | Non testés |
|---|---|---|
| Authentification | 2 / 3 | `GET /auth/me` (non utilisé par l'IHM) |
| Trajets (public) | 2 / 2 | — |
| Réservations, billets, avis | 5 / 5 | — |
| Admin — réservations | 2 / 3 | liste `GET /admin/bookings` |
| Admin — statistiques | 1 / 1 | — |
| Admin — trajets | 1 / 4 | liste, modification, suppression |
| Admin — bus | 1 / 4 | liste, modification et suppression testées au niveau du dépôt (IT-13 à 19), pas de la route |
| Admin — routes, villes, utilisateurs, opérateurs | 0 / 7 | hors périmètre (risque faible, lecture ou CRUD simple) |
| Voyages de groupe, opérateur | 0 / 6 | hors périmètre |
| **Total** | **14 / 35 (40 %)** | **100 % des endpoints des fonctions critiques** |

## 8.3 Couverture des exigences et des risques

- Exigences : **15 / 15** couvertes par au moins un test exécuté ; 13 satisfaites ([matrice](03-exigences-tracabilite.md#34-matrice-de-traçabilité-risques--exigences--tests)).
- Risques de criticité ≥ 6 (R1 à R6) : chacun est couvert par **au moins deux niveaux** de test (exigence du plan respectée).
- Transitions d'état : 16 / 16 au niveau unitaire, 6 / 16 de bout en bout.

## 8.4 Suite de régression

**Contenu** (`npm run test:regression`, ~ 30 s) :

| Bloc | Tests | Rôle |
|---|---|---|
| Unitaires | 68 | Règles métier : tarification, transitions, validation, rôles |
| Intégration | 29 | CRUD, contraintes, transactions, concurrence, droits, valeurs limites de planification |
| API Newman (hors dossier 9) | 34 requêtes / 66 assertions | Contrat HTTP, scénarios négatifs, tous les correctifs ANO-01 à ANO-16 |
| E2E Playwright (`npm run test:e2e` côté client) | 4 | Parcours critique, authentification, ANO-12, ANO-18 |

**Règles de gestion :**

1. Tout correctif s'accompagne d'un test qui échoue avant et réussit après ; ce test entre dans la suite.
2. Les tests d'une anomalie **ouverte** sont rangés dans le dossier Postman « 9. Défauts connus », exclu de la régression : la CI reste verte tant que rien ne régresse, et le défaut reste visible dans la collection complète. Quand l'anomalie est corrigée, le test passe dans un dossier normal.
3. La suite s'exécute automatiquement dans **GitHub Actions** (`.github/workflows/tests.yml`) à chaque push sur `main` et à chaque pull request : job `backend` (MariaDB 10.11 en service), puis job `e2e` s'il réussit. Les rapports (couverture, Newman, Playwright) sont archivés comme artefacts. Le test de performance se lance à la demande (`workflow_dispatch`).
4. Les seuils de couverture font échouer la CI s'ils ne sont plus atteints.

**Dernière exécution** (19/11/2026) : 97 / 97 tests Jest, 66 / 66 assertions API, 4 / 4 scénarios E2E. Aucune régression.

> La CI est prête mais n'a pas encore tourné sur GitHub : le dépôt n'est pas encore publié. Les résultats ci-dessus proviennent d'une exécution locale des mêmes commandes.
