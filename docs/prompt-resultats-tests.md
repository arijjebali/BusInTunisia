Tu es expert en test et validation des logiciels (vocabulaire ISTQB). Tu aides un étudiant de Licence 3 (Développement des systèmes d'information) qui a mené une campagne de test complète sur une application web, dans le cadre du mini-projet « Atelier Test et validation des logiciels ».

## Ta tâche

[À ADAPTER] À partir des données ci-dessous, rédige en français une synthèse claire et structurée des tests réalisés et de leurs résultats, destinée à l'enseignant qui évalue le projet. Pour chaque niveau de test : ce qui a été testé, pourquoi, avec quel outil, le résultat et ce qu'il prouve. Termine par le bilan et la décision de livraison.

Règles :
- N'invente aucun test, chiffre ou résultat : utilise uniquement les données fournies. S'il manque une information, dis-le.
- Les échecs de la collection API complète (API-90, API-91) sont **attendus** : ils documentent des anomalies encore ouvertes. Ne les présente pas comme des régressions.
- Garde les identifiants (CT-xx, IT-xx, API-xx, E2E-xx, PERF-xx, ANO-xx) pour que l'on puisse retrouver chaque test dans le dépôt.

---

## 1. Contexte

**Application testée : BusInTunisia**, réservation de billets de bus interurbains en Tunisie. Elle remplace l'application RéclaGest de l'énoncé, qui autorise ce choix.

- Frontal : React 18, Vite 5, Tailwind. API : Node.js 22, Express 5, authentification JWT. Base : MariaDB 10.4 (XAMPP).
- Logique métier isolée dans `server/src/services/` : machine à états, tarification, validation des trajets, rôles. Accès aux données dans `server/src/repositories/`.
- Rôles : passager, opérateur, administrateur.
- Fonctions critiques :
  - réserver des sièges (bon montant, pas de double vente) ;
  - cycle de vie d'une réservation ;
  - contrôle des accès ;
  - planification des bus sans chevauchement.
- Cycle de vie d'une réservation (5 transitions autorisées) :
  - `pending → confirmed` (CONFIRM, admin) ;
  - `pending → cancelled` (REJECT admin, ou CANCEL passager) ;
  - `confirmed → cancelled` (CANCEL passager, avant le départ) ;
  - `confirmed → completed` (DEPARTURE_PASSED ; `completed` est un état dérivé, non stocké).
  - Toute autre transition renvoie 409.
- Données de test : base dédiée `bus_in_tunisia_test`, recréée avant chaque campagne (`schema.sql` + `seed.sql`).
  - 4 utilisateurs (admin, opérateur, passager « Sami », passagère « Leila ») ;
  - 3 bus et 80 sièges ;
  - 3 trajets, dont un passé ;
  - 5 réservations couvrant tous les statuts.
- Outils :
  - Jest (unitaires, intégration, couverture), Supertest ;
  - Postman + Newman (API) ;
  - Playwright / Chromium (interface) ;
  - autocannon (charge ; choisi à la place de k6, non installé) ;
  - GitHub Actions (CI).
- Démarche : stratégie fondée sur 10 risques (probabilité × impact). Les risques de criticité ≥ 6 sont couverts par au moins deux niveaux de test. Techniques employées :
  - partitions d'équivalence ;
  - valeurs limites ;
  - tables de décision ;
  - transitions d'état ;
  - tests exploratoires (3 sessions).
- Volume : 15 exigences (EX-01 à EX-15) et 24 cas de test documentés (CT-01 à CT-24).

## 2. Résultats globaux (campagne finale du 19/11/2026)

Environnement : Windows 11, Node.js 22.16, MariaDB 10.4.32, Chromium.

| Niveau | Exécutés | Réussis | Échecs |
|---|---:|---:|---:|
| Unitaires (Jest, 5 fichiers) | 68 | 68 | 0 |
| Intégration (Jest + MariaDB + Supertest, 3 fichiers) | 29 | 29 | 0 |
| API — suite de régression (34 requêtes) | 66 assertions | 66 | 0 |
| API — collection complète (36 requêtes) | 69 assertions | 66 | 3 (attendus : ANO-09, ANO-10) |
| Interface Playwright | 4 scénarios | 4 | 0 |
| Interface — stabilité (`--repeat-each=3`) | 12 | 12 | 0 |
| Performance (autocannon) | 3 scénarios | 3 conformes | 0 |

Les 97 tests Jest ont été réexécutés le 24/11/2026 : 97/97 réussis.

## 3. Tests unitaires — 68/68 réussis

**bookingStateMachine.test.js (27)**
- pending → confirmed sur CONFIRM ; confirmed → cancelled sur CANCEL.
- Refuse de confirmer une réservation annulée et d'annuler une réservation terminée.
- Erreur explicite pour un état inconnu.
- `effectiveStatus` : completed si le départ est passé ou **exactement maintenant (limite)** ; confirmed si le départ est futur.
- Statut initial : passager → confirmed, administrateur → pending.
- Table complète des **16 couples état × événement** (4 états × CONFIRM, REJECT, CANCEL, DEPARTURE_PASSED) : chaque événement est accepté si et seulement s'il figure dans la table.
- `isTransitionAllowed` renvoie false pour un état inconnu sans lever d'exception.

**tripValidator.test.js (12)**
- R1 : trajet valide accepté.
- R2 : arrivée = départ refusée (limite).
- R3 : arrivée avant le départ refusée.
- R4 : prix absent, null, vide, zéro (limite), négatif ou non numérique refusé ; 0,001 TND accepté.
- R5 : dates et prix invalides signalés ensemble.
- R6 : appel sans argument invalide.

**roles.test.js (11)**
- Conversion des rôles Symfony : ROLE_ADMIN → admin, ROLE_OPERATOR → operator, ROLE_USER → user. Une combinaison contenant ROLE_ADMIN donne admin ; `[]` donne user.
- Valeurs invalides (null, undefined, "", "ROLE_ADMIN" brut, JSON cassé) : retour à « user », principe du moindre privilège.

**pricing.test.js (10)**
- Total = prix × nombre de sièges, arrondi au millime.
- 9 sièges acceptés (limite max) ; 10 refusés (limite + 1).
- Aucun siège ou siège en double : refusé.
- Prix 0, −5, "abc" ou NaN : refusé.

**bookingService.test.js (8)** (dépôt simulé, horloge figée)
- Annulation par le passager :
  - réservation confirmée à venir : annulée et persistée ;
  - voyage passé : refusée, rien persisté ;
  - réservation d'un autre passager ou inexistante : BookingNotFoundError (404).
- Confirmation par l'administrateur : pending → confirmed ; refusée sur une réservation annulée, rien persisté.
- Rejet par l'administrateur : pending → cancelled ; refusé sur une réservation confirmée.

## 4. Tests d'intégration — 29/29 réussis

**bookingRepository.int.test.js (12)** (chaque test s'exécute dans une transaction annulée à la fin)
- IT-01 création d'une réservation et de ses sièges.
- IT-02 lecture.
- IT-03 réservation inexistante → null.
- IT-04 mise à jour pending → confirmed.
- IT-05 suppression avec cascade sur les sièges.
- IT-06 et IT-07 clés étrangères : trajet ou passager inexistant refusé.
- IT-08 NOT NULL sur le statut.
- IT-09 clé primaire composite : même siège deux fois dans une réservation refusé.
- IT-10 UNIQUE : un seul ticket par réservation.
- IT-11 FK RESTRICT : impossible de supprimer une réservation qui a un ticket.
- IT-12 isolation : les 5 réservations du jeu de données sont intactes.

**busRepository.int.test.js (7)**
- IT-13 à IT-16 : CRUD complet (créer et relire, lister avec l'opérateur, modifier la capacité, supprimer un bus sans trajet).
- IT-17 immatriculation UNIQUE.
- IT-18 opérateur NOT NULL.
- IT-19 FK RESTRICT : impossible de supprimer un bus qui porte des trajets.

**api.routes.int.test.js (10, Supertest)**
- IT-20 réservation de 2 sièges : montant prix × sièges et statut confirmed persistés.
- IT-21 **deux réservations simultanées du même siège** : une seule réussit, réponses [200, 409], aucun doublon.
- IT-22 réservation refusée (409) : rollback, aucune ligne orpheline.
- IT-23 un siège annulé redevient réservable.
- IT-24 siège d'une réservation en attente affiché occupé (ANO-14).
- IT-25 un client ne peut pas créer de bus (403), rien n'est inséré.
- IT-26 bus sans opérateur → 400 au lieu de 500 (ANO-16).
- IT-27 immatriculation en double → 409.
- IT-28 trajet qui commence exactement à l'arrivée du précédent sur le même bus : accepté (limite).
- IT-29 chevauchement d'une minute : refusé (limite + 1).

## 5. Tests API (Postman + Newman) — 36 requêtes, 69 assertions

Toutes les requêtes ci-dessous ont réussi, sauf API-90 et API-91.

**Authentification**
- API-01 login client valide → 200, jeton et profil sans mot de passe.
- API-02 mauvais mot de passe → 401.
- API-03 sans mot de passe → 400.
- API-04 login admin → 200, rôle admin.
- API-05 login du second client → 200.
- API-06 inscription avec un e-mail déjà utilisé → 400.
- API-07 inscription sans nom → 400.

**Trajets**
- API-08 recherche Tunis → Sousse le 15/01/2030 → 200, 1 trajet.
- API-09 détail d'un trajet avec ses sièges réservés → 200.
- API-10 trajet inexistant → 404.

**Réservations**
- API-11 réservation du siège 10 → 200, `reservation_id`.
- API-12 sans authentification → 401.
- API-13 jeton invalide → 401.
- API-14 aucun siège → 400.
- API-15 siège déjà réservé → 409.
- API-16 trajet inexistant → 404.
- API-17 mes réservations → 200.
- API-18 billet d'un autre passager → 404.
- API-19 annuler ma réservation → 200.
- API-20 annuler une seconde fois → 409.
- API-21 annuler un voyage passé → 409.

**Administration**
- API-22 statistiques → 200, schéma numérique.
- API-23 statistiques avec un compte client → 403.
- API-24 confirmer une réservation en attente → 200.
- API-25 confirmer une réservation annulée → 409.

**Règles métier et sécurité**
- API-26 trajet sans prix → 400.
- API-27 trajet qui englobe un trajet existant du même bus → 400.
- API-28 trajet valide → 200.
- API-29 annuler la réservation d'un autre passager → 404.
- API-30 10 sièges (limite + 1) → 400.
- API-31 9 sièges (limite) → 200, montant 9 × 15 TND.
- API-32 connexion avec le compte démo admin publié → 401.
- API-33 avis noté 6/5 → 400.
- API-34 rejeter une réservation confirmée → 409.

**Dossier « 9. Défauts connus »** (exclu de la régression)
- API-90 réserver sur le trajet 3 (bus 2) un siège du bus 1 [ANO-09] → **ÉCHEC** : 2 assertions (code 400 attendu, message explicite).
- API-91 inscription avec un e-mail invalide et un mot de passe d'un caractère [ANO-10] → **ÉCHEC** : 1 assertion (code 400 attendu).

**Évolution des échecs entre campagnes (assertions API)**

| Campagne | Requêtes / assertions | Échecs | Contexte |
|---|---|---:|---|
| C1 (semaine 8) | 25 / 49 | 13 | Version initiale |
| C1 bis | 25 / 49 | 9 | Après correction d'ANO-01 et ANO-02 |
| C2 avant correctifs | 36 / 69 | 25 | 11 tests ajoutés après l'exploration, exécutés avant correction pour prouver chaque défaut |
| C2 après correctifs | 36 / 69 | 3 | Restent ANO-09 et ANO-10 |
| Régression finale | 34 / 66 | 0 | Hors dossier « 9. Défauts connus » |

## 6. Tests d'interface (Playwright, Chromium, build de production) — 4/4 réussis

- **E2E-01** (7,5 s) :
  1. connexion de la passagère ;
  2. recherche Tunis → Sousse au 15/01/2030 ;
  3. choix du trajet 1 ;
  4. sièges 1, 2, 3 (en attente) et 5 désactivés ;
  5. sélection du siège 8 et confirmation ;
  6. billet complet : villes, siège 8, confirmed, numéro, nom, aucun « undefined » ;
  7. annulation depuis le tableau de bord ;
  8. le siège 8 redevient libre.
- **E2E-02a** (1,9 s) : des identifiants invalides affichent un message et l'utilisateur reste sur /login.
- **E2E-02b** (1,7 s) : les identifiants du compte démo administrateur ne sont plus affichés ni acceptés (ANO-12).
- **E2E-02c** (1,4 s) : un visiteur non connecté qui ouvre /booking/1 est redirigé vers /login.

Stabilité : 12 exécutions sur 12 réussies.

Incident d'automatisation : une page blanche au premier lancement, causée par le rechargement du serveur de développement Vite. Ce n'était pas un défaut de l'application ; les tests tournent désormais sur `vite build` + `vite preview`.

## 7. Test non fonctionnel : performance — 3/3 conformes

Protocole : 20 connexions simultanées pendant 20 s par scénario. Critères : 0 erreur, p97,5 < 500 ms, p99 < 1 000 ms.

| Scénario | Requêtes | Débit | p50 | p90 | p97,5 | p99 | Max | Erreurs | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| PERF-01 Recherche de trajets | 14 044 | 702 req/s | 28 ms | 35 ms | 40 ms | 45 ms | 71 ms | 0 | Conforme |
| PERF-02 Détail trajet + sièges | 11 892 | 595 req/s | 33 ms | 43 ms | 48 ms | 51 ms | 64 ms | 0 | Conforme |
| PERF-03 Mes réservations (authentifié) | 2 844 | 142 req/s | 137 ms | 160 ms | 209 ms | 232 ms | 272 ms | 0 | Conforme |

PERF-03 est plus lent pour deux raisons :
- la vérification JWT coûte environ 1,8 ms de calcul par requête ;
- la requête « mes réservations » enchaîne 6 jointures, avec une table temporaire et un tri.

Index recommandé : `booking(passenger_id, booking_date)`.

## 8. Couverture du code (Jest)

| Périmètre | Instructions | Branches | Fonctions | Lignes | Seuil |
|---|---:|---:|---:|---:|---|
| `src/services/` (5 fichiers) | 100 % | 100 % | 100 % | 100 % | ≥ 90 % |
| `bookingRepository.js` | 100 % | 75 % | 100 % | 100 % | ≥ 90 % des lignes |
| `busRepository.js` | 100 % | 83,3 % | 100 % | 100 % | ≥ 90 % des lignes |
| `index.js` (routes) | 37,9 % | 26,1 % | 26,5 % | 39,4 % | plancher ≥ 35 % |
| Global | 50,7 % | 45,4 % | 54,4 % | 52,3 % | — |

Le taux d'`index.js` sous-estime la couverture réelle des routes : Newman et Playwright les exercent dans un autre processus, que Jest n'instrumente pas.

## 9. Anomalies — 18 détectées, 15 corrigées et vérifiées

Chaque anomalie est reproduite par un test, exécuté en échec avant le correctif puis en succès après.

**Critiques (toutes corrigées)**
- ANO-02 : un client accède aux statistiques d'administration.
- ANO-03 : double vente d'un siège, y compris en simultané.
- ANO-12 : compte admin de démonstration publié sur la page de connexion.

**Majeures**
- Corrigées :
  - ANO-05 : transitions d'état non contrôlées ;
  - ANO-06 : annuler la réservation d'un autre renvoie 200 ;
  - ANO-07 : chevauchement de trajets non détecté ;
  - ANO-14 : sièges en attente affichés libres ;
  - ANO-15 : secret JWT par défaut ;
  - ANO-18 : « Ticket # undefined » sur le billet, trouvée par E2E-01.
- **Ouverte** : ANO-09, sièges enregistrés hors du bus du trajet. Sa correction nécessite une migration des données.

**Mineures**
- Corrigées :
  - ANO-01 : inscription sans nom → 500 ;
  - ANO-04 : trajet inexistant → 500 ;
  - ANO-08 : trajet sans prix → 500, dates illisibles acceptées ;
  - ANO-11 : plus de 9 sièges acceptés ;
  - ANO-13 : note d'avis hors de 1–5 acceptée ;
  - ANO-16 : bus sans opérateur → 500.
- **Ouvertes** :
  - ANO-10 : format de l'e-mail et longueur du mot de passe non contrôlés ;
  - ANO-17 : « Cancel » proposé sur un voyage passé.

## 10. Bilan et décision

- **Exigences** : 15/15 couvertes par au moins un test exécuté ; 13/15 satisfaites (EX-02 partiellement et EX-13 sont liées à ANO-10 et ANO-09) ; 5/5 exigences critiques satisfaites.
- **Critères de sortie** : S1 à S8 tous atteints.
  - Aucune anomalie critique ouverte ; une seule majeure ouverte, avec contournement et plan.
  - Régression à 100 %.
  - Couverture : services 100 %, dépôts 100 %, index.js 39,4 %.
  - Performance : p99 de 232 ms au pire.
- **Décision : validation conditionnelle.** Conditions :
  - C1 : `JWT_SECRET` fort en production, sans comptes démo ;
  - C2 : ne supprimer aucun siège ni bus portant des réservations ;
  - C3 : corriger ANO-09 et migrer les données ;
  - C4 : publier le dépôt et vérifier que la CI GitHub Actions passe au vert (elle n'a pas encore tourné sur GitHub).
- **Limites** :
  - jeu de données minimal ;
  - un seul navigateur ;
  - pas de test d'injection, de XSS ni de force brute ;
  - une seule mesure de performance par scénario ;
  - travail individuel, sans relecture croisée.
