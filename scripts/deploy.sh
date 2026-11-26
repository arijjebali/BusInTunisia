#!/usr/bin/env bash
# Déploie une image PUBLIÉE (ghcr.io) dans l'environnement de test, vérifie le déploiement et,
# en cas d'échec, revient automatiquement à la dernière version saine.
#
#   scripts/deploy.sh <tag_image>            ex. scripts/deploy.sh sha-3f2a9c1
#
# Étapes : tirer l'image → (re)créer les conteneurs → attendre « healthy » → smoke tests
#          → succès : enregistrer la version  |  échec : rollback automatique + code de sortie 1
#
# Variables (optionnelles) :
#   ENV_NAME       environnement (défaut : test) → configuration deploy/<ENV_NAME>/config.env
#   SECRETS_FILE   fichier des secrets, hors du dépôt (défaut : ~/.busintunisia/<ENV_NAME>-secrets.env)
#   STATE_DIR      historique des déploiements (défaut : ~/.busintunisia)
#   NO_ROLLBACK=1  désactive le rollback automatique (utilisé par rollback.sh)
#   SKIP_PULL=1    utilise une image déjà présente localement (simulation d'incident, hors pipeline)
# Voir docs/devops/07-deploiement.md.
set -euo pipefail

TAG="${1:?usage: deploy.sh <tag_image>   ex. sha-3f2a9c1}"
ENV_NAME="${ENV_NAME:-test}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$ROOT/deploy/$ENV_NAME/config.env"
STATE_DIR="${STATE_DIR:-$HOME/.busintunisia}"
SECRETS_FILE="${SECRETS_FILE:-$STATE_DIR/$ENV_NAME-secrets.env}"
HISTORY="$STATE_DIR/$ENV_NAME-deployments.log" # date | tag | résultat | auteur
CURRENT="$STATE_DIR/$ENV_NAME-current"          # dernier tag déployé avec succès

[ -f "$CONFIG_FILE" ] || { echo "✘ Configuration absente : $CONFIG_FILE"; exit 2; }
[ -f "$SECRETS_FILE" ] || { echo "✘ Secrets absents : $SECRETS_FILE (modèle : deploy/$ENV_NAME/secrets.env.example)"; exit 2; }
mkdir -p "$STATE_DIR"

# Configuration non sensible (versionnée) puis secrets (hors dépôt) : les secrets ne sont jamais affichés.
compose() {
  APP_TAG="$TAG" docker compose -f "$ROOT/docker-compose.yml" \
    --env-file "$CONFIG_FILE" --env-file "$SECRETS_FILE" "$@"
}
# shellcheck disable=SC1090
APP_PORT=$(grep -E '^APP_PORT=' "$CONFIG_FILE" | cut -d= -f2)
BASE_URL="http://localhost:${APP_PORT}"
PREVIOUS="$(cat "$CURRENT" 2>/dev/null || true)"
COMMIT="${TAG#sha-}"
[ "$COMMIT" = "$TAG" ] && COMMIT="" # tag non « sha-… » : on ne vérifie pas le commit

record() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | $TAG | $1 | ${GITHUB_ACTOR:-${USER:-${USERNAME:-inconnu}}}" >> "$HISTORY"; }

echo "▶ Déploiement de $TAG en « $ENV_NAME » (version précédente : ${PREVIOUS:-aucune})"
echo "▶ 1/4 Téléchargement de l'image"
if [ -n "${SKIP_PULL:-}" ]; then echo "  (SKIP_PULL : image locale utilisée)"; else compose pull --quiet app; fi

echo "▶ 2/4 Démarrage des conteneurs"
if ! compose up -d --no-build --wait --wait-timeout 120; then
  echo "✘ Les conteneurs ne sont pas devenus « healthy » dans le délai"
  compose ps
  compose logs --tail=30 app
  deploy_ok=false
else
  echo "▶ 3/4 Smoke tests sur $BASE_URL"
  if "$ROOT/scripts/smoke-test.sh" "$BASE_URL" "$COMMIT"; then deploy_ok=true; else deploy_ok=false; fi
fi

if [ "$deploy_ok" = true ]; then
  echo "$TAG" > "$CURRENT"
  record "succès"
  echo "▶ 4/4 ✔ $TAG déployé et vérifié — $BASE_URL"
  compose ps
  exit 0
fi

record "échec"
echo "▶ 4/4 ✘ Déploiement de $TAG en échec"
if [ -n "${NO_ROLLBACK:-}" ] || [ -z "$PREVIOUS" ] || [ "$PREVIOUS" = "$TAG" ]; then
  echo "  Pas de rollback automatique (désactivé ou aucune version saine connue)."
  exit 1
fi
echo "↩ Rollback automatique vers la dernière version saine : $PREVIOUS"
NO_ROLLBACK=1 "$ROOT/scripts/deploy.sh" "$PREVIOUS" && echo "↩ Service restauré en $PREVIOUS"
exit 1 # le déploiement demandé a échoué, même si le service est restauré
