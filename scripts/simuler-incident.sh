#!/usr/bin/env bash
# Simulation d'incidents CONTRÔLÉS dans l'environnement de test (jamais ailleurs).
#
#   scripts/simuler-incident.sh version-defectueuse   déploie une version comportant un bug SQL
#                                                     → smoke tests en échec → rollback automatique
#   scripts/simuler-incident.sh panne-base            arrête la base de données → service dégradé (503)
#   scripts/simuler-incident.sh retablir-base         redémarre la base de données
#
# Voir la fiche d'incident : docs/devops/08-supervision-incident-rollback.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="busintunisia-test"
STATE_DIR="${STATE_DIR:-$HOME/.busintunisia}"
IMAGE="ghcr.io/arijjebali/busintunisia"

case "${1:-}" in
  version-defectueuse)
    CURRENT="$(cat "$STATE_DIR/test-current" 2>/dev/null || true)"
    [ -n "$CURRENT" ] || { echo "✘ Aucune version saine déployée en test"; exit 1; }
    # Version « défectueuse » réaliste : la version saine actuelle + une faute de frappe dans une requête SQL
    # (table « trips » au lieu de « trip ») sur la recherche de trajets. La sonde de santé reste verte :
    # seul un smoke test fonctionnel peut détecter ce défaut.
    BAD_TAG="sha-defaut1"
    echo "▶ Construction de la version défectueuse $BAD_TAG à partir de $CURRENT"
    docker build -q -t "$IMAGE:$BAD_TAG" - <<EOF
FROM $IMAGE:$CURRENT
RUN node -e "const fs=require('fs'),f='/app/server/index.js';fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('FROM trip t','FROM trips t'))"
ENV GIT_SHA=defaut1 APP_VERSION=defaut1
EOF
    echo "▶ Déploiement de la version défectueuse (comme le ferait le pipeline)"
    SKIP_PULL=1 "$ROOT/scripts/deploy.sh" "$BAD_TAG" || echo "▶ Déploiement refusé : voir le rollback automatique ci-dessus"
    ;;
  panne-base)
    echo "▶ Arrêt de la base de données de test ($PROJECT-db-1)"
    docker stop "$PROJECT-db-1" >/dev/null
    echo "  Service dégradé : observer avec scripts/supervision.sh, puis rétablir avec « retablir-base »"
    ;;
  retablir-base)
    echo "▶ Redémarrage de la base de données de test"
    docker start "$PROJECT-db-1" >/dev/null
    for _ in $(seq 1 30); do
      [ "$(docker inspect -f '{{.State.Health.Status}}' "$PROJECT-db-1")" = healthy ] && break
      sleep 2
    done
    echo "  Base : $(docker inspect -f '{{.State.Health.Status}}' "$PROJECT-db-1")"
    ;;
  *)
    echo "Usage : $0 version-defectueuse | panne-base | retablir-base"
    exit 2
    ;;
esac
