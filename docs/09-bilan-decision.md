# 9. Bilan de la campagne, limites, risques résiduels et décision de livraison

## 9.1 Bilan chiffré

| Indicateur | Valeur |
|---|---|
| Exigences couvertes / satisfaites | 15 / 15 couvertes · 13 / 15 satisfaites · 5 / 5 critiques satisfaites |
| Cas de test documentés | 24 |
| Tests automatisés exécutés | 68 unitaires · 29 intégration · 36 requêtes API (69 assertions) · 4 E2E · 3 scénarios de charge |
| Anomalies détectées | 18 (3 critiques, 7 majeures, 8 mineures, 0 bloquante) |
| Anomalies corrigées et vérifiées | 15, dont les 3 critiques |
| Anomalies ouvertes | 3 : ANO-09 (majeure), ANO-10 et ANO-17 (mineures) |
| Suite de régression | 100 % de réussite (97 Jest + 66 assertions API + 4 E2E) |
| Couverture | services 100 % · dépôts 100 % des lignes · `index.js` 39 % des lignes (routes couvertes en plus par Newman et Playwright) |
| Performance | 3 / 3 scénarios conformes, p99 ≤ 232 ms sous 20 clients simultanés |

### Ce que la campagne a apporté

- **Trois failles critiques** auraient été livrées sans elle : accès de tout visiteur à l'administration via le compte démo publié (ANO-12), accès d'un client aux statistiques (ANO-02), double vente d'un siège (ANO-03).
- La logique métier, auparavant dispersée dans les routes, est centralisée dans des services couverts à 100 %. Les routes s'appuient dessus, ce qui a corrigé d'un coup quatre transitions illégales (ANO-05).
- Les techniques de conception ont chacune trouvé des défauts : **valeurs limites** (ANO-11, ANO-13), **table de décision** (ANO-08), **transitions d'état** (ANO-05), **exploration** (ANO-09, ANO-12, ANO-14). L'automatisation du **parcours utilisateur** a trouvé ANO-18, qu'aucun test d'API ne pouvait voir.

## 9.2 Évaluation des critères de sortie

| # | Critère | Seuil | Résultat | Statut |
|---|---|---|---|---|
| S1 | Exigences critiques couvertes par un test exécuté | 100 % | 5 / 5 | ✅ |
| S2 | Anomalies bloquantes ou critiques ouvertes | 0 | 0 | ✅ |
| S3 | Anomalies majeures ouvertes | ≤ 1, avec contournement et plan | 1 (ANO-09), contournement et plan définis (§ 9.5) | ✅ |
| S4 | Réussite de la suite de régression | 100 % | 100 % | ✅ |
| S5 | Couverture `src/services/**` | ≥ 90 % | 100 % | ✅ |
| S6 | Couverture `src/repositories/**` | ≥ 90 % des lignes | 100 % | ✅ |
| S7 | Plancher de couverture `index.js` | ≥ 35 % des lignes | 39,4 % | ✅ |
| S8 | Performance | 0 erreur, p97,5 < 500 ms, p99 < 1 s | 0 erreur, 209 ms, 232 ms (pire cas) | ✅ |

## 9.3 Limites des tests

- **Données** : jeu de test minimal (5 réservations). Il garantit la reproductibilité, mais ne révèle ni les problèmes de volume ni les incohérences des données réelles. ANO-09 n'a été mesurée dans toute son ampleur qu'en consultant la base de développement.
- **Couverture des routes** non mesurée pour les tests Newman et Playwright (processus séparés, non instrumentés).
- **Hors périmètre, donc non testés** : voyages de groupe, tableau de bord opérateur, CRUD des routes et des villes, modification et suppression de trajets par l'API, paiement (inexistant).
- **Navigateur unique** (Chromium, bureau) ; ni mobile, ni Firefox, ni Safari ; accessibilité non évaluée.
- **Sécurité** limitée à la revue de code et aux contrôles d'accès : pas de test d'injection, de XSS, de force brute (aucune limitation du nombre de tentatives de connexion n'a été observée), ni d'audit des dépendances (`npm audit` signale des vulnérabilités, non analysées).
- **Performance** : une seule mesure par scénario, client et serveur sur la même machine.
- **Historique des statuts** : l'exigence « Suivi » de RéclaGest n'a pas d'équivalent dans BusInTunisia ; elle n'a donc pas pu être testée.
- **Travail individuel** : la personne qui a conçu les tests a aussi corrigé le code. Le risque de biais est réduit par la règle « test en échec avant le correctif », mais aucune relecture croisée n'a eu lieu.
- La **CI** n'a pas encore été exécutée sur GitHub (dépôt non publié).

## 9.4 Risques résiduels

| Risque | Niveau | Origine | Mesure |
|---|---|---|---|
| Données de sièges incohérentes ; perte de sièges réservés en cascade en cas de suppression de sièges du bus 1 | **Moyen** | ANO-09 | Contournement : aucune suppression de siège ou de bus portant des réservations ; correction et migration avant toute évolution du parc |
| Comptes créés avec un e-mail invalide ou un mot de passe faible | Faible | ANO-10 | Règle à valider avec le client |
| Passager dérouté par un message générique en annulant un voyage passé | Faible | ANO-17 | Correction d'IHM planifiable |
| Attaque par force brute sur la connexion | Moyen | Hors périmètre, constaté | Ajouter une limitation des tentatives |
| Dégradation des performances sur un volume réel | Faible | Limite du test | Test de charge avec données volumineuses, index recommandé |

## 9.5 Décision : **validation conditionnelle**

Selon les principes de l'énoncé (§ 9) :

- **Le refus n'est pas justifié** : aucun défaut critique ni problème de sécurité majeur ne reste ouvert ; les trois anomalies critiques sont corrigées et protégées par des tests de régression ; toutes les exigences critiques sont satisfaites.
- **La validation simple n'est pas justifiée non plus** : une anomalie majeure (ANO-09) reste ouverte et l'exigence EX-13 n'est pas satisfaite. Pour le passager, son effet est invisible (plan, billet et contrôle de double vente restent cohérents sur un même trajet), mais elle corrompt les données et expose à une perte de données en cascade.

La version testée est donc **livrable sous les conditions suivantes** :

| # | Condition | Responsable | Échéance |
|---|---|---|---|
| C1 | Configurer la production avec un `JWT_SECRET` fort et sans `ENABLE_DEMO_ACCOUNTS` ni `VITE_SHOW_DEMO_ACCOUNTS` (conditions de validité des correctifs ANO-12 et ANO-15) | Exploitation | Avant la mise en ligne |
| C2 | Interdire toute suppression de siège ou de bus portant des réservations, tant que ANO-09 n'est pas corrigée | Administration | Dès la mise en ligne |
| C3 | Corriger ANO-09 (conversion numéro de siège → `seat.id` du bus du trajet) et migrer les données existantes ; faire passer API-90 dans la suite de régression | Développement + responsable des données | Version suivante, au plus tard avant l'ajout d'un nouveau bus |
| C4 | Publier le dépôt, vérifier que la CI GitHub Actions passe au vert | Équipe projet | Avant la mise en ligne |

## 9.6 Recommandations

1. **Corriger ANO-17 et ANO-10** dans la version suivante (faible effort ; tests déjà écrits pour ANO-10).
2. **Limiter les tentatives de connexion** et lancer un audit de sécurité ciblé (injection, XSS, dépendances).
3. **Historiser les changements de statut** (table `booking_history`) pour répondre à l'exigence de suivi du référentiel et faciliter le support.
4. **Instrumenter le serveur lancé par Newman** (par exemple avec `c8`) pour mesurer la couverture réelle des routes.
5. **Étendre la régression E2E** à l'administration (validation d'une réservation, création d'un trajet) et à un second navigateur.
6. **Rejouer le test de charge** sur un jeu de données réaliste et ajouter l'index `booking(passenger_id, booking_date)`.
