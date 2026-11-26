#!/usr/bin/env bash
# Tableau de bord de supervision (terminal) de l'environnement de test.
#
#   scripts/supervision.sh [url]          instantané (défaut : http://localhost:8080)
#   scripts/supervision.sh [url] --watch  rafraîchi toutes les 5 s (Ctrl+C pour quitter)
#
# Sources : sonde /api/health, indicateurs /api/metrics, état Docker, journaux JSON de l'application.
# Voir docs/devops/08-supervision-incident-rollback.md.
set -uo pipefail

URL="${1:-http://localhost:8080}"
PROJECT="${COMPOSE_PROJECT:-busintunisia-test}"

snapshot() {
  echo "══ Supervision BusInTunisia — $URL — $(date '+%Y-%m-%d %H:%M:%S')"
  local health code
  health=$(curl -s -m 5 -w '\n%{http_code}' "$URL/api/health")
  code=$(tail -n1 <<<"$health")
  health=$(sed '$d' <<<"$health")
  echo "── Santé (/api/health) : HTTP ${code:-injoignable}"
  if [ -n "$health" ]; then
    node -e '
      const h = JSON.parse(process.argv[1]);
      const ok = h.status === "ok";
      console.log(`   État     : ${ok ? "✔ OK" : "✘ " + h.status.toUpperCase()}   base : ${h.checks?.database}${h.error ? "  (" + h.error + ")" : ""}`);
      console.log(`   Version  : ${h.version}  (commit ${String(h.commit).slice(0, 7)}, env. ${h.environment})`);
      console.log(`   Démarrée : ${h.startedAt}  — disponible depuis ${h.uptimeSeconds} s`);
    ' "$health" 2>/dev/null || echo "   $health"
  else
    echo "   ✘ Service injoignable"
  fi

  echo "── Indicateurs (/api/metrics)"
  curl -s -m 5 "$URL/api/metrics" | node -e '
    let d = ""; process.stdin.on("data", (c) => (d += c)).on("end", () => {
      try {
        const m = JSON.parse(d), r = m.requests, t = m.responseTimeMs;
        console.log(`   Requêtes : ${r.total}  (2xx ${r.byStatus["2xx"]} | 3xx ${r.byStatus["3xx"]} | 4xx ${r.byStatus["4xx"]} | 5xx ${r.byStatus["5xx"]})`);
        console.log(`   Erreurs serveur : ${(m.errorRate * 100).toFixed(2)} %   Temps de réponse : moy. ${t.avg} ms | p95 ${t.p95} ms | max ${t.max} ms`);
        if (m.lastServerError) console.log(`   Dernière erreur 5xx : ${m.lastServerError.at} ${m.lastServerError.method} ${m.lastServerError.path} → ${m.lastServerError.status}`);
      } catch { console.log("   (indisponible)"); }
    });'

  echo "── Conteneurs (docker compose -p $PROJECT ps)"
  docker compose -p "$PROJECT" ps --format '   {{.Service}}\t{{.Image}}\t{{.Status}}' 2>/dev/null || echo "   (Docker indisponible)"

  echo "── Derniers avertissements / erreurs du journal applicatif"
  docker compose -p "$PROJECT" logs --no-log-prefix --tail=300 app 2>/dev/null \
    | grep -E '"level":"(warn|error)"' | tail -n 5 | sed 's/^/   /' || true
}

if [ "${2:-}" = "--watch" ]; then
  while true; do clear; snapshot; sleep 5; done
else
  snapshot
fi
