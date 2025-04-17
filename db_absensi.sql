-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: db_absensi
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `absensi`
--

DROP TABLE IF EXISTS `absensi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `absensi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `siswa_id` int NOT NULL,
  `tanggal` date NOT NULL,
  `status` enum('hadir','izin','sakit','alpha') NOT NULL,
  `keterangan` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_absensi` (`siswa_id`,`tanggal`),
  CONSTRAINT `absensi_ibfk_1` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `absensi`
--

LOCK TABLES `absensi` WRITE;
/*!40000 ALTER TABLE `absensi` DISABLE KEYS */;
INSERT INTO `absensi` VALUES (8,10,'2025-04-17','izin',NULL,'2025-04-17 07:54:12'),(9,12,'2025-04-17','hadir',NULL,'2025-04-17 07:54:13'),(10,13,'2025-04-17','izin',NULL,'2025-04-17 07:54:13'),(11,11,'2025-04-17','izin',NULL,'2025-04-17 07:54:14'),(13,15,'2025-04-17','izin',NULL,'2025-04-17 07:54:15');
/*!40000 ALTER TABLE `absensi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `guru`
--

DROP TABLE IF EXISTS `guru`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `guru` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('superadmin','guru') NOT NULL DEFAULT 'guru',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `guru`
--

LOCK TABLES `guru` WRITE;
/*!40000 ALTER TABLE `guru` DISABLE KEYS */;
INSERT INTO `guru` VALUES (2,'Administrator','admin','$2b$10$ZH9yNQecT8PKRJnfGjxdmOu9Xs1QLHKpuePhvjk8MvR0CvBYjP1fS','superadmin','2025-04-17 03:30:56'),(3,'galang','guru','$2a$10$Ytvyl55mSwDgECwqeOaD7ezHYi1n3aZ0cNGnKamyRS63jo8Py99yy','guru','2025-04-17 03:37:37'),(4,'galang','galang','$2a$10$AZI4p2QfHngkIrpgaIAMuufazvOYxiVF9WwxXrtDakLsYP78lsIRW','guru','2025-04-17 09:36:08');
/*!40000 ALTER TABLE `guru` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kelas`
--

DROP TABLE IF EXISTS `kelas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kelas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_kelas` varchar(50) NOT NULL,
  `wali_kelas_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `wali_kelas_id` (`wali_kelas_id`),
  CONSTRAINT `kelas_ibfk_1` FOREIGN KEY (`wali_kelas_id`) REFERENCES `guru` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kelas`
--

LOCK TABLES `kelas` WRITE;
/*!40000 ALTER TABLE `kelas` DISABLE KEYS */;
INSERT INTO `kelas` VALUES (1,'Kelas 1',NULL,'2025-04-17 03:27:12'),(2,'Kelas 2',NULL,'2025-04-17 03:27:12'),(3,'Kelas 3',NULL,'2025-04-17 03:27:12'),(4,'Kelas 4',NULL,'2025-04-17 03:27:12'),(5,'Kelas 5',NULL,'2025-04-17 03:27:12'),(6,'Kelas 6',NULL,'2025-04-17 03:27:12');
/*!40000 ALTER TABLE `kelas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `siswa`
--

DROP TABLE IF EXISTS `siswa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `siswa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nis` varchar(20) NOT NULL,
  `nisn` varchar(10) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `kelas_id` int NOT NULL,
  `jenis_kelamin` enum('L','P') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nis` (`nis`),
  UNIQUE KEY `unique_nisn` (`nisn`),
  KEY `kelas_id` (`kelas_id`),
  CONSTRAINT `siswa_ibfk_1` FOREIGN KEY (`kelas_id`) REFERENCES `kelas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `siswa`
--

LOCK TABLES `siswa` WRITE;
/*!40000 ALTER TABLE `siswa` DISABLE KEYS */;
INSERT INTO `siswa` VALUES (10,'2024001','1234567890','Ahmad Fauzi',4,'L','2025-04-17 07:41:10'),(11,'2024002','1234567891','Siti Nurhaliza',6,'P','2025-04-17 07:41:10'),(12,'2024003','1234567892','Muhammad Rizki',1,'L','2025-04-17 07:41:10'),(13,'2024004','1234567893','Putri Rahayu',2,'P','2025-04-17 07:41:10'),(15,'123461','1234567895','Contoh Nama Siswa 6',6,'L','2025-04-17 07:41:15');
/*!40000 ALTER TABLE `siswa` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-04-17 17:42:23
