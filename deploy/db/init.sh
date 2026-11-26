#!/bin/bash
# Initialisation de la base MariaDB au PREMIER démarrage du conteneur (volume vide).
# Exécuté par l'entrypoint officiel mariadb depuis /docker-entrypoint-initdb.d/ (serveur temporaire, socket local).
# Le client « mariadb » est appelé directement : le script fonctionne qu'il soit exécuté ou « sourcé »
# (sous Windows, un fichier monté apparaît exécutable et n'a donc pas accès aux fonctions de l'entrypoint).
# Charge le schéma puis le jeu de données de démonstration/test (comptes *.test@bus.tn).
# Les contraintes de clés étrangères sont suspendues pendant le chargement du schéma,
# comme dans server/tests/db/resetTestDb.js (tables créées dans l'ordre du fichier).
set -euo pipefail

echo "[init-db] Chargement du schéma et du jeu de données dans « ${MARIADB_DATABASE} »"
{
  echo "SET FOREIGN_KEY_CHECKS = 0;"
  cat /fixtures/schema.sql
  echo "SET FOREIGN_KEY_CHECKS = 1;"
  cat /fixtures/seed.sql
} | mariadb --protocol=socket -uroot -p"${MARIADB_ROOT_PASSWORD}" "${MARIADB_DATABASE}"
echo "[init-db] Terminé"
