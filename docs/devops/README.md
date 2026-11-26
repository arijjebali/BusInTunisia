# Dossier DevOps — BusInTunisia

Mini-projet « Atelier chaîne DevOps », Licence 3 — Développement des systèmes d'information.

Objectif : qu'une modification du code déclenche une chaîne automatisée qui vérifie la qualité et la sécurité,
construit une version identifiable, la publie, la déploie dans un environnement de test, vérifie son fonctionnement
et permet de restaurer une version stable en cas d'incident.

## Chaîne visée

```
Commit → Push / PR → CI → Build → Tests & qualité → Sécurité → Image → Registre
       → Déploiement en test → Smoke tests & health check → Logs / supervision → Rollback si nécessaire
```

## Avancement par lot

| Lot | Contenu | État | Document |
|---|---|---|---|
| 1 | Organisation du dépôt et collaboration Git | 🟡 En cours | [CONTRIBUTING.md](../../CONTRIBUTING.md) |
| 2 | Intégration continue et construction | ⬜ À faire | — |
| 3 | Qualité logicielle et tests automatisés | ⬜ À faire | — |
| 4 | Conteneurisation et registre | ⬜ À faire | — |
| 5 | Configurations, secrets et DevSecOps | ⬜ À faire | — |
| 6 | Déploiement automatisé et vérification | ⬜ À faire | — |
| 7 | Supervision, incident et rollback | ⬜ À faire | — |

Ce tableau est mis à jour à la fin de chaque étape ; une étape non réalisée reste signalée comme telle.
