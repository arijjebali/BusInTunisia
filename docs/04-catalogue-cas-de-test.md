# 4. Catalogue des cas de test et jeux de données (semaine 4)

## 4.1 Jeu de données de référence

Fichier : `server/tests/fixtures/seed.sql`, chargé par `npm run db:reset` dans `bus_in_tunisia_test`. Les identifiants sont fixes : chaque test peut citer « la réservation 2 » ou « le siège 5 » et obtenir le même résultat à chaque exécution.

| Donnée | Contenu |
|---|---|
| Utilisateurs | 1 `admin.test@bus.tn` / `Admin123!` (admin) · 2 `operator.test@bus.tn` / `Operator123!` (opérateur) · 3 `client.test@bus.tn` / `Client123!` (passager « Sami ») · 4 `client2.test@bus.tn` / `Client123!` (passagère « Leila ») |
| Villes, routes | Tunis, Sousse, Sfax, Bizerte, Nabeul ; route 1 Tunis → Sousse, route 2 Tunis → Sfax |
| Bus | 1 `TUN-1001` (40 places, sièges id 1–40) · 2 `TUN-1002` VIP (sièges id 41–80) · 3 `TUN-1003` sans trajet ni siège |
| Trajets | 1 : Tunis → Sousse, 15/01/2030 08:00–10:30, bus 1, 15 TND · 2 : Tunis → Sfax, 10/01/2025 (**passé**), bus 2, 25 TND · 3 : Tunis → Sfax, 15/01/2030 14:00–18:00, bus 2, 25 TND |
| Réservations | 1 `confirmed` (client 3, trajet 1, sièges 1 et 2) · 2 `pending` (client 3, trajet 1, siège 3) · 3 `cancelled` (client 3, trajet 1, siège 4) · 4 `confirmed` sur le trajet passé (donc **terminée**) · 5 `confirmed` (client 4, trajet 1, siège 5) |

Chaque statut du cycle de vie est représenté au moins une fois, ce qui permet de tester toutes les transitions sans préparation supplémentaire.

## 4.2 Techniques de conception utilisées

### Partitions d'équivalence et valeurs limites — nombre de sièges (CT-10)

| Classe | Valeurs | Attendu | Tests |
|---|---|---|---|
| Invalide : aucun siège | 0 (`[]`) | `400` | API-14, `pricing.test.js` |
| **Limite basse valide** | 1 | `200` | API-11 |
| Valide | 2 à 8 | `200` | IT-20 (2 sièges) |
| **Limite haute valide** | 9 | `200` | API-31, `pricing.test.js` |
| **Limite haute + 1** | 10 | `400 Au plus 9 sièges` | API-30, `pricing.test.js` |
| Invalide : doublon | `[7, 7]` | `400` | `pricing.test.js` |

### Partitions et limites — prix d'un trajet (CT-14, CT-19)

| Classe | Valeurs testées | Attendu |
|---|---|---|
| Invalide | absent, `null`, `''`, `'abc'`, −1, **0** | refusé (`Price must be greater than zero`) |
| **Plus petite valeur valide** | 0,001 TND (1 millime) | accepté |
| Arrondi | 10,3335 × 1 siège | 10,334 (arrondi au millime) |

### Valeurs limites — chevauchement de deux trajets d'un même bus (CT-19)

Trajet existant : bus 1, 08:00 → 10:30.

| Nouveau trajet | Position | Attendu | Test |
|---|---|---|---|
| 10:30 → 13:00 | commence exactement à l'arrivée (**limite**) | accepté | IT-28 |
| 10:29 → 12:00 | chevauche d'une minute (**limite + 1**) | `400 already scheduled` | IT-29 |
| 07:00 → 12:00 | englobe le trajet existant | `400 already scheduled` | API-27 |

### Table de décision — création d'un trajet (CT-19)

| Condition / Règle | R1 | R2 | R3 | R4 | R5 | R6 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Dates lisibles | O | N | O | O | O | O |
| Arrivée > départ | O | – | N | O | O | O |
| Prix > 0 | O | – | – | N | O | O |
| Route et bus fournis | O | – | – | – | N | O |
| Bus libre sur l'intervalle | O | – | – | – | – | N |
| **Résultat** | `200 Trip created` | `400 … invalid` | `400 Arrival time must be after…` | `400 Price must be…` | `400 Route/Bus is required` | `400 … already scheduled` |
| Tests | API-28, IT-28 | UT R5, R6 | UT R2, R3 | API-26, UT R4 | revue + UT | API-27, IT-29 |

### Table de décision — action d'un administrateur sur une réservation (CT-16)

| Statut actuel → | `pending` | `confirmed` | `cancelled` | terminée |
|---|---|---|---|---|
| **Confirmer** | ✅ `confirmed` (API-24) | ❌ `409` (UT) | ❌ `409` (API-25) | ❌ `409` (UT) |
| **Rejeter** | ✅ `cancelled` (UT) | ❌ `409` (API-34) | ❌ `409` (UT) | ❌ `409` (UT) |

## 4.3 Catalogue

Type : **+** positif, **−** négatif, **L** valeur limite, **S** sécurité. Toutes les fiches sont automatisées ; la colonne « Tests » renvoie aux scripts.

| ID | Titre | Exig. | Type | Préconditions / données | Étapes | Résultat attendu | Tests |
|---|---|---|:-:|---|---|---|---|
| CT-01 | Connexion avec des identifiants valides | EX-01 | + | Seed ; client 3 | POST `/auth/login` `{client.test@bus.tn, Client123!}` | `200` ; `token` non vide ; `user.role = "user"` ; pas de champ `password` | API-01, 04, 05 ; E2E-01 |
| CT-02 | Connexion avec un mot de passe incorrect | EX-01 | − | Seed | POST `/auth/login` avec un mauvais mot de passe | `401 Invalid credentials` ; l'IHM reste sur `/login` et affiche le message | API-02 ; E2E-02a |
| CT-03 | Connexion sans mot de passe | EX-01 | − | — | POST `/auth/login` `{email}` | `400 … required` | API-03 |
| CT-04 | Inscription avec un e-mail déjà utilisé | EX-02 | − | client 3 existe | POST `/auth/register` avec `client.test@bus.tn` | `400 Email already exists` | API-06 |
| CT-05 | Inscription sans nom | EX-02 | − | — | POST `/auth/register` sans `name` | `400 … required` | API-07 |
| CT-06 | Inscription avec e-mail invalide et mot de passe d'un caractère | EX-02 | − / L | — | POST `/auth/register` `{email: "pas-un-email", password: "x"}` | `400` | API-91 *(échoue : ANO-10)* |
| CT-07 | Rechercher les trajets d'un jour | EX-04 | + | Trajet 1 le 15/01/2030 | GET `/trips/search?departure=Tunis&destination=Sousse&date=2030-01-15` | `200` ; 1 trajet, prix 15 | API-08 ; E2E-01 |
| CT-08 | Consulter un trajet inexistant | EX-05 | − | — | GET `/trips/99999` | `404 Trip not found` | API-10 |
| CT-09 | Réserver un siège libre | EX-06 | + | Client connecté ; siège 10 du trajet 1 libre | POST `/bookings` `{trip_id: 1, seats: [10]}` | `200` ; `reservation_id` ; statut `confirmed` en base | API-11 ; E2E-01 ; IT-20 |
| CT-10 | Nombre de sièges aux limites (0, 1, 9, 10) | EX-06 | L | Client connecté | 4 réservations de 0, 1, 9 et 10 sièges | `400` / `200` / `200` / `400` | API-14, 11, 31, 30 ; UT |
| CT-11 | Réserver un siège déjà occupé (confirmé, en attente, ou en même temps qu'un autre client) | EX-06, EX-12 | − | Siège 10 réservé par CT-09 ; siège 3 `pending` | POST `/bookings` du même siège par un autre client ; puis deux POST simultanés du siège 15 | `409 … already reserved` ; aucune ligne écrite ; une seule des deux requêtes simultanées réussit | API-15 ; IT-21, 22, 24 |
| CT-12 | Réserver sans être authentifié | EX-03 | − / S | — | POST `/bookings` sans en-tête `Authorization`, puis avec un jeton forgé ; ouvrir `/booking/1` sans session | `401` ; redirection vers `/login` | API-12, 13 ; E2E-02c |
| CT-13 | Réserver sur un trajet inexistant | EX-06 | − | — | POST `/bookings` `{trip_id: 99999, seats: [1]}` | `404 Trip not found` | API-16 |
| CT-14 | Calcul du montant | EX-06 | + / L | Trajet 1 à 15 TND | Réserver 2 sièges ; calcul unitaire avec 12,5 × 3 et 10,3335 × 1 | 30 TND en base ; 37,5 ; 10,334 | IT-20 ; `pricing.test.js` |
| CT-15 | Annuler une réservation (transitions autorisées et interdites) | EX-07 | + / − | Réservation créée en CT-09 ; réservation 4 (terminée) | Annuler CT-09 ; l'annuler à nouveau ; annuler la 4 | `200` ; puis `409 Transition` ; `409 Transition` | API-19, 20, 21 ; UT |
| CT-16 | Confirmer / rejeter une réservation (admin) | EX-07 | + / − | Réservations 2 (`pending`), 3 (`cancelled`), 5 (`confirmed`) | Confirmer 2 ; confirmer 3 ; rejeter 5 | `200` ; `409` ; `409` | API-24, 25, 34 ; UT |
| CT-17 | Accéder à la réservation d'un autre passager | EX-08 | − / S | Réservation 1 appartient au client 3 | Client 4 : GET `/tickets/1`, PUT `/bookings/1/cancel` | `404` ; réservation 1 toujours `confirmed` | API-18, 29 ; UT |
| CT-18 | Utiliser une route d'administration avec un compte client | EX-03 | − / S | Client connecté | GET `/admin/stats` ; POST `/admin/buses` | `403` ; aucun bus inséré | API-23 ; IT-25 |
| CT-19 | Créer un trajet (table de décision + chevauchements) | EX-09 | + / − / L | Admin connecté ; bus 1 occupé 08:00–10:30 | Voir § 4.2 | Voir § 4.2 | API-26, 27, 28 ; IT-28, 29 ; UT |
| CT-20 | Gérer les bus (contraintes) | EX-10, EX-12 | + / − | Seed | Créer, lire, modifier, supprimer ; immatriculation en double ; sans opérateur ; supprimer un bus qui a des trajets | CRUD conforme ; `409` ; `400 Operator is required` ; suppression refusée | IT-13 à 19, 26, 27 |
| CT-21 | Déposer un avis avec une note hors bornes | EX-11 | L | Client connecté | POST `/reviews` `{trip_id: 2, rating: 6}` | `400 Rating must be…` | API-33 |
| CT-22 | Réserver un siège qui n'appartient pas au bus du trajet | EX-13 | − | Trajet 3 = bus 2 (sièges 41–80) | POST `/bookings` `{trip_id: 3, seats: [5]}` (siège du bus 1) | `400 … does not belong` | API-90 *(échoue : ANO-09)* |
| CT-23 | Temps de réponse sous charge | EX-14 | NF | Base de test ; 20 clients | `npm run test:perf` | 0 erreur ; p97,5 < 500 ms ; p99 < 1 s | PERF-01 à 03 |
| CT-24 | Comptes de démonstration et secret JWT | EX-15 | S | `ENABLE_DEMO_ACCOUNTS` absent | Connexion `admin@bus.tn / admin123` ; page `/login` | `401` ; identifiants absents de la page | API-32 ; E2E-02b |

**Total : 24 cas de test documentés** (dont 5 sur des valeurs limites, 4 de sécurité et 1 non fonctionnel ; 19 comportent un volet négatif), automatisés par **97 tests Jest, 36 requêtes Newman (69 assertions), 4 scénarios Playwright et 3 scénarios de charge**.
