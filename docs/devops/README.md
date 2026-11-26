# Dossier DevOps — BusInTunisia

Mini-projet « Atelier chaîne DevOps », Licence 3 — Développement des systèmes d'information.

Objectif : qu'une modification du code déclenche une chaîne automatisée qui vérifie la qualité et la sécurité,
construit une version identifiable, la publie, la déploie dans un environnement de test, vérifie son fonctionnement
et permet de restaurer une version stable en cas d'incident.

## Chaîne réalisée

```
Commit → Push / PR → CI (GitHub Actions)
  ├─ quality   : ESLint serveur + client (quality gate)
  ├─ security  : Gitleaks (historique complet) + npm audit (gate production)
  ├─ build     : client React + serveur → artefact busintunisia-<version>-<sha>
  ├─ backend   : 130 tests Jest (unitaires, intégration, couverture) + 34 requêtes API Newman
  ├─ e2e       : 4 parcours Playwright
  ├─ docker    : image → scan Trivy (gate) → ghcr.io/arijjebali/busintunisia:sha-<commit>
  └─ deploy-test (develop, approbation) : image publiée → environnement de test → 9 smoke tests + /api/health
       └─ échec → rollback automatique ; supervision : journaux JSON, /api/metrics, scripts/supervision.sh
```

## Dossier (livrables du § 9 de l'énoncé)

| # | Livrable | Document |
|---|---|---|
| 1 | Dépôt Git complet | https://github.com/arijjebali/BusInTunisia |
| 2 | Présentation de l'application et de son architecture | [README racine](../../README.md), [04 § 4.1](04-conteneurisation.md#41-architecture-conteneurisée) |
| 3 | Stratégie de branches et règles de contribution | [01](01-depot-git.md), [CONTRIBUTING.md](../../CONTRIBUTING.md) |
| 4 | Fichiers de pipeline CI/CD | [`.github/workflows/`](../../.github/workflows/), [02](02-pipeline.md) |
| 5 | Scripts d'automatisation et fichiers de dépendances | [`scripts/`](../../scripts/README.md), `package.json` / `package-lock.json` |
| 6 | Conteneurisation et orchestration locale | [`Dockerfile`](../../Dockerfile), [`docker-compose.yml`](../../docker-compose.yml), [04](04-conteneurisation.md) |
| 7 | Suites de tests et rapports | [03](03-qualite-tests.md), `server/tests/`, `client/e2e/`, artefacts du pipeline |
| 8 | Résultats des analyses de qualité et de sécurité | [03](03-qualite-tests.md), [06](06-securite.md) |
| 9 | Matrice des environnements, configurations et secrets | [05](05-configuration.md) |
| 10 | Preuve de publication de l'image | [04 § 4.4](04-conteneurisation.md#44-registre-dimages--github-container-registry), [preuves/lot4-image-ghcr.png](preuves/lot4-image-ghcr.png) |
| 11 | Procédure de déploiement et résultats des smoke tests | [07](07-deploiement.md) |
| 12 | Procédure de rollback | [08 § 8.4](08-supervision-incident-rollback.md#84-procédure-de-rollback) |
| 13 | Guide de supervision, logs utiles, fiches d'incident | [08](08-supervision-incident-rollback.md) |
| 14 | Bilan des difficultés et améliorations | [09](09-bilan.md) |
| 15 | Présentation synthétique pour la soutenance | [10](10-soutenance.md) |

## Avancement par lot

| Lot | Contenu | État | Document |
|---|---|---|---|
| 1 | Organisation du dépôt et collaboration Git | ✅ | [01](01-depot-git.md) |
| 2 | Intégration continue et construction | ✅ | [02](02-pipeline.md) |
| 3 | Qualité logicielle et tests automatisés | ✅ | [03](03-qualite-tests.md) |
| 4 | Conteneurisation et registre | ✅ | [04](04-conteneurisation.md) |
| 5 | Configurations, secrets et DevSecOps | ✅ | [05](05-configuration.md), [06](06-securite.md) |
| 6 | Déploiement automatisé et vérification | 🟡 Démontré par script ; exécution par le pipeline après configuration du runner et de l'environnement `test` | [07](07-deploiement.md) |
| 7 | Supervision, incident et rollback | ✅ | [08](08-supervision-incident-rollback.md) |

Bilan, indicateurs et éléments non encore démontrés : [09](09-bilan.md). Captures : [preuves/](preuves/).
