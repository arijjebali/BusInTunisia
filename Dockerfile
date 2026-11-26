# syntax=docker/dockerfile:1
# Image unique BusInTunisia : API Express + interface React construite.
# Construction multi-étapes : les outils de build et les dépendances de dev ne sont pas dans l'image finale.
#
#   docker build -t busintunisia:local --build-arg APP_VERSION=1.0.0-abc1234 --build-arg GIT_SHA=abc1234 .
#
# Voir docs/devops/04-conteneurisation.md.

ARG NODE_IMAGE=node:22-alpine

# --- Étape 1 : construction du client React ---------------------------------------------------
FROM ${NODE_IMAGE} AS client-build
WORKDIR /app/client
# Les manifestes d'abord : la couche « npm ci » reste en cache tant que les dépendances ne changent pas.
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# --- Étape 2 : dépendances de production du serveur --------------------------------------------
FROM ${NODE_IMAGE} AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# --- Étape 3 : image d'exécution ---------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
ARG APP_VERSION=dev
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="BusInTunisia" \
      org.opencontainers.image.description="Réservation de billets de bus (API Express + interface React)" \
      org.opencontainers.image.source="https://github.com/arijjebali/BusInTunisia" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_SHA}"

ENV NODE_ENV=production \
    PORT=5000 \
    CLIENT_DIST=/app/client/dist \
    APP_VERSION=${APP_VERSION} \
    GIT_SHA=${GIT_SHA}

# Sécurité : npm/npx/corepack ne servent qu'à construire, pas à exécuter (CMD = node). Trivy relevait
# 10 vulnérabilités HIGH dans le npm fourni par l'image de base : on le retire de l'image finale.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

WORKDIR /app/server
COPY --from=server-deps --chown=node:node /app/server/node_modules ./node_modules
COPY --chown=node:node server/package.json server/index.js ./
COPY --chown=node:node server/src ./src
COPY --from=client-build --chown=node:node /app/client/dist /app/client/dist

# Sécurité : le processus ne tourne pas en root (utilisateur « node » fourni par l'image officielle).
USER node
EXPOSE 5000

# Docker interroge la sonde de santé : le conteneur passe « healthy » / « unhealthy ».
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health > /dev/null || exit 1

CMD ["node", "index.js"]
