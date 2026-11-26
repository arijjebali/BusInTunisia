# 9. Bilan, indicateurs et améliorations

## 9.1 Ce qui est réalisé

| Exigence (critères de validation minimale, § 12) | État | Preuve |
|---|---|---|
| Dépôt structuré, stratégie de branches documentée | ✅ | [01](01-depot-git.md), [CONTRIBUTING](../../CONTRIBUTING.md) |
| Pipeline as code déclenché automatiquement | ✅ | [02](02-pipeline.md) ; 11 exécutions, 11 succès |
| Dépendances et construction automatisées | ✅ | `npm ci`, job `build`, artefact versionné |
| Contrôles qualité et tests automatisés | ✅ | ESLint, 130 tests Jest, 34 requêtes API, 4 parcours E2E ([03](03-qualite-tests.md)) |
| Artefact / image produits et versionnés | ✅ | `busintunisia-<version>-<sha>`, `ghcr.io/arijjebali/busintunisia:sha-<commit>` ([04](04-conteneurisation.md)) |
| Application conteneurisée, exécution reproductible | ✅ | Dockerfile multi-étapes, Compose app + MariaDB |
| Configurations séparées, secrets protégés | ✅ | [05](05-configuration.md) |
| Au moins un contrôle de sécurité intégré | ✅ | Gitleaks, npm audit, Trivy, CodeQL, Dependabot ([06](06-securite.md)) |
| Déploiement en test automatisé | 🟡 | Job `deploy-test` écrit ; **déploiement réel démontré par le même script** sur le poste de test ; exécution *par le pipeline* en attente des réglages du § 9.3 |
| Smoke tests et sonde de santé | ✅ | 9 smoke tests, `/api/health` ([07](07-deploiement.md)) |
| Rollback documenté et démontré | ✅ | Automatique (INC-01) et manuel ([08](08-supervision-incident-rollback.md)) |
| Logs permettant de diagnostiquer un incident | ✅ | Journal JSON, `X-Request-Id`, `/api/metrics`, 2 incidents diagnostiqués |

## 9.2 Indicateurs de la chaîne (§ 13), mesurés le 2026-11-26

| Indicateur | Valeur | Source |
|---|---|---|
| Taux de réussite des pipelines | **11 / 11 (100 %)** | GitHub Actions (workflows « CI BusInTunisia » et « Tests BusInTunisia ») |
| Durée moyenne du pipeline complet | **2 min 07 s** (min 1 min 47 s, max 2 min 40 s) avec 6 jobs | idem |
| Gain du cache Playwright | job e2e : 1 min 13 s → 56 s (−23 %) | pipelines n° 1 et n° 2 |
| Build Docker | ~5 min à froid en local ; 60 à 84 s en CI avec le cache de couches | |
| Fréquence d'intégration | 9 branches poussées, plus de 30 commits, chaque branche vérifiée par le pipeline dès son push | `git log` |
| Couverture de code (serveur) | 58,4 % des lignes (52,3 % au début du projet) ; services et dépôts : 100 % des lignes | rapport Jest |
| Tests automatisés | 97 → **130** tests Jest ; 34 requêtes / 66 assertions API ; 4 parcours E2E | |
| Défauts détectés avant le déploiement | **4** : ANO-19 (DB_PORT ignoré), ANO-20 (régression critique après mise à jour), 8 erreurs ESLint, jeton factice dans un test | registre, [03](03-qualite-tests.md), [06](06-securite.md) |
| Vulnérabilités détectées / corrigées | Production : **10 détectées, 10 hautes et critiques corrigées** (2 modérées client restantes, sous le seuil) ; secrets : 113 jetons traités | [06](06-securite.md) |
| Taux d'échec des déploiements en test | 2 / 9 (22 %) — les 2 échecs sont les simulations volontaires d'INC-01, bloquées par les smoke tests | `rollback.sh --list` |
| Délai de restauration (MTTR) | **≈ 11 s** (rollback automatique, INC-01) ; ≈ 15 s (INC-02, redémarrage de la base) | fiches d'incident |

## 9.3 Non réalisé ou non démontré à ce jour

Signalé conformément au § 14 de l'énoncé : ces éléments ne sont pas présentés comme opérationnels.

| Élément | Raison | Ce qu'il reste à faire |
|---|---|---|
| Exécution du job `deploy-test` **par le pipeline** et approbation manuelle | Nécessite le runner auto-hébergé, l'environnement GitHub `test` et ses secrets, réglages réservés au propriétaire du compte | Procédure [07 § 7.1](07-deploiement.md#71-prérequis-à-configurer-une-fois), puis fusion dans `develop` |
| Fusion des PR des étapes 3 à 10 dans `develop`, puis release vers `main` | Actions réservées au propriétaire (pas d'accès API délégué) | Ouvrir et fusionner les PR dans l'ordre (§ 9.5) |
| Première analyse CodeQL | Le workflow se déclenche sur `develop`, `main` et les PR | Automatique à la première PR |
| Scan Trivy local | Échec du téléchargement de la base de vulnérabilités (réseau lent) ; le scan **en CI** a réussi | Relancer localement si besoin de la capture |
| Revue par un pair | Projet individuel : revue commentée par l'auteur (GitHub interdit l'auto-approbation) | En binôme : 1 approbation obligatoire |
| Rotation du `JWT_SECRET` local | Fichier personnel `server/.env`, non modifié sans accord | Générer une nouvelle valeur |

## 9.4 Difficultés rencontrées et solutions

| Difficulté | Solution |
|---|---|
| Fins de ligne CRLF sous Windows, scripts destinés à Linux | `.gitattributes` (`eol=lf`) dès le premier commit |
| Docker Hub et registre npm très lents par moments | Image de base surchargeable (`DB_IMAGE`), délais allongés, cache des couches en CI |
| Script d'initialisation MariaDB monté depuis Windows vu comme exécutable (fonctions de l'entrypoint indisponibles) | Appel direct du client `mariadb`, compatible avec les deux modes |
| `DB_PORT` ignoré par l'API (ANO-19) | Révélé par une base conteneurisée sur un port non standard ; corrigé |
| La correction de sécurité a cassé les droits administrateur (ANO-20) | Détectée par la régression avant commit ; correctif et tests |
| Jetons JWT dans les rapports de tests (113 alertes) | Masquage à la source, assainissement, historique documenté par empreintes |
| Noms de jobs imposés par la protection de branches | Noms conservés à l'identique lors de chaque restructuration du pipeline |
| Variable `$USER` absente sous Git Bash (Windows) | Repli sur `$USERNAME` ; détecté grâce à `set -u` |

## 9.5 Ordre de fusion recommandé

Chaque branche contient la précédente ; fusionner dans cet ordre (PR vers `develop`, revue commentée, pipeline vert) :

1. `feature/ci-build` (lot 2) → 2. `feature/qualite` (lot 3) → 3. `feature/docker` (lot 4) →
4. `feature/config-secrets` (lot 5) → 5. `feature/securite` (lot 5) → 6. `feature/deploiement` (lot 6) →
7. `feature/supervision` (lot 7) → release `develop` → `main`, puis tag `v1.1.0`.

## 9.6 Améliorations proposées

1. **Délai maximal sur la vérification de la base** dans `/api/health` (≈ 4 s mesurées en INC-02 ; cible < 1 s).
2. **Alerte active** : notification (courriel, Slack, Teams) quand `/api/health` ≠ ok ou `errorRate` > 1 %, au lieu
   d'une supervision consultée ; à terme Prometheus + Grafana à partir de `/api/metrics`.
3. **Protéger `/api/metrics`** (réseau interne ou authentification) dans un environnement exposé.
4. **Déploiement sans interruption** (blue/green : deux conteneurs applicatifs derrière un proxy).
5. **Sauvegarde du volume** avant déploiement, et migrations de schéma versionnées, pour rendre le rollback sûr même
   en cas de changement de base.
6. **Épingler les actions GitHub par SHA** de commit (Dependabot sait les tenir à jour).
7. **Migration Vite 8** pour supprimer l'alerte restante du client ; suivi de `newman`.
8. Corriger les anomalies encore ouvertes du dossier de test (ANO-09, ANO-10, ANO-17) via la chaîne.
