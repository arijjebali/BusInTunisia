# 10. Soutenance : présentation, démonstration et fiche de remise

## 10.1 Présentation synthétique (10 diapositives, ~10 min)

| # | Diapositive | Contenu clé | Support |
|---|---|---|---|
| 1 | BusInTunisia | Application de réservation de bus (React, Express, MariaDB) ; objectif : livraison automatisée, sûre et observable | — |
| 2 | Avant / après | Avant : tests manuels, lancement à la main, secret JWT en clair. Après : chaque push → chaîne complète en ~2 min | [09 § 9.2](09-bilan.md) |
| 3 | Organisation Git | `main` ← `develop` ← `feature/*`, Conventional Commits, branches protégées, PR avec revue | push refusé, PR n° 1 |
| 4 | Le pipeline | quality ∥ security → build ∥ backend → e2e ∥ docker → deploy-test ; entrées, sorties, conditions d'échec | graphe des jobs |
| 5 | Qualité et tests | ESLint (8 erreurs corrigées), 130 tests, 34 requêtes API, 4 parcours E2E, seuils de couverture | rapports |
| 6 | Conteneurs et registre | Image unique multi-étapes non root, Compose app + base, ghcr.io, tags `sha-<commit>` | ghcr.io |
| 7 | Configurations et secrets | Matrice dev / CI / test, coffre GitHub, validation au démarrage, rien en clair | [05](05-configuration.md) |
| 8 | DevSecOps | 10 vulnérabilités de production corrigées, 113 jetons traités, la mise à jour de sécurité qui casse les droits admin (ANO-20) | [06](06-securite.md) |
| 9 | Déploiement, incident, rollback | Image publiée → test, 9 smoke tests ; version défectueuse bloquée, rollback automatique en 11 s | [07](07-deploiement.md), [08](08-supervision-incident-rollback.md) |
| 10 | Bilan | Indicateurs, limites honnêtes (§ 9.3), améliorations | [09](09-bilan.md) |

## 10.2 Scénario de démonstration (§ 10 de l'énoncé)

Préparation : Docker Desktop démarré, runner `./run.cmd` lancé, environnement de test en service
(`bash scripts/supervision.sh` → OK), onglets GitHub ouverts (dépôt, Actions, Packages).

| # | Étape demandée | Action | Ce que l'on montre |
|---|---|---|---|
| 16 | Application, dépôt, branches | http://localhost:8080, page du dépôt, *Branches* | Application en test ; `main`/`develop` protégées |
| 17 | Petite modification poussée | `git switch -c feature/demo develop`, modifier un libellé, `git commit -m "feat(client): …"`, `git push -u origin feature/demo` | Commit conventionnel |
| 18 | Déclenchement du pipeline | Onglet *Actions* | Graphe des 6 jobs, journaux en direct |
| 19 | Un test et son rapport | Job *backend* → résumé (tests + couverture) ; artefact `rapports-backend` | Quality gate |
| 20 | Image versionnée publiée | Job *docker* → tags ; page *Packages* | `sha-<commit>` dans ghcr.io |
| 21 | Déploiement et disponibilité | PR → `develop`, fusion → job `deploy-test` → **approuver** → smoke tests ; `curl /api/health` | `commit` = celui de la modification |
| 22 | Sécurité | Job *security*, [06](06-securite.md) | Une alerte expliquée (113 JWT) et une correction (ANO-20) |
| 23 | Incident et rollback | `bash scripts/simuler-incident.sh version-defectueuse` ; puis `bash scripts/rollback.sh` | Smoke test en échec → journal → rollback automatique ; rollback manuel |
| 24 | Choix, limites, améliorations | [09 § 9.3 et 9.6](09-bilan.md) | |

Questions probables et réponses courtes :

- *Pourquoi l'image n'est-elle pas reconstruite au déploiement ?* On déploie exactement ce qui a été testé et scanné.
- *Pourquoi ne pas réécrire l'historique pour les jetons ?* Jetons expirés et fictifs ; réécrire des branches
  protégées coûte plus que le risque ; empreintes listées pour garder le contrôle bloquant.
- *Que se passe-t-il si un smoke test échoue en CI ?* Rollback automatique, job en échec, historique marqué « échec ».
- *Le rollback restaure-t-il les données ?* Non : l'application seulement (limite documentée, amélioration n° 5).

## 10.3 Fiche synthétique de remise (§ 15)

| Information | Valeur |
|---|---|
| Nom et prénom | Arij Jebali |
| Intitulé de l'application | BusInTunisia — réservation de billets de bus en ligne |
| Lien du dépôt Git | https://github.com/arijjebali/BusInTunisia |
| Technologies de l'application | React 18 (Vite, Tailwind), Node.js 22 / Express 5, MariaDB 10.11 |
| Plateforme CI/CD | GitHub Actions (`ci.yml`, `codeql.yml`, `rollback.yml`) |
| Registre d'images / artefacts | GitHub Container Registry `ghcr.io/arijjebali/busintunisia` ; artefacts de pipeline `busintunisia-<version>-<sha>` |
| Environnement de test et accès | Poste local via runner auto-hébergé, Docker Compose `busintunisia-test`, http://localhost:8080 ([07](07-deploiement.md)) |
| Contrôles de sécurité intégrés | Gitleaks (historique complet), npm audit (gate production ≥ high), Trivy (gate critique), CodeQL, Dependabot, règles ESLint de sécurité |
| Procédure de rollback | Automatique si smoke tests en échec ; manuelle par `scripts/rollback.sh` ou le workflow « Rollback » ([08 § 8.4](08-supervision-incident-rollback.md#84-procédure-de-rollback)) |
| Date de remise | *à compléter* |
