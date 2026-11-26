# Scripts d'automatisation

Scripts appelés par le pipeline CI/CD et utilisables à la main :

| Script | Rôle | Étape |
|---|---|---|
| `deploy.sh <tag>` | Déployer une image publiée en test, smoke tests, rollback automatique si échec | Lot 6 |
| `smoke-test.sh <url> [commit]` | 9 contrôles post-déploiement (santé, version, interface, métier, accès) | Lot 6 |
| `rollback.sh [tag]`, `rollback.sh --list` | Revenir à la dernière version saine (ou à un tag) ; historique | Lot 7 |
| `preuves/capture.mjs` | Captures d'écran des preuves (pages web, sorties de terminal) | Tous |
