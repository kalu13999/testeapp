CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `bookId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `action` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `userId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `details` text COLLATE utf8mb4_general_ci,
  `documentId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bookId` (`bookId`),
  KEY `userId` (`userId`),
  KEY `fk_audit_doc` (`documentId`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `audit_logs_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_audit_doc` FOREIGN KEY (`documentId`) REFERENCES `documents` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.books
CREATE TABLE IF NOT EXISTS `books` (
  `id` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `statusId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `expectedDocuments` int DEFAULT NULL,
  `projectId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `priority` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `info` text COLLATE utf8mb4_general_ci,
  `scannerUserId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `scanStartTime` datetime DEFAULT NULL,
  `scanEndTime` datetime DEFAULT NULL,
  `indexerUserId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `indexingStartTime` datetime DEFAULT NULL,
  `indexingEndTime` datetime DEFAULT NULL,
  `qcUserId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `qcStartTime` datetime DEFAULT NULL,
  `rejectionReason` text COLLATE utf8mb4_general_ci,
  `author` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `isbn` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `publicationYear` int DEFAULT NULL,
  `qcEndTime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `projectId` (`projectId`),
  KEY `scannerUserId` (`scannerUserId`),
  KEY `indexerUserId` (`indexerUserId`),
  KEY `qcUserId` (`qcUserId`),
  KEY `fk_books_status` (`statusId`),
  CONSTRAINT `books_ibfk_1` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `books_ibfk_2` FOREIGN KEY (`scannerUserId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `books_ibfk_3` FOREIGN KEY (`indexerUserId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `books_ibfk_4` FOREIGN KEY (`qcUserId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_books_status` FOREIGN KEY (`statusId`) REFERENCES `document_statuses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.clients
CREATE TABLE IF NOT EXISTS `clients` (
  `id` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `contactEmail` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contactPhone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `website` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `since` date DEFAULT NULL,
  `info` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.documents
CREATE TABLE IF NOT EXISTS `documents` (
  `id` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `clientId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `statusId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `flag` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `flagComment` text COLLATE utf8mb4_general_ci,
  `lastUpdated` datetime DEFAULT NULL,
  `name` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `projectId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `bookId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tags` text COLLATE utf8mb4_general_ci,
  `imageUrl` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `folderId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `clientId` (`clientId`),
  KEY `statusId` (`statusId`),
  KEY `projectId` (`projectId`),
  KEY `bookId` (`bookId`),
  KEY `fk_doc_folder` (`folderId`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`statusId`) REFERENCES `document_statuses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `documents_ibfk_3` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `documents_ibfk_4` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_doc_folder` FOREIGN KEY (`folderId`) REFERENCES `folders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.document_statuses
CREATE TABLE IF NOT EXISTS `document_statuses` (
  `id` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `stage` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `folderName` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Nome da pasta física no sistema de ficheiros para este estado',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.envio_diario
CREATE TABLE IF NOT EXISTS `envio_diario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `storage_id` int NOT NULL,
  `data` date NOT NULL,
  `total_tifs_enviados` int NOT NULL DEFAULT '0',
  `obs` text COLLATE utf8mb4_general_ci,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_storage_data` (`storage_id`,`data`),
  CONSTRAINT `envio_diario_ibfk_1` FOREIGN KEY (`storage_id`) REFERENCES `storages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.folders
CREATE TABLE IF NOT EXISTS `folders` (
  `id` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `parentId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `parentId` (`parentId`),
  CONSTRAINT `folders_ibfk_1` FOREIGN KEY (`parentId`) REFERENCES `folders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.log_transferencias
CREATE TABLE IF NOT EXISTS `log_transferencias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome_pasta` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `bookId` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `total_tifs` int NOT NULL,
  `storage_id` int DEFAULT NULL,
  `scanner_id` int DEFAULT NULL,
  `destino_path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('pendente','enviando','sucesso','erro') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pendente',
  `mensagem_erro` text COLLATE utf8mb4_general_ci,
  `data_inicio` datetime DEFAULT CURRENT_TIMESTAMP,
  `data_fim` datetime DEFAULT NULL,
  `obs` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `storage_id` (`storage_id`),
  KEY `scanner_id` (`scanner_id`),
  KEY `idx_nome_pasta` (`nome_pasta`),
  KEY `idx_bookId` (`bookId`),
  CONSTRAINT `log_transferencias_ibfk_1` FOREIGN KEY (`storage_id`) REFERENCES `storages` (`id`) ON DELETE SET NULL,
  CONSTRAINT `log_transferencias_ibfk_2` FOREIGN KEY (`scanner_id`) REFERENCES `scanners` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.permissions
CREATE TABLE IF NOT EXISTS `permissions` (
  `role` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `route` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`role`,`route`),
  CONSTRAINT `permissions_ibfk_1` FOREIGN KEY (`role`) REFERENCES `roles` (`name`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.processing_batches
CREATE TABLE IF NOT EXISTS `processing_batches` (
  `id` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `startTime` datetime NOT NULL,
  `endTime` datetime DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_general_ci NOT NULL COMMENT '''In Progress'', ''Complete'', ''Failed''',
  `progress` int NOT NULL DEFAULT '0',
  `timestampStr` text COLLATE utf8mb4_general_ci NOT NULL,
  `info` text COLLATE utf8mb4_general_ci,
  `obs` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.processing_batch_items
CREATE TABLE IF NOT EXISTS `processing_batch_items` (
  `id` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `batchId` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `bookId` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `itemStartTime` datetime DEFAULT NULL,
  `itemEndTime` datetime DEFAULT NULL,
  `processedPages` json DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_general_ci NOT NULL COMMENT '''Pending'', ''In Progress'', ''Complete'', ''Failed''',
  `info` text COLLATE utf8mb4_general_ci,
  `obs` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `fk_batch_items_batch` (`batchId`),
  KEY `fk_batch_items_book` (`bookId`),
  CONSTRAINT `fk_batch_items_batch` FOREIGN KEY (`batchId`) REFERENCES `processing_batches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_batch_items_book` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.processing_logs
CREATE TABLE IF NOT EXISTS `processing_logs` (
  `id` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `batchId` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `message` text COLLATE utf8mb4_general_ci NOT NULL,
  `timestamp` datetime NOT NULL,
  `level` varchar(20) COLLATE utf8mb4_general_ci NOT NULL COMMENT '''INFO'', ''ERROR'', ''WARN''',
  `info` text COLLATE utf8mb4_general_ci,
  `obs` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `fk_logs_batch` (`batchId`),
  CONSTRAINT `fk_logs_batch` FOREIGN KEY (`batchId`) REFERENCES `processing_batches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.projects
CREATE TABLE IF NOT EXISTS `projects` (
  `id` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `clientId` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `startDate` date DEFAULT NULL,
  `endDate` date DEFAULT NULL,
  `budget` decimal(12,2) DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `info` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `clientId` (`clientId`),
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.project_storages
CREATE TABLE IF NOT EXISTS `project_storages` (
  `projectId` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `storageId` int NOT NULL,
  `percentual_minimo_diario` decimal(5,2) NOT NULL DEFAULT '0.00',
  `minimo_diario_fixo` int NOT NULL DEFAULT '0',
  `peso` int NOT NULL DEFAULT '1',
  `descricao` text COLLATE utf8mb4_general_ci,
  `obs` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`projectId`,`storageId`),
  KEY `fk_project_storages_storage` (`storageId`),
  CONSTRAINT `fk_project_storages_project` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_project_storages_storage` FOREIGN KEY (`storageId`) REFERENCES `storages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.project_workflows
CREATE TABLE IF NOT EXISTS `project_workflows` (
  `projectId` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `stage` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`projectId`,`stage`),
  CONSTRAINT `project_workflows_ibfk_1` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.rejection_tags
CREATE TABLE IF NOT EXISTS `rejection_tags` (
  `id` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `clientId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `label` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `clientId` (`clientId`),
  CONSTRAINT `rejection_tags_ibfk_1` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.rejection_tag_projects
CREATE TABLE IF NOT EXISTS `rejection_tag_projects` (
  `tagId` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `projectId` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`tagId`,`projectId`),
  KEY `projectId` (`projectId`),
  CONSTRAINT `rejection_tag_projects_ibfk_1` FOREIGN KEY (`tagId`) REFERENCES `rejection_tags` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `rejection_tag_projects_ibfk_2` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.roles
CREATE TABLE IF NOT EXISTS `roles` (
  `name` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.scanners
CREATE TABLE IF NOT EXISTS `scanners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `ip` varchar(45) COLLATE utf8mb4_general_ci NOT NULL,
  `scanner_root_folder` varchar(255) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Ex: \\\\192.168.1.10\\Scans',
  `error_folder` varchar(255) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Ex: \\\\192.168.1.10\\Scans\\\\_ERROS',
  `success_folder` varchar(255) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Ex: \\\\192.168.1.10\\Scans\\\\_CONCLUIDOS',
  `local_thumbs_path` varchar(255) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Ex: C:\\Temp\\Thumbs (no próprio scanner)',
  `status` enum('ativo','inativo') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'ativo',
  `obs` text COLLATE utf8mb4_general_ci,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.storages
CREATE TABLE IF NOT EXISTS `storages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `ip` varchar(45) COLLATE utf8mb4_general_ci NOT NULL,
  `root_path` varchar(255) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Ex: \\\\192.168.1.20\\DATA\\scans',
  `thumbs_path` varchar(255) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Ex: \\\\192.168.1.20\\DATA\\thumbs',
  `status` enum('ativo','inativo','manutencao') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'ativo',
  `percentual_minimo_diario` decimal(5,2) NOT NULL DEFAULT '0.00',
  `minimo_diario_fixo` int NOT NULL DEFAULT '0',
  `peso` int NOT NULL DEFAULT '1',
  `descricao` text COLLATE utf8mb4_general_ci,
  `obs` text COLLATE utf8mb4_general_ci,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `username` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `avatar` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `jobTitle` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `department` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `lastLogin` datetime DEFAULT NULL,
  `info` text COLLATE utf8mb4_general_ci,
  `status` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `defaultProjectId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `clientId` varchar(191) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `role` (`role`),
  KEY `defaultProjectId` (`defaultProjectId`),
  KEY `clientId` (`clientId`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role`) REFERENCES `roles` (`name`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`defaultProjectId`) REFERENCES `projects` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `users_ibfk_3` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Exportação de dados não seleccionada.

-- A despejar estrutura para tabela testebdbnp.user_projects
CREATE TABLE IF NOT EXISTS `user_projects` (
  `userId` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  `projectId` varchar(191) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`userId`,`projectId`),
  KEY `projectId` (`projectId`),
  CONSTRAINT `user_projects_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_projects_ibfk_2` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
