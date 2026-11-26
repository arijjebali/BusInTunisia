#!/usr/bin/env bash
# Rollback : redéploie une version stable dans l'environnement de test.
#
#   scripts/rollback.sh                 → dernière version déployée AVEC SUCCÈS avant la version actuelle
#   scripts/rollback.sh <tag_image>     → version précise (ex. sha-3f2a9c1)
#   scripts/rollback.sh --list          → historique des déploiements
#
# Le rollback ne reconstruit rien : il redéploie une image déjà publiée et déjà vérifiée,
# puis repasse les mêmes smoke tests que le déploiement. Voir docs/devops/08-supervision-incident-rollback.md.
set -euo pipefail

ENV_NAME="${ENV_NAME:-test}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="${STATE_DIR:-$HOME/.busintunisia}"
HISTORY="$STATE_DIR/$ENV_NAME-deployments.log"
CURRENT="$(cat "$STATE_DIR/$ENV_NAME-current" 2>/dev/null || true)"

if [ "${1:-}" = "--list" ]; then
  echo "Historique des déploiements « $ENV_NAME » (date | tag | résultat | auteur) :"
  cat "$HISTORY" 2>/dev/null || echo "(vide)"
  echo "Version actuelle : ${CURRENT:-inconnue}"
  exit 0
fi

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  # Dernier succès dont le tag diffère de la version actuelle
  TARGET=$(grep '| succès |' "$HISTORY" 2>/dev/null | cut -d'|' -f2 | tr -d ' ' | grep -vx "$CURRENT" | tail -n1 || true)
  [ -n "$TARGET" ] || { echo "✘ Aucune version saine antérieure dans $HISTORY"; exit 1; }
fi

echo "↩ ROLLBACK « $ENV_NAME » : ${CURRENT:-?} → $TARGET"
NO_ROLLBACK=1 "$ROOT/scripts/deploy.sh" "$TARGET"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | $TARGET | rollback depuis ${CURRENT:-?} | ${GITHUB_ACTOR:-${USER:-${USERNAME:-inconnu}}}" >> "$HISTORY"
