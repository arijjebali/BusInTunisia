
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(180) NOT NULL,
  `roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`roles`)),
  `password` varchar(255) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `type` varchar(255) NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `is_verified` tinyint(4) NOT NULL,
  `activation_token` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_IDENTIFIER_EMAIL` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `city` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `route` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `distance` double DEFAULT NULL,
  `duration` time DEFAULT NULL,
  `departure_city_id` int(11) NOT NULL,
  `arrival_city_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_2C42079918B251E` (`departure_city_id`),
  KEY `IDX_2C420794067ACA7` (`arrival_city_id`),
  CONSTRAINT `FK_2C420794067ACA7` FOREIGN KEY (`arrival_city_id`) REFERENCES `city` (`id`),
  CONSTRAINT `FK_2C42079918B251E` FOREIGN KEY (`departure_city_id`) REFERENCES `city` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `bus` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `registration_number` varchar(255) NOT NULL,
  `capacity` int(11) NOT NULL,
  `type` varchar(255) NOT NULL,
  `operator_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_2F566B6938CEDFBE` (`registration_number`),
  KEY `IDX_2F566B69584598A3` (`operator_id`),
  CONSTRAINT `FK_2F566B69584598A3` FOREIGN KEY (`operator_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `seat` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `seat_number` varchar(255) NOT NULL,
  `bus_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_3D5C36662546731D` (`bus_id`),
  CONSTRAINT `FK_3D5C36662546731D` FOREIGN KEY (`bus_id`) REFERENCES `bus` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `trip` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `departure_time` datetime NOT NULL,
  `arrival_time` datetime NOT NULL,
  `price` double NOT NULL,
  `route_id` int(11) NOT NULL,
  `bus_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_7656F53B34ECB4E6` (`route_id`),
  KEY `IDX_7656F53B2546731D` (`bus_id`),
  CONSTRAINT `FK_7656F53B2546731D` FOREIGN KEY (`bus_id`) REFERENCES `bus` (`id`),
  CONSTRAINT `FK_7656F53B34ECB4E6` FOREIGN KEY (`route_id`) REFERENCES `route` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `booking` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_date` datetime NOT NULL,
  `status` varchar(50) NOT NULL,
  `total_amount` double NOT NULL,
  `passenger_id` int(11) NOT NULL,
  `trip_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_E00CEDDE4502E565` (`passenger_id`),
  KEY `IDX_E00CEDDEA5BC2E0E` (`trip_id`),
  CONSTRAINT `FK_E00CEDDE4502E565` FOREIGN KEY (`passenger_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_E00CEDDEA5BC2E0E` FOREIGN KEY (`trip_id`) REFERENCES `trip` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `booking_seat` (
  `booking_id` int(11) NOT NULL,
  `seat_id` int(11) NOT NULL,
  PRIMARY KEY (`booking_id`,`seat_id`),
  KEY `IDX_25CD14283301C60` (`booking_id`),
  KEY `IDX_25CD1428C1DAFE35` (`seat_id`),
  CONSTRAINT `FK_25CD14283301C60` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_25CD1428C1DAFE35` FOREIGN KEY (`seat_id`) REFERENCES `seat` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `group_trip` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `passenger_id` int(11) NOT NULL,
  `departure_city_id` int(11) NOT NULL,
  `arrival_city_id` int(11) NOT NULL,
  `travel_date` date NOT NULL,
  `preferred_time` time DEFAULT NULL,
  `people_count` int(11) NOT NULL,
  `trip_type` varchar(50) DEFAULT NULL,
  `bus_pref` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `estimated_price` decimal(10,2) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `passenger_id` (`passenger_id`),
  KEY `departure_city_id` (`departure_city_id`),
  KEY `arrival_city_id` (`arrival_city_id`),
  CONSTRAINT `group_trip_ibfk_1` FOREIGN KEY (`passenger_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_trip_ibfk_2` FOREIGN KEY (`departure_city_id`) REFERENCES `city` (`id`),
  CONSTRAINT `group_trip_ibfk_3` FOREIGN KEY (`arrival_city_id`) REFERENCES `city` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `review` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `passenger_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `trip_id` (`trip_id`),
  KEY `passenger_id` (`passenger_id`),
  CONSTRAINT `review_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trip` (`id`) ON DELETE CASCADE,
  CONSTRAINT `review_ibfk_2` FOREIGN KEY (`passenger_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `ticket` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_code` varchar(255) NOT NULL,
  `qr_code` varchar(255) DEFAULT NULL,
  `issue_date` datetime NOT NULL,
  `booking_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_97A0ADA345CE25A0` (`ticket_code`),
  UNIQUE KEY `UNIQ_97A0ADA33301C60` (`booking_id`),
  CONSTRAINT `FK_97A0ADA33301C60` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
CREATE TABLE `payment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `amount` double NOT NULL,
  `payment_date` datetime NOT NULL,
  `method` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL,
  `booking_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_6D28840D3301C60` (`booking_id`),
  CONSTRAINT `FK_6D28840D3301C60` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


