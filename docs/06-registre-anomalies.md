# 6. Registre des anomalies et état de leur traitement

Sévérité et priorité sont définies au [§ 2.6 du plan](02-plan-de-test.md#26-critères-de-sortie-et-seuils-fixés-avant-la-campagne-finale). Chaque anomalie est reproduite par un test automatisé, exécuté **avant** le correctif (preuve de la défaillance) puis **après** (preuve de la correction). Les rapports cités sont dans `server/tests/api/reports/`.

Un modèle de fiche pour GitHub Issues est fourni dans `.github/ISSUE_TEMPLATE/anomalie.md` : une fois le dépôt publié, chaque ligne ci-dessous peut devenir une issue suivie dans un tableau GitHub Projects (colonnes *Nouvelle → Confirmée → En correction → À vérifier → Fermée*).

## 6.1 Synthèse

| ID | Titre | Module | Sévérité | Prio. | Statut |
|---|---|---|---|:-:|---|
| ANO-01 | Inscription sans nom : erreur 500 au lieu de 400 | Authentification | Mineure | P3 | ✅ Corrigée, vérifiée |
| ANO-02 | Un client accède aux statistiques d'administration | Contrôle d'accès | **Critique** | P1 | ✅ Corrigée, vérifiée |
| ANO-03 | Un siège déjà réservé peut être réservé à nouveau | Réservation | **Critique** | P1 | ✅ Corrigée, vérifiée |
| ANO-04 | Réservation sur un trajet inexistant : 500 au lieu de 404 | Réservation | Mineure | P3 | ✅ Corrigée, vérifiée |
| ANO-05 | Transitions d'état non contrôlées (double annulation, annulation d'un voyage passé, reconfirmation, rejet après confirmation) | Cycle de vie | Majeure | P1 | ✅ Corrigée, vérifiée |
| ANO-06 | Annuler la réservation d'un autre passager renvoie `200 Cancelled` | Cloisonnement | Majeure | P2 | ✅ Corrigée, vérifiée |
| ANO-07 | Chevauchement non détecté quand le nouveau trajet englobe un trajet existant | Planification | Majeure | P2 | ✅ Corrigée, vérifiée |
| ANO-08 | Trajet sans prix : erreur 500 ; dates illisibles acceptées | Planification | Mineure | P2 | ✅ Corrigée, vérifiée |
| ANO-09 | Les sièges enregistrés n'appartiennent pas au bus du trajet | Réservation / données | Majeure | P1 | ⛔ **Ouverte** |
| ANO-10 | Inscription sans contrôle du format de l'e-mail ni de la longueur du mot de passe | Authentification | Mineure | P3 | ⛔ **Ouverte** |
| ANO-11 | Plus de 9 sièges acceptés dans une réservation | Réservation | Mineure | P3 | ✅ Corrigée, vérifiée |
| ANO-12 | Compte administrateur de démonstration codé en dur et publié sur la page de connexion | Sécurité | **Critique** | P1 | ✅ Corrigée, vérifiée |
| ANO-13 | Note d'avis hors de l'intervalle 1–5 acceptée | Avis | Mineure | P3 | ✅ Corrigée, vérifiée |
| ANO-14 | Les sièges des réservations en attente apparaissent libres | Réservation | Majeure | P2 | ✅ Corrigée, vérifiée |
| ANO-15 | Secret JWT par défaut `'secret'` si la variable d'environnement manque | Sécurité | Majeure | P2 | ✅ Corrigée, vérifiée par revue |
| ANO-16 | Création d'un bus sans opérateur : erreur 500, alors que l'IHM propose « None » | Administration | Mineure | P3 | ✅ Corrigée, vérifiée |
| ANO-17 | Le tableau de bord propose « Cancel » sur un voyage passé (le serveur refuse, message générique) | IHM | Mineure | P3 | ⛔ **Ouverte** |
| ANO-18 | Billet : « Ticket # undefined », nom du passager vide, QR code incomplet | IHM / billet | Majeure | P2 | ✅ Corrigée, vérifiée |

**Bilan** : 18 anomalies ; 15 corrigées et vérifiées (dont les 3 critiques), 3 ouvertes (1 majeure, 2 mineures). Répartition par sévérité : 3 critiques, 7 majeures, 8 mineures, aucune bloquante.

## 6.2 Fiches détaillées

### ANO-01 — Inscription sans nom : erreur 500

| Champ | Contenu |
|---|---|
| Exigence / test | EX-02 / API-07 |
| Reproduction | POST `/api/auth/register` `{"email": "sans.nom@bus.tn", "password": "Secret123!"}` (sans `name`) |
| Attendu / obtenu | `400 … required` / `500 Server error` |
| Preuve | `newman-report-avant-correctifs.json` (500) ; `newman-report-intermediaire.json` (400) |
| Correctif | Contrôle de présence de `name`, `email`, `password` avant tout accès à la base |

### ANO-02 — Un client accède aux statistiques d'administration

| Champ | Contenu |
|---|---|
| Exigence / test | EX-03 / API-23, IT-25 |
| Reproduction | Se connecter en `client.test@bus.tn` ; GET `/api/admin/stats` avec son jeton |
| Attendu / obtenu | `403` / `200 {users: 2, bookings: 7, revenue: 60}` : chiffre d'affaires exposé à tout client |
| Cause | Les routes `/api/admin/*` vérifiaient seulement que l'utilisateur était connecté |
| Correctif | Middleware `requireAdmin` sur `/api/admin`, rôle relu en base à chaque requête |
| Preuve | `newman-report-avant-correctifs.json` (200) → `newman-report-intermediaire.json` (403) |

### ANO-03 — Un siège déjà réservé peut être réservé à nouveau

| Champ | Contenu |
|---|---|
| Exigence / test | EX-06 / API-15, IT-21, IT-22 |
| Reproduction | Client 3 réserve le siège 10 du trajet 1 ; client 4 réserve le même siège |
| Attendu / obtenu | `409 Seat(s) 10 already reserved` / `200 Booking successful` : siège vendu deux fois |
| Correctif | Vérification des sièges déjà pris (`pending` ou `confirmed`) dans la transaction ; `SELECT … FOR UPDATE` sur le trajet pour sérialiser les réservations simultanées. IT-21 lance deux réservations en parallèle : une seule réussit |
| Preuve | `newman-report-campagne2-avant-correctifs.json` (200) → `…-apres-correctifs.json` (409) |

### ANO-04 — Réservation sur un trajet inexistant : 500

| Champ | Contenu |
|---|---|
| Exigence / test | EX-06 / API-16 |
| Reproduction | POST `/api/bookings` `{"trip_id": 99999, "seats": [1]}` |
| Attendu / obtenu | `404 Trip not found` / `500 Booking failed: Trip not found` (message technique exposé) |
| Correctif | Réponse `404` explicite ; les erreurs inattendues ne renvoient plus le message interne |

### ANO-05 — Transitions d'état non contrôlées

| Champ | Contenu |
|---|---|
| Exigence / test | EX-07 / API-20, 21, 25, 34 |
| Reproduction | (a) annuler deux fois la même réservation ; (b) annuler la réservation 4 (voyage du 10/01/2025) ; (c) admin : confirmer la réservation 3 (annulée) ; (d) admin : rejeter la réservation 5 (confirmée) |
| Attendu / obtenu | `409 Transition interdite…` / `200` dans les 4 cas. Le cas (c) réactive une réservation annulée dont le siège a pu être revendu |
| Correctif | Les routes passent par `BookingService`, qui applique la machine à états testée unitairement |

### ANO-06 — Annuler la réservation d'un autre passager renvoie 200

| Champ | Contenu |
|---|---|
| Exigence / test | EX-08 / API-29 |
| Reproduction | Client 4 : PUT `/api/bookings/1/cancel` (réservation du client 3) |
| Attendu / obtenu | `404` / `200 Cancelled`. Rien n'est modifié (filtre `passenger_id` dans l'UPDATE), mais la réponse est fausse |
| Correctif | `cancelByPassenger` vérifie le propriétaire et lève `BookingNotFoundError` (404) |

### ANO-07 — Chevauchement de trajets non détecté

| Champ | Contenu |
|---|---|
| Exigence / test | EX-09 / API-27, IT-28, IT-29 |
| Reproduction | Admin : POST `/api/admin/trips` bus 1, 15/01/2030 07:00 → 12:00 (le bus 1 roule déjà 08:00 → 10:30) |
| Attendu / obtenu | `400 Bus is already scheduled…` / `200 Trip created` |
| Cause | La requête ne testait que les extrémités du nouvel intervalle (voir [§ 1.2](01-fiche-projet-risques.md#12-vocabulaire-appliqué-au-projet)) |
| Correctif | Condition standard de chevauchement `départ_existant < arrivée_nouvelle AND arrivée_existante > départ_nouveau`, appliquée à la création et à la modification ; trajets bout à bout autorisés |

### ANO-08 — Trajet sans prix : 500 ; dates illisibles acceptées

| Champ | Contenu |
|---|---|
| Exigence / test | EX-09 / API-26, `tripValidator.test.js` |
| Reproduction | POST `/api/admin/trips` sans `price` |
| Attendu / obtenu | `400 Price must be greater than zero` / `500` (`undefined <= 0` vaut `false`, l'INSERT échoue sur la contrainte `NOT NULL`) |
| Correctif | Les routes utilisent `validateTrip` (déjà testé mais non branché) + route et bus obligatoires |

### ANO-09 — Les sièges enregistrés n'appartiennent pas au bus du trajet *(ouverte)*

| Champ | Contenu |
|---|---|
| Exigence / test | EX-13 / API-90 (dossier « 9. Défauts connus ») |
| Reproduction | POST `/api/bookings` `{"trip_id": 3, "seats": [5]}` : le trajet 3 utilise le bus 2 (sièges id 41–80), le siège id 5 appartient au bus 1 |
| Attendu / obtenu | `400 … does not belong to this bus` / `200` |
| Cause | Le plan de sièges envoie des **numéros** 1 à N, que le serveur enregistre comme **identifiants globaux** `seat.id` |
| Impact constaté | Dans la base de développement, des réservations des bus 2, 11 et 14 pointent vers les sièges 1, 2, 5 et 29 du bus 1 ; le bus 1 a 120 sièges nommés « A1, A2… » ; les bus 13 à 15 n'ont aucun siège. Pour le passager, l'affichage reste cohérent (même numéro sur le plan et le billet, double vente impossible sur un même trajet). Mais les données sont fausses, et la clé étrangère `ON DELETE CASCADE` ferait **disparaître des sièges de réservations d'autres bus** si l'on supprimait des sièges du bus 1 |
| Pourquoi non corrigée | La correction (convertir numéro → `seat.id` du bus du trajet) exige d'abord une **migration des données de production** : renuméroter les sièges du bus 1, créer les sièges manquants des bus 13 à 15, réaffecter les réservations existantes. Cette opération dépasse la campagne et doit être validée par la personne responsable des données |
| Contournement | Ne jamais supprimer de sièges ni de bus portant des réservations ; effectuer les contrôles comptables par trajet, pas par siège |

### ANO-10 — Inscription sans contrôle de format *(ouverte)*

| Champ | Contenu |
|---|---|
| Exigence / test | EX-02 (critère proposé A3) / API-91 |
| Reproduction | POST `/api/auth/register` `{"name": "Test Invalide", "email": "pas-un-email", "password": "x"}` |
| Attendu / obtenu | `400` / `200` : compte créé avec un mot de passe d'un caractère |
| Pourquoi non corrigée | Règle absente du besoin initial (ambiguïté A3) ; à valider avec le client avant implémentation |

### ANO-11 — Plus de 9 sièges acceptés

| Champ | Contenu |
|---|---|
| Exigence / test | EX-06 / API-30, API-31, `pricing.test.js` |
| Reproduction | POST `/api/bookings` avec 10 sièges |
| Attendu / obtenu | `400 Au plus 9 sièges par réservation` / `200`. La limite n'existait que dans l'IHM (`max=9`), contournable par l'API |
| Correctif | Le montant est calculé par `calculateBookingTotal`, qui applique les bornes 1–9 et refuse les doublons |

### ANO-12 — Compte administrateur de démonstration publié

| Champ | Contenu |
|---|---|
| Exigence / test | EX-15 / API-32, E2E-02b |
| Reproduction | Ouvrir `/login` : « Admin: admin@bus.tn / admin123 » est affiché ; se connecter avec ces identifiants |
| Attendu / obtenu | `401` / `200` avec un jeton administrateur : **n'importe quel visiteur obtient l'administration complète** |
| Correctif | Comptes démo actifs seulement si `ENABLE_DEMO_ACCOUNTS=true` côté serveur ; encart affiché seulement si `VITE_SHOW_DEMO_ACCOUNTS=true` côté client |

### ANO-13 — Note d'avis hors bornes

| Champ | Contenu |
|---|---|
| Exigence / test | EX-11 / API-33 |
| Reproduction | POST `/api/reviews` `{"trip_id": 2, "rating": 6}` |
| Attendu / obtenu | `400` / `200 Review saved` |
| Correctif | Note entière comprise entre 1 et 5 exigée |

### ANO-14 — Sièges des réservations en attente affichés libres

| Champ | Contenu |
|---|---|
| Exigence / test | EX-05, EX-06 / IT-24, E2E-01 (étape 4) |
| Reproduction | GET `/api/trips/1` : `reservedSeats` ne contient pas le siège 3 (réservation 2, `pending`) |
| Attendu / obtenu | `[1, 2, 3, 5]` / `[1, 2, 5]` : le siège 3 paraît libre et peut être revendu |
| Correctif | Sièges occupés = réservations `pending` **et** `confirmed` (affichage et contrôle de conflit) |

### ANO-15 — Secret JWT par défaut

| Champ | Contenu |
|---|---|
| Exigence / test | EX-15 / revue de code (non automatisable sans modifier l'environnement des autres tests) |
| Constat | `jwt.sign(…, process.env.JWT_SECRET \|\| 'secret')` : sans variable d'environnement, n'importe qui peut forger un jeton valide |
| Correctif | Le serveur refuse de démarrer sans `JWT_SECRET` ; `server/.env.example` documente la variable |

### ANO-16 — Bus sans opérateur : erreur 500

| Champ | Contenu |
|---|---|
| Exigence / test | EX-10 / IT-18 (contrainte en base), IT-26 (route) |
| Reproduction | Admin : formulaire « Buses », opérateur « None » → POST `/api/admin/buses` avec `operator_id: ""` |
| Attendu / obtenu | `400 Operator is required` / `500` (colonne `operator_id NOT NULL`) |
| Correctif | Validation côté serveur (`400`), immatriculation en double → `409` ; l'IHM rend l'opérateur obligatoire |

### ANO-17 — « Cancel » proposé sur un voyage passé *(ouverte)*

| Champ | Contenu |
|---|---|
| Exigence / test | EX-07 / constat par revue de `client/src/pages/UserDashboard.jsx` (non automatisé) |
| Constat | Le bouton est affiché pour toute réservation `confirmed`, même terminée. Le serveur refuse désormais l'annulation (`409`) et l'IHM affiche « Failed to cancel booking » sans explication |
| Correctif proposé | Masquer le bouton si la date de départ est passée ; afficher le message renvoyé par l'API |

### ANO-18 — Billet incomplet

| Champ | Contenu |
|---|---|
| Exigence / test | EX-06 (validation du besoin) / E2E-01 étape 6 |
| Reproduction | Réserver un siège ; la page billet s'affiche |
| Attendu / obtenu | « Ticket # 000006 », passager « Leila Client » / « Ticket # undefined », passager vide ; le QR code présenté au chauffeur contient `id: undefined` |
| Cause | L'API renvoie `reservation_id` et `passenger.name`, l'IHM lit `id` et `user_name` (contrat API ↔ IHM non respecté) |
| Détection | Découverte en relisant la capture d'écran du parcours Playwright : les assertions initiales vérifiaient le trajet et le siège, pas le numéro ni le nom |
| Correctif | `Ticket.jsx` lit les bons champs ; assertions ajoutées à E2E-01 (échec constaté avant correctif, succès après) |
