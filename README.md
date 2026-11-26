# BusInTunisia — Test et validation d'une application web

Mini-projet « Atelier Test et validation des logiciels », Licence 3 — Développement des systèmes d'information.

**BusInTunisia** est une application de réservation de billets de bus (React + Express + MariaDB). Elle remplace l'application RéclaGest de l'énoncé, comme celui-ci l'autorise ; la correspondance entre les deux référentiels est donnée au [§ 3.1](docs/03-exigences-tracabilite.md#31-adaptation-du-référentiel-réclagest).

**Décision de livraison : validation conditionnelle.** 18 anomalies détectées, dont 15 corrigées et vérifiées (les 3 critiques comprises) ; 1 anomalie majeure reste ouverte, avec contournement et conditions de livraison. Voir le [chapitre 9](docs/09-bilan-decision.md).

> **Suite : mini-projet « Atelier chaîne DevOps ».** Le dossier DevOps est dans [`docs/devops/`](docs/devops/README.md) ; les règles de contribution (branches, commits, revue) sont dans [CONTRIBUTING.md](CONTRIBUTING.md).

## Dossier final (structure du § 8 de l'énoncé)

| # | Partie | Document |
|---|---|---|
| 1 | Présentation du système testé et de son environnement | [01 — Fiche projet et risques](docs/01-fiche-projet-risques.md#11-système-testé), [02 — § 2.2 Environnements](docs/02-plan-de-test.md#22-environnements) |
| 2 | Exigences, critères d'acceptation et risques identifiés | [03 — Exigences](docs/03-exigences-tracabilite.md), [01 — § 1.4 Risques](docs/01-fiche-projet-risques.md#14-cartographie-des-risques-qualité) |
| 3 | Stratégie et plan de test | [02 — Plan de test](docs/02-plan-de-test.md) |
| 4 | Matrice de traçabilité | [03 — § 3.4](docs/03-exigences-tracabilite.md#34-matrice-de-traçabilité-risques--exigences--tests) |
| 5 | Catalogue des cas de test et jeux de données | [04 — Catalogue](docs/04-catalogue-cas-de-test.md), [05 — États, rôles, exploratoires](docs/05-etats-roles-exploratoires.md) |
| 6 | Scripts automatisés et instructions d'exécution | [07 — § 7.1](docs/07-resultats-execution.md#71-instructions-dexécution) et le tableau ci-dessous |
| 7 | Résultats d'exécution et preuves pertinentes | [07 — Résultats](docs/07-resultats-execution.md), [`docs/preuves/`](docs/preuves/), `server/tests/api/reports/`, `server/tests/perf/reports/` |
| 8 | Registre des anomalies et état de leur traitement | [06 — Registre](docs/06-registre-anomalies.md) |
| 9 | Indicateurs de couverture et suite de régression | [08 — Couverture et régression](docs/08-couverture-regression.md) |
| 10 | Bilan de la campagne, limites des tests et risques résiduels | [09 — § 9.1 à 9.4](docs/09-bilan-decision.md) |
| 11 | Décision de validation et recommandations | [09 — § 9.5 et 9.6](docs/09-bilan-decision.md#95-décision--validation-conditionnelle) |

## Exigences minimales de l'énoncé (§ 5)

| Élément obligatoire | Réalisation |
|---|---|
| Plan de test et analyse des risques | [01](docs/01-fiche-projet-risques.md), [02](docs/02-plan-de-test.md) |
| Matrice de traçabilité | [03 § 3.4](docs/03-exigences-tracabilite.md#34-matrice-de-traçabilité-risques--exigences--tests) |
| ≥ 15 cas de test documentés | **24** cas ([04](docs/04-catalogue-cas-de-test.md)) |
| ≥ 5 tests unitaires automatisés | **68** (`server/tests/unit/`) |
| ≥ 3 tests d'intégration | **29** (`server/tests/integration/`) |
| Collection de tests API | **36** requêtes, 69 assertions (`server/tests/api/BusInTunisia.postman_collection.json`) |
| ≥ 1 parcours d'interface automatisé | **4** scénarios Playwright (`client/e2e/`) |
| ≥ 1 test non fonctionnel | Test de charge, 3 scénarios (`server/tests/perf/`) |
| Registre d'anomalies | **18** fiches ([06](docs/06-registre-anomalies.md)) |
| Rapport de couverture et suite de régression | [08](docs/08-couverture-regression.md), `npm run test:regression`, CI GitHub Actions |
| Bilan et décision finale | [09](docs/09-bilan-decision.md) |

## Lancer les tests

Prérequis : Node.js 22, MariaDB (XAMPP), `server/.env` copié depuis [`server/.env.example`](server/.env.example).

```bash
# API et tests serveur
cd server
npm install
npm run test:regression    # unitaires + intégration + couverture + API (régression)
npm run test:api           # collection complète, y compris les défauts connus
npm run test:perf          # test de charge

# Parcours d'interface
cd ../client
npm install
npx playwright install chromium
npm run test:e2e
```

La CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) exécute la même suite à chaque push et à chaque pull request, avec le linting, les contrôles de sécurité, la construction de l'image Docker et le déploiement en test : voir le [dossier DevOps](docs/devops/README.md).

## Lancer l'application

Avec Docker (application + base, environnement reproductible) :

```bash
cp .env.example .env            # puis remplacer les valeurs « changer-moi »
docker compose up -d --build    # http://localhost:8000 — santé : /api/health
```

Sans Docker (MariaDB locale, `server/.env` copié depuis `server/.env.example`) :

```bash
cd server && npm start          # API sur http://localhost:5000
cd client && npm run dev        # IHM sur http://localhost:5173
```