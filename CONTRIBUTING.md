# Guide de contribution — BusInTunisia

Ce guide fixe les règles de travail sur le dépôt : organisation, branches, commits, demandes de fusion et revue.
Toute contribution, y compris celle de l'auteur principal, les respecte.

## 1. Organisation du dépôt

| Dossier / fichier | Contenu |
|---|---|
| `client/` | Interface React (Vite, Tailwind) et parcours E2E Playwright (`client/e2e/`) |
| `server/` | API REST Express + MariaDB ; logique métier dans `server/src/`, tests dans `server/tests/` |
| `server/tests/` | Tests unitaires, d'intégration, API (Newman), de charge, base de test (`fixtures/`) |
| `docs/` | Dossier du projet « Test et validation » (chapitres 01 à 09, preuves) |
| `docs/devops/` | Dossier du projet « Chaîne DevOps » (architecture, pipeline, configurations, incidents, rollback) |
| `scripts/` | Scripts d'automatisation (déploiement, smoke tests, rollback) |
| `.github/` | Pipeline CI/CD (`workflows/`), modèles d'issue et de pull request |
| `.gitattributes` | Normalisation des fins de ligne (LF) pour un comportement identique sur tous les postes |

## 2. Stratégie de branches

Modèle « Git Flow simplifié » :

```
main ──●───────────────●──────────── versions stables, taguées (v1.0.0, v1.1.0…)
        \             / (PR de release)
develop  ●──●────●───●────────────── intégration continue des fonctionnalités
             \  /  \ /
feature/…     ●     ●                 une branche par fonctionnalité ou étape
```

| Branche | Rôle | Créée depuis | Fusionnée dans | Règles |
|---|---|---|---|---|
| `main` | Version stable, déployable | — | — | Protégée : pas de push direct, fusion uniquement par PR depuis `develop` ou `hotfix/*`, pipeline vert obligatoire |
| `develop` | Intégration | `main` | `main` (release) | Fusion par PR uniquement, pipeline vert obligatoire |
| `feature/<sujet>` | Nouvelle fonctionnalité ou outil | `develop` | `develop` | Ex. `feature/dockerfile`, `feature/health-check` |
| `fix/<sujet>` | Correction non urgente | `develop` | `develop` | Ex. `fix/ano-09-sieges` |
| `hotfix/<sujet>` | Correction urgente en production | `main` | `main` puis `develop` | Réservée aux incidents |

Noms de branches : minuscules, mots séparés par des tirets, sans accents.

## 3. Convention de commits

Le dépôt suit [Conventional Commits](https://www.conventionalcommits.org/fr/) :

```
<type>(<portée facultative>): <description à l'impératif, en minuscules>
```

| Type | Usage | Exemple |
|---|---|---|
| `feat` | Nouvelle fonctionnalité | `feat(api): ajouter la route /api/health` |
| `fix` | Correction de défaut | `fix(booking): refuser les sièges hors du bus (ANO-09)` |
| `test` | Ajout ou modification de tests | `test(api): ajouter le smoke test de connexion` |
| `ci` | Pipeline CI/CD | `ci: mettre en cache les dépendances npm` |
| `build` | Construction, Docker, dépendances | `build(docker): Dockerfile multi-étapes du serveur` |
| `docs` | Documentation | `docs(devops): procédure de rollback` |
| `refactor` | Restructuration sans changement de comportement | `refactor(server): extraire les routes admin` |
| `chore` | Maintenance diverse | `chore: mettre à jour .gitignore` |

Règles :
- un commit = un changement cohérent ; pas de commit « divers » mêlant plusieurs sujets ;
- la référence d'une anomalie (`ANO-xx`) figure dans le message lorsqu'elle existe ;
- un changement incompatible est signalé par `!` (`feat(api)!: …`) et décrit dans le corps du message.

## 4. Demandes de fusion (Pull Requests) et revue

1. Créer sa branche depuis `develop` : `git switch develop && git pull && git switch -c feature/mon-sujet`.
2. Commiter selon la convention, puis pousser : `git push -u origin feature/mon-sujet`.
3. Ouvrir une PR vers `develop` et remplir le modèle (description, tests, checklist).
4. Le pipeline CI s'exécute automatiquement : **une PR dont le pipeline échoue n'est pas fusionnée.**
5. Revue : au moins une relecture commentée avant fusion (approbation par le binôme le cas échéant).
6. Fusion, puis suppression de la branche de fonctionnalité.

## 5. Avant de pousser

```bash
cd server && npm run test:regression   # unitaires + intégration + couverture + API
cd client && npm run test:e2e          # parcours d'interface
```

Prérequis et lancement de l'application : voir le [README](README.md).

## 6. Secrets et configuration

- **Aucun secret** (mot de passe, clé API, jeton) n'est commité. Les valeurs réelles vivent dans `server/.env`
  (ignoré par Git) ou dans les secrets de la plateforme CI/CD.
- Toute nouvelle variable est ajoutée, avec une valeur factice et un commentaire, dans `server/.env.example`.
- Un secret poussé par erreur est considéré comme compromis : il est **révoqué et changé**, pas seulement supprimé
  du dépôt (il reste dans l'historique).
