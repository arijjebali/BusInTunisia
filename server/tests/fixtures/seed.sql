-- =====================================================================
-- Jeu de données de référence pour les tests (base bus_in_tunisia_test)
-- Minimal mais représentatif ; identifiants fixes => résultats reproductibles.
-- Mots de passe : admin.test=Admin123!  client*.test=Client123!  operator.test=Operator123!
-- =====================================================================

INSERT INTO user (id, email, roles, password, first_name, last_name, created_at, type, is_verified) VALUES
 (1, 'admin.test@bus.tn',    '["ROLE_ADMIN"]',    '$2b$10$4R3pG8mmwb/hW4hNPgY.QOK7K/UU/N9ySOhgaAsb97lyef5AiC9aS', 'Admin',    'Test',  '2026-01-01 00:00:00', 'admin',    1),
 (2, 'operator.test@bus.tn', '["ROLE_OPERATOR"]', '$2b$10$pEghOlr0Gd./2YwJ8/Ui3ue9guV7F39UYrMJ7ZUuODeYReEtd.cdy', 'Operateur','Test',  '2026-01-01 00:00:00', 'operator', 1),
 (3, 'client.test@bus.tn',   '["ROLE_USER"]',     '$2b$10$M.RmNKt89r8oGkU81FQaFu1gp6Non5FFea8KTrj9x99QQi0moscx2', 'Sami',     'Client','2026-01-01 00:00:00', 'client',   1),
 (4, 'client2.test@bus.tn',  '["ROLE_USER"]',     '$2b$10$M.RmNKt89r8oGkU81FQaFu1gp6Non5FFea8KTrj9x99QQi0moscx2', 'Leila',    'Client','2026-01-01 00:00:00', 'client',   1);

INSERT INTO city (id, name) VALUES (1,'Tunis'),(2,'Sousse'),(3,'Sfax'),(4,'Bizerte'),(5,'Nabeul');

INSERT INTO route (id, distance, duration, departure_city_id, arrival_city_id) VALUES
 (1, 140, '02:30:00', 1, 2),   -- Tunis -> Sousse
 (2, 270, '04:00:00', 1, 3);   -- Tunis -> Sfax

INSERT INTO bus (id, registration_number, capacity, type, operator_id) VALUES
 (1, 'TUN-1001', 40, 'Standard', 2),
 (2, 'TUN-1002', 40, 'VIP',      2),
 (3, 'TUN-1003', 30, 'Comfort',  2);  -- bus sans trajet (suppression autorisée)

-- Sièges : ids 1..40 pour le bus 1, 41..80 pour le bus 2
INSERT INTO seat (id, seat_number, bus_id)
 SELECT seq, CAST(seq AS CHAR), 1 FROM seq_1_to_40;
INSERT INTO seat (id, seat_number, bus_id)
 SELECT seq, CAST(seq - 40 AS CHAR), 2 FROM seq_41_to_80;

INSERT INTO trip (id, departure_time, arrival_time, price, route_id, bus_id) VALUES
 (1, '2030-01-15 08:00:00', '2030-01-15 10:30:00', 15, 1, 1),  -- futur
 (2, '2025-01-10 07:00:00', '2025-01-10 11:00:00', 25, 2, 2),  -- passé
 (3, '2030-01-15 14:00:00', '2030-01-15 18:00:00', 25, 2, 2);  -- futur

INSERT INTO booking (id, booking_date, status, total_amount, passenger_id, trip_id) VALUES
 (1, '2026-01-02 10:00:00', 'confirmed', 30, 3, 1),
 (2, '2026-01-02 10:05:00', 'pending',   15, 3, 1),
 (3, '2026-01-02 10:10:00', 'cancelled', 15, 3, 1),
 (4, '2025-01-01 09:00:00', 'confirmed', 25, 3, 2),  -- départ passé => "completed"
 (5, '2026-01-03 12:00:00', 'confirmed', 15, 4, 1);

INSERT INTO booking_seat (booking_id, seat_id) VALUES (1,1),(1,2),(2,3),(3,4),(4,41),(5,5);
