# 3. Exigences, critères d'acceptation et traçabilité (semaine 3)

## 3.1 Adaptation du référentiel RéclaGest

L'énoncé demande d'adapter les règles de référence à l'application réellement testée et de documenter les différences.

| Référentiel RéclaGest | Équivalent BusInTunisia | Différence documentée |
|---|---|---|
| Réclamation (id, titre, description, catégorie, priorité, statut, date) | Réservation : id, trajet, sièges, montant, passager, statut, date de réservation | Pas de champ texte libre : les règles de longueur sont remplacées par des bornes numériques |
| Titre 5–100 caractères, description 10–1 000 | 1 à 9 sièges distincts par réservation ; prix d'un trajet > 0 ; arrivée après le départ | Mêmes techniques (valeurs limites) sur d'autres bornes |
| Créée au statut NOUVELLE | Créée `confirmed` par un passager, `pending` par un administrateur | Deux statuts initiaux selon le rôle |
| NOUVELLE → EN_COURS → RESOLUE → CLOTUREE | `pending` → `confirmed` → `completed` ; `pending`/`confirmed` → `cancelled` | Cycle plus court avec une branche d'annulation ; `completed` est **dérivé** (départ passé), non stocké |
| Une réclamation clôturée n'est plus modifiable | `cancelled` et `completed` sont des états finaux | Identique dans l'esprit |
| Client : ses réclamations ; agent : celles qui lui sont accessibles ; admin : utilisateurs et affectations | Passager : ses réservations et billets ; opérateur : trajets de ses bus ; administrateur : bus, trajets, validations | Identique dans l'esprit |
| Affectation à un agent | Affectation d'un bus à un opérateur et d'un bus à un trajet, sans chevauchement | — |
| Suivi : historique des changements | Statut courant seulement | **Écart** : aucun historique n'est conservé ; consigné comme limite (chapitre 9) |
| Recherche par statut, priorité, date | Recherche de trajets par ville de départ, destination et date | — |

## 3.2 Exigences et critères d'acceptation

Les exigences ont été reconstituées à partir du code, de l'interface et du schéma de base, puis reformulées pour être **vérifiables**. Priorité : **C** = critique, I = importante, S = secondaire.

| ID | Exigence | Prio. | Critères d'acceptation vérifiables |
|---|---|:-:|---|
| EX-01 | Authentification | C | Identifiants valides → `200`, jeton JWT et profil `{id, email, name, role}` **sans** mot de passe ; mot de passe faux → `401 Invalid credentials` ; champ manquant → `400` |
| EX-02 | Inscription | I | Nom, e-mail et mot de passe obligatoires → `400` ; e-mail déjà utilisé → `400 Email already exists` ; e-mail au format valide et mot de passe d'au moins 8 caractères → `400` sinon *(critère ajouté, voir ambiguïté A3)* |
| EX-03 | Contrôle d'accès | C | Route protégée sans jeton ou avec jeton invalide → `401` ; `/api/admin/*` avec un compte non administrateur → `403` et aucune donnée renvoyée ni modifiée |
| EX-04 | Recherche de trajets | I | `GET /trips/search?departure&destination&date` renvoie les trajets de ce jour, quelle que soit la casse des villes |
| EX-05 | Détail d'un trajet | I | Renvoie le trajet et la liste des sièges occupés (réservations `pending` **et** `confirmed`) ; trajet inexistant → `404` |
| EX-06 | Réservation | C | Trajet inexistant → `404` ; 0 siège ou plus de 9 → `400` ; siège en double dans la demande → `400` ; siège déjà occupé → `409` sans rien écrire ; montant = prix × nombre de sièges arrondi au millime ; deux demandes simultanées du même siège → une seule réussit |
| EX-07 | Cycle de vie d'une réservation | C | Seules les 5 transitions du [diagramme d'états](05-etats-roles-exploratoires.md#51-diagramme-détats) sont acceptées ; toute autre → `409` contenant « Transition » et statut inchangé |
| EX-08 | Cloisonnement des passagers | C | Billet, annulation : réservation d'un autre passager → `404` (on ne révèle pas son existence) |
| EX-09 | Planification des trajets (admin) | I | Dates valides, arrivée strictement après le départ, prix > 0, route et bus obligatoires → `400` sinon ; un bus ne peut avoir deux trajets dont les intervalles se chevauchent → `400` ; un trajet qui commence exactement à l'arrivée du précédent est accepté |
| EX-10 | Gestion des bus (admin) | S | Immatriculation unique (`409`), capacité entière > 0, opérateur obligatoire (`400`) ; suppression refusée si le bus porte des trajets |
| EX-11 | Avis | S | Note entière de 1 à 5 → `400` sinon |
| EX-12 | Persistance et intégrité | C | Clés étrangères, unicité et `NOT NULL` respectées ; une réservation refusée ne laisse aucune ligne en base (transaction) ; suppression d'une réservation → ses sièges supprimés (cascade) |
| EX-13 | Cohérence des sièges | I | Les sièges enregistrés pour une réservation appartiennent au bus du trajet |
| EX-14 | Performance | I | 20 clients simultanés : 0 erreur, p97,5 < 500 ms, p99 < 1 s sur la recherche, le détail d'un trajet et « mes réservations » |
| EX-15 | Sécurité des accès | C | Aucun identifiant d'administration codé en dur actif ni publié dans l'interface ; le serveur refuse de démarrer sans secret JWT |

## 3.3 Ambiguïtés relevées et décisions

| # | Ambiguïté | Décision retenue |
|---|---|---|
| A1 | Un siège « en attente » (`pending`) est-il occupé ? Le serveur ne bloquait que les sièges `confirmed` | Oui : sinon un siège en attente de validation peut être revendu (ANO-14) |
| A2 | Un administrateur peut-il rejeter une réservation déjà confirmée ? | Non : `REJECT` ne s'applique qu'à `pending` ; l'annulation d'une réservation confirmée appartient au passager |
| A3 | Aucune règle de format pour l'e-mail ni de longueur pour le mot de passe | Critère proposé (format e-mail, 8 caractères minimum) ; non implémenté → ANO-10, à valider avec le client |
| A4 | Deux trajets « bout à bout » (arrivée 10:30, départ suivant 10:30) se chevauchent-ils ? | Non (intervalles semi-ouverts) ; testé en valeur limite (IT-28, IT-29) |
| A5 | Le numéro affiché sur le plan de sièges est-il l'identifiant `seat.id` ou le numéro `seat.seat_number` ? | Ce doit être le numéro du siège **dans le bus** ; le code utilise l'identifiant global → ANO-09 |
| A6 | Annuler la réservation d'un autre : `403` ou `404` ? | `404`, pour ne pas révéler l'existence de la réservation |

## 3.4 Matrice de traçabilité risques – exigences – tests

Identifiants : **UT** unitaires (Jest), **IT** intégration, **API** Newman, **E2E** Playwright, **PERF** charge. Le détail des cas est au [chapitre 4](04-catalogue-cas-de-test.md). Résultat de la dernière exécution (campagne 2, après correctifs) ; ✅ réussi, ❌ échec lié à une anomalie ouverte.

| Exigence | Risques | Cas de test | Tests automatisés | Résultat |
|---|---|---|---|:-:|
| EX-01 | R2 | CT-01, CT-02, CT-03 | API-01 à 05, E2E-02a, `roles.test.js` | ✅ |
| EX-02 | R9 | CT-04, CT-05, CT-06 | API-06, API-07, API-91 | ❌ API-91 (ANO-10) |
| EX-03 | R2 | CT-12, CT-18 | API-12, 13, 23 ; IT-25 ; E2E-02c | ✅ |
| EX-04 | — | CT-07 | API-08, E2E-01, PERF-01 | ✅ |
| EX-05 | R1, R9 | CT-08, CT-11 | API-09, 10 ; IT-23, IT-24 ; E2E-01 | ✅ |
| EX-06 | R1, R5 | CT-09, CT-10, CT-11, CT-13, CT-14 | `pricing.test.js` ; API-11, 14, 15, 16, 30, 31 ; IT-20 à 23 ; E2E-01 | ✅ |
| EX-07 | R3 | CT-15, CT-16 | `bookingStateMachine.test.js`, `bookingService.test.js` ; API-19, 20, 21, 24, 25, 34 | ✅ |
| EX-08 | R4 | CT-17 | `bookingService.test.js` ; API-18, API-29 | ✅ |
| EX-09 | R7, R9 | CT-19 | `tripValidator.test.js` ; API-26, 27, 28 ; IT-28, IT-29 | ✅ |
| EX-10 | R6, R9 | CT-20 | IT-13 à 19, IT-26, IT-27 | ✅ |
| EX-11 | R9 | CT-21 | API-33 | ✅ |
| EX-12 | R6 | CT-11, CT-20, CT-22 | IT-01 à 12, IT-21, IT-22 | ✅ |
| EX-13 | R6 | CT-22 | API-90 | ❌ (ANO-09) |
| EX-14 | R10 | CT-23 | PERF-01 à 03 | ✅ |
| EX-15 | R2 | CT-24 | API-32, E2E-02b | ✅ |

**Bilan** : 15 exigences sur 15 sont couvertes par au moins un test exécuté ; 13 sont satisfaites ; 2 ne le sont pas (EX-02 partiellement, EX-13), chacune liée à une anomalie ouverte du [registre](06-registre-anomalies.md). Toutes les exigences **critiques** sont satisfaites.
