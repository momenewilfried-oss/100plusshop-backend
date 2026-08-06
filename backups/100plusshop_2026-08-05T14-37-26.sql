-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: 100plusshop_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categorie`
--

DROP TABLE IF EXISTS `categorie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categorie` (
  `id_categorie` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id_categorie`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorie`
--

LOCK TABLES `categorie` WRITE;
/*!40000 ALTER TABLE `categorie` DISABLE KEYS */;
INSERT INTO `categorie` VALUES (1,'Catégorie A',NULL),(2,'Catégorie B',NULL);
/*!40000 ALTER TABLE `categorie` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client`
--

DROP TABLE IF EXISTS `client`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `client` (
  `id_client` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `date_creation` datetime DEFAULT NULL,
  `uuid_local` varchar(36) DEFAULT NULL,
  `synced` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id_client`),
  UNIQUE KEY `uuidLocal` (`uuid_local`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client`
--

LOCK TABLES `client` WRITE;
/*!40000 ALTER TABLE `client` DISABLE KEYS */;
INSERT INTO `client` VALUES (1,'Tene','Nom','0600000000','tene@example.com','2026-07-24 16:57:18',NULL,0),(2,'Lefebvre','Sophie','0612345678','sophie.lefebvre@email.fr','2026-07-27 16:51:28',NULL,0),(3,'Test','Client','0600000000','test.client@example.com','2026-07-28 11:25:58',NULL,0),(4,'omo','jules','2222222','omo@gmail.com','2026-07-28 16:27:27',NULL,0);
/*!40000 ALTER TABLE `client` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `depense`
--

DROP TABLE IF EXISTS `depense`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `depense` (
  `id_depense` int(11) NOT NULL AUTO_INCREMENT,
  `libelle` varchar(255) NOT NULL,
  `montant` decimal(10,2) NOT NULL,
  `date_depense` datetime DEFAULT NULL,
  `categorie` varchar(100) DEFAULT NULL,
  `id_enregistre_par` int(11) DEFAULT NULL,
  `uuid_local` varchar(36) DEFAULT NULL,
  `synced` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id_depense`),
  UNIQUE KEY `uuidLocal` (`uuid_local`),
  KEY `enregistrePar` (`id_enregistre_par`),
  CONSTRAINT `depense_ibfk_1` FOREIGN KEY (`id_enregistre_par`) REFERENCES `utilisateur` (`id_utilisateur`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `depense`
--

LOCK TABLES `depense` WRITE;
/*!40000 ALTER TABLE `depense` DISABLE KEYS */;
INSERT INTO `depense` VALUES (4,'loyer boutique',15000.00,'2026-08-03 19:14:28','loyer',3,NULL,0),(5,'lumiere',3000.00,'2026-08-03 19:15:02','loyer',3,NULL,0),(6,'impot',15000.00,'2026-08-03 19:15:24','autre',3,NULL,0);
/*!40000 ALTER TABLE `depense` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detail_achat`
--

DROP TABLE IF EXISTS `detail_achat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `detail_achat` (
  `id_detail_achat` int(11) NOT NULL AUTO_INCREMENT,
  `id_facture_achat` int(11) DEFAULT NULL,
  `id_variante` int(11) DEFAULT NULL,
  `quantite` int(11) NOT NULL,
  `prix_achat` decimal(10,2) DEFAULT NULL,
  `sous_total` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_detail_achat`),
  KEY `factureAchat` (`id_facture_achat`),
  KEY `variante` (`id_variante`),
  CONSTRAINT `detail_achat_ibfk_1` FOREIGN KEY (`id_facture_achat`) REFERENCES `facture_achat` (`id_facture_achat`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `detail_achat_ibfk_2` FOREIGN KEY (`id_variante`) REFERENCES `variante` (`id_variante`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detail_achat`
--

LOCK TABLES `detail_achat` WRITE;
/*!40000 ALTER TABLE `detail_achat` DISABLE KEYS */;
INSERT INTO `detail_achat` VALUES (1,2,2,10,12.50,125.00),(2,3,2,10,2000.00,20000.00);
/*!40000 ALTER TABLE `detail_achat` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detail_vente`
--

DROP TABLE IF EXISTS `detail_vente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `detail_vente` (
  `id_detail` int(11) NOT NULL AUTO_INCREMENT,
  `id_vente` int(11) DEFAULT NULL,
  `id_variante` int(11) DEFAULT NULL,
  `quantite` int(11) NOT NULL,
  `prix_unitaire` decimal(10,2) DEFAULT NULL,
  `remise` decimal(10,2) DEFAULT 0.00,
  `sous_total` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_detail`),
  KEY `vente` (`id_vente`),
  KEY `variante` (`id_variante`),
  CONSTRAINT `detail_vente_ibfk_1` FOREIGN KEY (`id_vente`) REFERENCES `vente` (`id_vente`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `detail_vente_ibfk_2` FOREIGN KEY (`id_variante`) REFERENCES `variante` (`id_variante`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detail_vente`
--

LOCK TABLES `detail_vente` WRITE;
/*!40000 ALTER TABLE `detail_vente` DISABLE KEYS */;
INSERT INTO `detail_vente` VALUES (11,14,2,2,5000.00,0.00,10000.00),(12,15,2,2,45.00,0.00,90.00),(13,16,2,1,45.00,0.00,45.00),(14,18,2,1,59.90,0.00,59.90),(15,19,4,1,59.90,0.00,59.90),(16,20,8,5,10000.00,0.00,50000.00),(17,21,8,5,10000.00,0.00,50000.00),(18,22,9,4,10000.00,0.00,40000.00),(19,23,8,1,10000.00,0.00,10000.00),(20,24,8,1,10000.00,1000.00,9000.00),(21,25,9,1,10000.00,1000.00,9000.00),(22,26,8,1,10000.00,1000.00,9000.00),(23,27,8,1,10000.00,1000.00,9000.00),(24,28,8,1,10000.00,1000.00,9000.00),(25,29,8,1,10000.00,1000.00,9000.00),(26,30,8,1,10000.00,1000.00,9000.00),(27,31,8,1,10000.00,1000.00,9000.00),(28,32,10,3,12000.00,0.00,36000.00),(29,33,10,1,12000.00,0.00,12000.00),(30,34,12,1,7000.00,0.00,7000.00);
/*!40000 ALTER TABLE `detail_vente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `facture`
--

DROP TABLE IF EXISTS `facture`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `facture` (
  `id_facture` int(11) NOT NULL AUTO_INCREMENT,
  `numero` varchar(100) NOT NULL,
  `date_facture` datetime DEFAULT NULL,
  `id_vente` int(11) DEFAULT NULL,
  `montant_total` decimal(10,2) DEFAULT NULL,
  `chemin_pdf` varchar(255) DEFAULT NULL,
  `statut` varchar(50) DEFAULT NULL,
  `uuid_local` varchar(36) DEFAULT NULL,
  `synced` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id_facture`),
  UNIQUE KEY `numero` (`numero`),
  UNIQUE KEY `vente` (`id_vente`),
  UNIQUE KEY `uuidLocal` (`uuid_local`),
  CONSTRAINT `facture_ibfk_1` FOREIGN KEY (`id_vente`) REFERENCES `vente` (`id_vente`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `facture`
--

LOCK TABLES `facture` WRITE;
/*!40000 ALTER TABLE `facture` DISABLE KEYS */;
INSERT INTO `facture` VALUES (1,'FACT-20260727-6872','2026-07-27 20:43:36',15,85.00,'/factures/FACT-20260727-6872.pdf','Payée',NULL,0),(2,'FACT-20260728-6244','2026-07-28 17:06:17',18,59.90,'/factures/FACT-20260728-6244.pdf','Payée',NULL,0),(3,'FACT-20260730-4326','2026-07-30 00:36:43',19,59.90,NULL,'Payée',NULL,0),(4,'FACT-20260730-1812','2026-07-30 00:37:47',20,50000.00,'/factures/FACT-20260730-1812.pdf','Payée',NULL,0),(5,'FACT-20260730-6742','2026-07-30 00:40:47',21,50000.00,'/factures/FACT-20260730-6742.pdf','Payée',NULL,0),(6,'FACT-20260730-4109','2026-07-30 09:03:36',22,40000.00,'/factures/FACT-20260730-4109.pdf','Payée',NULL,0),(7,'FACT-20260730-2648','2026-07-30 09:44:22',24,9000.00,'/factures/FACT-20260730-2648.pdf','Payée',NULL,0),(8,'FACT-20260730-5945','2026-07-30 22:24:13',25,9000.00,'/factures/FACT-20260730-5945.pdf','Payée',NULL,0),(9,'FACT-20260730-2201','2026-07-30 22:42:06',26,9000.00,'/factures/FACT-20260730-2201.pdf','Payée',NULL,0),(10,'FACT-20260731-9997','2026-07-31 12:31:31',27,9000.00,'/factures/FACT-20260731-9997.pdf','Payée',NULL,0),(11,'FACT-20260802-3372','2026-08-02 03:06:15',29,9000.00,'/factures/FACT-20260802-3372.pdf','Payée',NULL,0),(12,'FACT-20260803-2636','2026-08-03 16:05:56',30,9000.00,NULL,'Payée',NULL,0),(13,'FACT-20260803-5189','2026-08-03 16:55:31',31,9000.00,'/factures/FACT-20260803-5189.pdf','Payée',NULL,0),(14,'FACT-20260803-5571','2026-08-03 18:51:48',32,36000.00,'/factures/FACT-20260803-5571.pdf','Payée',NULL,0),(15,'FACT-20260804-7458','2026-08-04 00:01:31',33,12000.00,'/factures/FACT-20260804-7458.pdf','Payée',NULL,0),(16,'FACT-20260804-5585','2026-08-04 00:27:41',34,7000.00,'/factures/FACT-20260804-5585.pdf','Payée',NULL,0);
/*!40000 ALTER TABLE `facture` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `facture_achat`
--

DROP TABLE IF EXISTS `facture_achat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `facture_achat` (
  `id_facture_achat` int(11) NOT NULL AUTO_INCREMENT,
  `id_fournisseur` int(11) DEFAULT NULL,
  `numero` varchar(100) NOT NULL,
  `date_achat` datetime DEFAULT NULL,
  `montant_total` decimal(10,2) DEFAULT NULL,
  `statut` varchar(50) DEFAULT NULL,
  `uuid_local` varchar(36) DEFAULT NULL,
  `synced` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id_facture_achat`),
  UNIQUE KEY `uuidLocal` (`uuid_local`),
  KEY `fournisseur` (`id_fournisseur`),
  CONSTRAINT `facture_achat_ibfk_1` FOREIGN KEY (`id_fournisseur`) REFERENCES `fournisseur` (`id_fournisseur`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `facture_achat`
--

LOCK TABLES `facture_achat` WRITE;
/*!40000 ALTER TABLE `facture_achat` DISABLE KEYS */;
INSERT INTO `facture_achat` VALUES (2,1,'ACH-20260728-2157','2026-07-28 21:14:37',125.00,'recue',NULL,0),(3,1,'ACH-20260729-4306','2026-07-29 21:47:50',20000.00,'recue',NULL,0);
/*!40000 ALTER TABLE `facture_achat` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fournisseur`
--

DROP TABLE IF EXISTS `fournisseur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fournisseur` (
  `id_fournisseur` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(150) NOT NULL,
  `contact` varchar(100) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `adresse` text DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id_fournisseur`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fournisseur`
--

LOCK TABLES `fournisseur` WRITE;
/*!40000 ALTER TABLE `fournisseur` DISABLE KEYS */;
INSERT INTO `fournisseur` VALUES (1,'Fournisseur A',NULL,'0600000000','Adresse','contact@fournisseur.com'),(2,'Fournisseur A',NULL,'0600000000','Adresse test','contact@fournisseur.com'),(3,'Textile Pro',NULL,'0102030405',NULL,'contact@textilepro.fr'),(4,'fournisseur chaussure','624253101','624253101','yaounde carriere','fournisseur@.com');
/*!40000 ALTER TABLE `fournisseur` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `marque`
--

DROP TABLE IF EXISTS `marque`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `marque` (
  `id_marque` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id_marque`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `marque`
--

LOCK TABLES `marque` WRITE;
/*!40000 ALTER TABLE `marque` DISABLE KEYS */;
INSERT INTO `marque` VALUES (1,'Marque A',NULL),(2,'Marque B',NULL);
/*!40000 ALTER TABLE `marque` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mouvement_stock`
--

DROP TABLE IF EXISTS `mouvement_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mouvement_stock` (
  `idMouvement` int(11) NOT NULL AUTO_INCREMENT,
  `variante` int(11) NOT NULL,
  `typeMouvement` varchar(50) NOT NULL,
  `quantite` int(11) NOT NULL,
  `motif` varchar(255) DEFAULT NULL,
  `documentType` varchar(100) DEFAULT NULL,
  `documentId` int(11) DEFAULT NULL,
  `dateMouvement` datetime DEFAULT current_timestamp(),
  `uuidLocal` varchar(36) DEFAULT NULL,
  `synced` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`idMouvement`),
  UNIQUE KEY `uuidLocal` (`uuidLocal`),
  KEY `variante` (`variante`),
  CONSTRAINT `mouvement_stock_ibfk_1` FOREIGN KEY (`variante`) REFERENCES `variante` (`id_variante`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mouvement_stock`
--

LOCK TABLES `mouvement_stock` WRITE;
/*!40000 ALTER TABLE `mouvement_stock` DISABLE KEYS */;
INSERT INTO `mouvement_stock` VALUES (1,2,'sortie',2,'vente','vente',14,'2026-07-27 15:17:59',NULL,0),(2,2,'sortie',2,'vente','vente',15,'2026-07-27 15:30:42',NULL,0),(3,2,'entree',2,'retour','vente',14,'2026-07-27 15:37:49',NULL,0),(4,2,'sortie',1,'vente','vente',16,'2026-07-27 22:44:09',NULL,0),(5,2,'entree',1,'retour','vente',16,'2026-07-28 11:08:09',NULL,0),(6,2,'entree',5,'Réapprovisionnement test','manuel',NULL,'2026-07-28 11:26:45',NULL,0),(7,2,'sortie',1,'vente','vente',18,'2026-07-28 16:57:57',NULL,0),(8,2,'entree',8,'livraison','manuel',NULL,'2026-07-28 19:58:25',NULL,0),(9,2,'entree',10,'achat fournisseur','achat',2,'2026-07-28 21:14:37',NULL,0),(10,2,'entree',10,'achat fournisseur','achat',3,'2026-07-29 21:47:50',NULL,0),(11,4,'sortie',1,'vente','vente',19,'2026-07-29 23:09:53',NULL,0),(12,8,'sortie',5,'vente','vente',20,'2026-07-30 00:37:37',NULL,0),(13,8,'sortie',5,'vente','vente',21,'2026-07-30 00:39:50',NULL,0),(14,9,'sortie',4,'vente','vente',22,'2026-07-30 09:03:23',NULL,0),(15,8,'sortie',1,'vente','vente',23,'2026-07-30 09:11:46',NULL,0),(16,8,'sortie',1,'vente','vente',24,'2026-07-30 09:44:03',NULL,0),(17,9,'sortie',1,'vente','vente',25,'2026-07-30 22:24:02',NULL,0),(18,8,'sortie',1,'vente','vente',26,'2026-07-30 22:41:47',NULL,0),(19,8,'sortie',1,'vente','vente',27,'2026-07-31 12:31:13',NULL,0),(20,8,'sortie',1,'vente','vente',28,'2026-07-31 17:39:34',NULL,0),(21,8,'sortie',1,'vente','vente',29,'2026-08-02 03:06:15',NULL,0),(22,8,'sortie',1,'vente','vente',30,'2026-08-03 16:05:39',NULL,0),(23,8,'sortie',1,'vente','vente',31,'2026-08-03 16:55:28',NULL,0),(24,10,'sortie',3,'vente','vente',32,'2026-08-03 18:51:45',NULL,0),(25,10,'entree',3,'retour','vente',32,'2026-08-03 20:36:38',NULL,0),(26,10,'sortie',1,'vente','vente',33,'2026-08-04 00:01:29',NULL,0),(27,12,'sortie',1,'vente','vente',34,'2026-08-04 00:27:39',NULL,0);
/*!40000 ALTER TABLE `mouvement_stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `paiement`
--

DROP TABLE IF EXISTS `paiement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `paiement` (
  `idPaiement` int(11) NOT NULL AUTO_INCREMENT,
  `vente` int(11) NOT NULL,
  `montant` decimal(10,2) NOT NULL,
  `typePaiement` varchar(100) NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `datePaiement` datetime DEFAULT current_timestamp(),
  `uuidLocal` varchar(36) DEFAULT NULL,
  `synced` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`idPaiement`),
  UNIQUE KEY `uuidLocal` (`uuidLocal`),
  KEY `vente` (`vente`),
  CONSTRAINT `paiement_ibfk_1` FOREIGN KEY (`vente`) REFERENCES `vente` (`id_vente`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `paiement`
--

LOCK TABLES `paiement` WRITE;
/*!40000 ALTER TABLE `paiement` DISABLE KEYS */;
/*!40000 ALTER TABLE `paiement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `produit`
--

DROP TABLE IF EXISTS `produit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `produit` (
  `id_produit` int(11) NOT NULL AUTO_INCREMENT,
  `reference` varchar(100) NOT NULL,
  `nom` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `id_marque` int(11) DEFAULT NULL,
  `id_categorie` int(11) DEFAULT NULL,
  `matiere` varchar(100) DEFAULT NULL,
  `genre` varchar(50) DEFAULT NULL,
  `saison` varchar(50) DEFAULT NULL,
  `prix_achat` decimal(10,2) DEFAULT NULL,
  `prix_vente` decimal(10,2) DEFAULT NULL,
  `seuil_alerte` int(11) DEFAULT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `id_fournisseur` int(11) DEFAULT NULL,
  `uuid_local` varchar(36) DEFAULT NULL,
  `synced` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id_produit`),
  UNIQUE KEY `reference` (`reference`),
  UNIQUE KEY `uuidLocal` (`uuid_local`),
  KEY `marque` (`id_marque`),
  KEY `categorie` (`id_categorie`),
  KEY `fournisseur` (`id_fournisseur`),
  CONSTRAINT `produit_ibfk_1` FOREIGN KEY (`id_marque`) REFERENCES `marque` (`id_marque`) ON UPDATE CASCADE,
  CONSTRAINT `produit_ibfk_2` FOREIGN KEY (`id_categorie`) REFERENCES `categorie` (`id_categorie`) ON UPDATE CASCADE,
  CONSTRAINT `produit_ibfk_3` FOREIGN KEY (`id_fournisseur`) REFERENCES `fournisseur` (`id_fournisseur`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `produit`
--

LOCK TABLES `produit` WRITE;
/*!40000 ALTER TABLE `produit` DISABLE KEYS */;
INSERT INTO `produit` VALUES (3,'REF001','Robe Été Fleurie - Nouvelle collection','Description',1,1,NULL,NULL,NULL,20.00,64.90,4,NULL,1,NULL,0),(6,'REF-ROBE-001','Robe Été Fleurie','Robe légère pour l\'été',1,1,'Coton','Femme','Été',25.00,59.90,5,NULL,1,NULL,0),(7,'REF-TEST-10','Jupe plissée',NULL,1,1,NULL,NULL,NULL,20.00,49.90,5,NULL,1,NULL,0),(9,'REF-00030','maillot cameroun','maillot fotball',1,2,'coton','homme/femme','saison seche',7000.00,10000.00,20,NULL,1,NULL,0),(10,'ref2456','pantalon boyfriend','pantalon pour yor',2,2,'jean','homme','saison seche/pluvieuse',8000.00,12000.00,5,NULL,3,NULL,0),(11,'ref888','jeans',NULL,1,1,'jean','homme/femme','saison seche/pluvieuse',4000.00,7000.00,5,NULL,1,NULL,0);
/*!40000 ALTER TABLE `produit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotion`
--

DROP TABLE IF EXISTS `promotion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `promotion` (
  `id_promotion` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `valeur` decimal(10,2) NOT NULL,
  `date_debut` datetime DEFAULT NULL,
  `date_fin` datetime DEFAULT NULL,
  `statut` varchar(50) DEFAULT NULL,
  `uuidLocal` varchar(36) DEFAULT NULL,
  `synced` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id_promotion`),
  UNIQUE KEY `uuidLocal` (`uuidLocal`),
  KEY `idx_promo_dates` (`statut`,`date_debut`,`date_fin`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotion`
--

LOCK TABLES `promotion` WRITE;
/*!40000 ALTER TABLE `promotion` DISABLE KEYS */;
INSERT INTO `promotion` VALUES (1,'Soldes été','pourcentage',10.00,'2026-07-01 00:00:00','2026-08-31 23:59:59','active',NULL,0),(2,'solde pantalon','pourcentage',12.00,'2026-08-12 00:00:00','2026-08-31 00:00:00','active',NULL,0),(3,'maillot cameroun','pourcentage',10.00,'2026-07-30 00:00:00','2026-08-10 23:59:00','active',NULL,0);
/*!40000 ALTER TABLE `promotion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role` (
  `id_role` int(11) NOT NULL AUTO_INCREMENT,
  `libelle` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`id_role`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role`
--

LOCK TABLES `role` WRITE;
/*!40000 ALTER TABLE `role` DISABLE KEYS */;
INSERT INTO `role` VALUES (1,'administrateur','Accès total'),(2,'vendeur','Ventes et consultation'),(3,'gerant','Stock, ventes, clients, rapports');
/*!40000 ALTER TABLE `role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `utilisateur`
--

DROP TABLE IF EXISTS `utilisateur`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `utilisateur` (
  `id_utilisateur` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `mot_de_passe` varchar(255) DEFAULT NULL,
  `id_role` int(11) DEFAULT NULL,
  `statut` varchar(20) DEFAULT 'actif',
  `uuid_local` varchar(36) DEFAULT NULL,
  `synced` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id_utilisateur`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uuidLocal` (`uuid_local`),
  KEY `role` (`id_role`),
  CONSTRAINT `utilisateur_ibfk_1` FOREIGN KEY (`id_role`) REFERENCES `role` (`id_role`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `utilisateur`
--

LOCK TABLES `utilisateur` WRITE;
/*!40000 ALTER TABLE `utilisateur` DISABLE KEYS */;
INSERT INTO `utilisateur` VALUES (2,'Dupont','Jean','jean@example.com','0600000000','$2b$10$jrSENsdUM4VRVDbvDcSe2Ocegrdoa/QqgXNeKwssXt8o0epY1TeSu',3,'actif',NULL,0),(3,'Admin','Test','admin@100plusshop.fr',NULL,'$2b$10$aiU9ViNUTM5eDbAvzUBDw.iSuv9XjR5K4y6hpobxqbcoAJ298TNeC',1,'actif',NULL,0),(4,'Admin','vendeur','admin2@100plusshop.fr','0600000000','$2b$12$H2iKWFpT9Ezf8jkee8gLteuTsZBzL4pT9V0Vv/rVERV3LPuR4d/d6',2,'actif',NULL,0),(5,'tamo','jean','tamojean@gmail.com',NULL,'$2b$10$BwhxYT5Z9KSlb6HNB79CKONwJtbXvSVo0vf/jKI2/TZlRws8tqd6K',3,'actif',NULL,0),(6,'momo','duclair','100plusshop','66000888','$2b$10$aH4uIiCTtac05lbL16PNguQNwbo2ZcfTDlQ/48DuMpRMSmJ3Ngl7y',2,'actif',NULL,0);
/*!40000 ALTER TABLE `utilisateur` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `variante`
--

DROP TABLE IF EXISTS `variante`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `variante` (
  `id_variante` int(11) NOT NULL AUTO_INCREMENT,
  `id_produit` int(11) DEFAULT NULL,
  `taille` varchar(50) DEFAULT NULL,
  `couleur` varchar(50) DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `prix_achat` decimal(10,2) DEFAULT NULL,
  `prix_vente` decimal(10,2) DEFAULT NULL,
  `seuil_alerte` int(11) DEFAULT NULL,
  `uuid_local` varchar(36) DEFAULT NULL,
  `synced` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id_variante`),
  UNIQUE KEY `uuidLocal` (`uuid_local`),
  KEY `produit` (`id_produit`),
  CONSTRAINT `variante_ibfk_1` FOREIGN KEY (`id_produit`) REFERENCES `produit` (`id_produit`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `variante`
--

LOCK TABLES `variante` WRITE;
/*!40000 ALTER TABLE `variante` DISABLE KEYS */;
INSERT INTO `variante` VALUES (2,3,'M','bleu',40,20.00,45.00,1,NULL,0),(3,6,'S','Rouge',12,25.00,59.90,3,NULL,0),(4,6,'M','Rouge',7,25.00,59.90,3,NULL,0),(5,7,'S','Noir',8,20.00,49.90,5,NULL,0),(6,3,'L','Bleu',5,20.00,45.00,4,NULL,0),(7,3,'L','Bleu',5,20.00,45.00,4,NULL,0),(8,9,'xl','vert',12,7000.00,10000.00,20,NULL,0),(9,9,'xl','vetr',25,7000.00,10000.00,20,NULL,0),(10,10,'xl','bleu',14,8000.00,12000.00,5,NULL,0),(11,10,NULL,'bleu',5,10000.00,12000.00,2,NULL,0),(12,11,'xl','bleu',0,4000.00,7000.00,5,NULL,0);
/*!40000 ALTER TABLE `variante` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `variante_promotion`
--

DROP TABLE IF EXISTS `variante_promotion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `variante_promotion` (
  `id_variante` int(11) NOT NULL,
  `id_promotion` int(11) NOT NULL,
  PRIMARY KEY (`id_variante`,`id_promotion`),
  KEY `promotion` (`id_promotion`),
  KEY `idx_vp_variante` (`id_variante`),
  CONSTRAINT `variante_promotion_ibfk_1` FOREIGN KEY (`id_variante`) REFERENCES `variante` (`id_variante`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `variante_promotion_ibfk_2` FOREIGN KEY (`id_promotion`) REFERENCES `promotion` (`id_promotion`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `variante_promotion`
--

LOCK TABLES `variante_promotion` WRITE;
/*!40000 ALTER TABLE `variante_promotion` DISABLE KEYS */;
INSERT INTO `variante_promotion` VALUES (2,1),(2,2),(3,1),(8,3),(9,3);
/*!40000 ALTER TABLE `variante_promotion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vente`
--

DROP TABLE IF EXISTS `vente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vente` (
  `id_vente` int(11) NOT NULL AUTO_INCREMENT,
  `date_vente` datetime DEFAULT NULL,
  `id_vendeur` int(11) DEFAULT NULL,
  `id_client` int(11) DEFAULT NULL,
  `remise_globale` decimal(10,2) DEFAULT NULL,
  `montant_total` decimal(10,2) DEFAULT NULL,
  `mode_paiement_principal` varchar(100) DEFAULT NULL,
  `statut` varchar(50) DEFAULT NULL,
  `uuid_local` varchar(36) DEFAULT NULL,
  `synced` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id_vente`),
  UNIQUE KEY `uuidLocal` (`uuid_local`),
  KEY `vendeur` (`id_vendeur`),
  KEY `client` (`id_client`),
  CONSTRAINT `vente_ibfk_1` FOREIGN KEY (`id_vendeur`) REFERENCES `utilisateur` (`id_utilisateur`) ON UPDATE CASCADE,
  CONSTRAINT `vente_ibfk_2` FOREIGN KEY (`id_client`) REFERENCES `client` (`id_client`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vente`
--

LOCK TABLES `vente` WRITE;
/*!40000 ALTER TABLE `vente` DISABLE KEYS */;
INSERT INTO `vente` VALUES (14,'2026-07-27 15:17:59',3,1,0.00,10000.00,'especes','annulee',NULL,0),(15,'2026-07-27 15:30:42',3,1,5.00,85.00,'carte','validee',NULL,0),(16,'2026-07-27 22:44:09',3,NULL,0.00,45.00,'carte','annulee',NULL,0),(18,'2026-07-28 16:57:57',3,1,0.00,59.90,'carte','validee',NULL,0),(19,'2026-07-29 23:09:53',3,4,0.00,59.90,'especes','validee',NULL,0),(20,'2026-07-30 00:37:37',5,1,0.00,50000.00,'carte','validee',NULL,0),(21,'2026-07-30 00:39:50',5,3,0.00,50000.00,'carte','validee',NULL,0),(22,'2026-07-30 09:03:23',3,2,0.00,40000.00,'especes','validee',NULL,0),(23,'2026-07-30 09:11:46',3,4,0.00,10000.00,'carte','validee',NULL,0),(24,'2026-07-30 09:44:03',3,1,0.00,9000.00,'carte','validee',NULL,0),(25,'2026-07-30 22:24:02',3,4,0.00,9000.00,'carte','validee',NULL,0),(26,'2026-07-30 22:41:47',3,NULL,0.00,9000.00,'especes','validee',NULL,0),(27,'2026-07-31 12:31:13',3,4,0.00,9000.00,'carte','validee',NULL,0),(28,'2026-07-31 17:39:34',3,3,0.00,9000.00,'carte','validee',NULL,0),(29,'2026-08-02 03:06:15',3,4,0.00,9000.00,'carte','validee',NULL,0),(30,'2026-08-03 16:05:39',3,4,0.00,9000.00,'virement','validee',NULL,0),(31,'2026-08-03 16:55:28',3,4,0.00,9000.00,'carte','validee',NULL,0),(32,'2026-08-03 18:51:45',3,NULL,0.00,36000.00,'carte','annulee',NULL,0),(33,'2026-08-04 00:01:29',3,NULL,0.00,12000.00,'carte','validee',NULL,0),(34,'2026-08-04 00:27:39',3,1,0.00,7000.00,'carte','validee',NULL,0);
/*!40000 ALTER TABLE `vente` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-05 15:37:26
