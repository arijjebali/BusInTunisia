# 4. Conteneurisation et registre (lot 4)

## 4.1 Architecture conteneurisée

```
                    réseau « frontend »                 réseau « backend » (interne)
 navigateur ──► :8000 (dev) / :8080 (test) ──► [ app ] ─────────────────────► [ db ]
                                                Node 22 + Express             MariaDB 10.11
                                                API /api/* + client React     volume db-data
                                                HEALTHCHECK /api/health       healthcheck.sh
```

Une **seule image applicative** contient l'API et l'interface React construite : c'est l'unité que l'on versionne,
publie, déploie et restaure (rollback). La base de données utilise l'image officielle `mariadb:10.11`.

## 4.2 Dockerfile multi-étapes

Fichier : [`Dockerfile`](../../Dockerfile).

| Étape | Image de base | Rôle | Conservée dans l'image finale ? |
|---|---|---|---|
| `client-build` | `node:22-alpine` | `npm ci` puis `vite build` du client | Seulement `client/dist` (fichiers statiques) |
| `server-deps` | `node:22-alpine` | `npm ci --omit=dev` du serveur | Seulement `node_modules` de production |
| `runtime` | `node:22-alpine` | Image exécutée | Oui |

Choix techniques :

- **Ordre des couches** : `package*.json` copiés avant le code ; la couche `npm ci` reste en cache tant que les
  dépendances ne changent pas (build de ~5 min la première fois, quelques secondes ensuite).
- **Image finale minimale** : ni outils de build, ni dépendances de dev (Jest, ESLint, Playwright…), ni tests.
- **Utilisateur non root** (`USER node`) : une faille dans l'application ne donne pas les droits root dans le conteneur.
- **`HEALTHCHECK`** : Docker interroge `/api/health` toutes les 15 s ; le conteneur est `healthy` ou `unhealthy`.
- **Traçabilité** : arguments `APP_VERSION` et `GIT_SHA` gravés dans l'image (variables d'environnement et labels
  OCI `org.opencontainers.image.version` / `revision`), renvoyés par `/api/health`.
- **`.dockerignore`** : `.git`, `node_modules`, tests, documentation et surtout tous les fichiers `.env` sont exclus
  du contexte de construction : un secret local ne peut pas finir dans une image.

## 4.3 Orchestration locale (Docker Compose)

Fichier : [`docker-compose.yml`](../../docker-compose.yml).

| Élément | `db` | `app` |
|---|---|---|
| Image | `mariadb:10.11` | `${APP_IMAGE}:${APP_TAG}` (construite localement ou tirée de ghcr.io) |
| Ports | **aucun** (non exposée hors de Docker) | `${APP_PORT}:5000` — 8000 en dev, 8080 en test |
| Réseaux | `backend` | `backend`, `frontend` |
| Volumes | `db-data` (persistance), script d'initialisation et jeu de données en lecture seule | — |
| Santé | `healthcheck.sh --connect --innodb_initialized` | `HEALTHCHECK` de l'image (`/api/health`) |
| Démarrage | — | `depends_on: db: condition: service_healthy` |
| Compte base | root réservé à l'administration | compte applicatif dédié `busintunisia` (moindre privilège) |
| Journaux | — | pilote `json-file`, rotation 3 × 10 Mo |

Les variables obligatoires (`DB_PASSWORD`, `DB_ROOT_PASSWORD`, `JWT_SECRET`) utilisent la syntaxe `${VAR:?message}` :
Compose **refuse de démarrer** si elles manquent, au lieu de lancer l'application avec un secret vide.

Initialisation de la base : au premier démarrage (volume vide), [`deploy/db/init.sh`](../../deploy/db/init.sh)
charge le schéma et le jeu de données de `server/tests/fixtures/`.

### Démarrage reproductible

```bash
cp .env.example .env          # puis remplacer les valeurs « changer-moi »
docker compose up -d --build  # construit l'image et démarre db + app
docker compose ps             # app doit être « healthy »
curl http://localhost:8000/api/health
docker compose logs -f app    # journaux de l'application
docker compose down           # arrêt (ajouter -v pour supprimer aussi les données)
```

## 4.4 Registre d'images : GitHub Container Registry

Le job **docker** du pipeline (`.github/workflows/ci.yml`) construit l'image à chaque exécution et la publie dans
`ghcr.io/arijjebali/busintunisia`, **sauf pour les pull requests** : un code non encore validé n'est jamais publié.

| Tag | Exemple | Usage |
|---|---|---|
| `<version>-<sha>` | `1.0.0-3f2a9c1` | Identique au nom de l'artefact du job build |
| `sha-<sha>` | `sha-3f2a9c1` | Référence immuable utilisée par le déploiement et le rollback |
| `<branche>` | `develop`, `feature-docker` | Dernière image d'une branche |
| `<semver>` | `1.1.0` | Version publiée par un tag Git `v1.1.0` |
| `latest` | — | Dernière image de `main` uniquement |

- Authentification par le **jeton éphémère `GITHUB_TOKEN`** du pipeline (permission `packages: write` limitée à ce
  job) : aucun mot de passe de registre n'est stocké.
- Cache des couches entre pipelines (`cache-from/to: type=gha`).
- Le digest `sha256:…` de l'image publiée est affiché dans le résumé du pipeline.

## 4.5 Preuves

Captures `lot4-*` dans [preuves/](preuves/) : build, `docker compose ps` (conteneurs *healthy*), réponse de
`/api/health`, application servie par le conteneur, image publiée dans ghcr.io.
