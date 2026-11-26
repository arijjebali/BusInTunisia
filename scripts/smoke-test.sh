#!/usr/bin/env bash
# Smoke tests post-déploiement : vérifie en quelques secondes que la version déployée répond
# sur ses fonctions vitales. Ce n'est pas une campagne de test : c'est un contrôle « ça démarre et ça sert ».
#
#   scripts/smoke-test.sh <url_de_base> [commit_attendu]
#   ex. scripts/smoke-test.sh http://localhost:8080 3f2a9c1
#
# Code de sortie 0 si tous les contrôles passent, 1 sinon. Rapport : reports/smoke-test.txt
set -uo pipefail

BASE_URL="${1:?usage: smoke-test.sh <url_de_base> [commit_attendu]}"
EXPECTED_COMMIT="${2:-}"
REPORT_DIR="${REPORT_DIR:-reports}"
mkdir -p "$REPORT_DIR"
REPORT="$REPORT_DIR/smoke-test.txt"
SMOKE_EMAIL="${SMOKE_EMAIL:-client.test@bus.tn}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-Client123!}" # compte fictif du jeu de données de test

pass=0
fail=0
log() { echo "$*" | tee -a "$REPORT"; }
check() { # check <libellé> <condition shell>
  if eval "$2"; then pass=$((pass + 1)); log "  ✔ $1"; else fail=$((fail + 1)); log "  ✘ $1"; fi
}

: > "$REPORT"
log "Smoke tests — $BASE_URL — $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# 1. Sonde de santé : l'application ET la base répondent
health=$(curl -s -m 10 -w '\n%{http_code}' "$BASE_URL/api/health")
health_code=$(tail -n1 <<<"$health")
health_body=$(sed '$d' <<<"$health")
log "  /api/health → $health_code $health_body"
check "Sonde de santé : HTTP 200" '[ "$health_code" = 200 ]'
check "Sonde de santé : status ok" 'grep -q "\"status\":\"ok\"" <<<"$health_body"'
check "Sonde de santé : base de données up" 'grep -q "\"database\":\"up\"" <<<"$health_body"'
if [ -n "$EXPECTED_COMMIT" ]; then
  check "Version déployée = commit $EXPECTED_COMMIT" 'grep -q "\"commit\":\"$EXPECTED_COMMIT" <<<"$health_body"'
fi

# 2. Interface servie
home_code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$BASE_URL/")
check "Page d'accueil : HTTP 200" '[ "$home_code" = 200 ]'
check "Page d'accueil : application React" 'curl -s -m 10 "$BASE_URL/" | grep -q "<div id=\"root\">"'

# 3. Fonction métier principale : recherche de trajets (lecture en base)
search_code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$BASE_URL/api/trips/search?departure=Tunis&destination=Sfax&date=$(date +%Y-%m-%d)")
check "Recherche de trajets : HTTP 200" '[ "$search_code" = 200 ]'

# 4. Authentification : un compte de test obtient un jeton
login=$(curl -s -m 10 -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"$SMOKE_PASSWORD\"}" "$BASE_URL/api/auth/login")
check "Connexion d'un compte de test : jeton reçu" 'grep -q "\"token\":\"" <<<"$login"'

# 5. Contrôle d'accès toujours actif
admin_code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$BASE_URL/api/admin/stats")
check "Route d'administration sans jeton : HTTP 401" '[ "$admin_code" = 401 ]'

log "Résultat : $pass réussi(s), $fail échec(s)"
[ "$fail" -eq 0 ]
