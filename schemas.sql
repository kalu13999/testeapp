
-- Estrutura da base de dados para o projeto FlowVault

CREATE TABLE `clients` (
	`id` VARCHAR(50) NOT NULL,
	`name` VARCHAR(255) NOT NULL,
	`contactEmail` VARCHAR(255) NULL DEFAULT NULL,
	`contactPhone` VARCHAR(50) NULL DEFAULT NULL,
	`address` TEXT NULL DEFAULT NULL,
	`website` VARCHAR(255) NULL DEFAULT NULL,
	`since` DATE NULL DEFAULT NULL,
	`info` TEXT NULL DEFAULT NULL,
	PRIMARY KEY (`id`)
)
COLLATE='utf8mb4_general_ci';

CREATE TABLE `projects` (
	`id` VARCHAR(50) NOT NULL,
	`name` VARCHAR(255) NOT NULL,
	`clientId` VARCHAR(50) NOT NULL,
	`description` TEXT NULL DEFAULT NULL,
	`startDate` DATE NULL DEFAULT NULL,
	`endDate` DATE NULL DEFAULT NULL,
	`budget` DECIMAL(15,2) NULL DEFAULT NULL,
	`status` VARCHAR(50) NULL DEFAULT NULL,
	`info` TEXT NULL DEFAULT NULL,
	PRIMARY KEY (`id`),
	INDEX `clientId` (`clientId`),
	CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
)
COLLATE='utf8mb4_general_ci';


CREATE TABLE `users` (
	`id` VARCHAR(50) NOT NULL,
	`username` VARCHAR(50) NOT NULL,
	`password` VARCHAR(255) NOT NULL,
	`name` VARCHAR(255) NOT NULL,
	`email` VARCHAR(255) NULL DEFAULT NULL,
	`role` VARCHAR(50) NOT NULL,
	`avatar` VARCHAR(255) NULL DEFAULT NULL,
	`phone` VARCHAR(50) NULL DEFAULT NULL,
	`jobTitle` VARCHAR(100) NULL DEFAULT NULL,
	`department` VARCHAR(100) NULL DEFAULT NULL,
	`lastLogin` DATETIME NULL DEFAULT NULL,
	`info` TEXT NULL DEFAULT NULL,
	`status` ENUM('active','disabled') NOT NULL DEFAULT 'active',
	`defaultProjectId` VARCHAR(50) NULL DEFAULT NULL,
	`clientId` VARCHAR(50) NULL DEFAULT NULL,
	PRIMARY KEY (`id`),
	UNIQUE INDEX `username` (`username`),
	INDEX `clientId` (`clientId`),
	CONSTRAINT `users_ibfk_1` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`defaultProjectId`) REFERENCES `projects` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
)
COLLATE='utf8mb4_general_ci';

CREATE TABLE `user_projects` (
    `userId` VARCHAR(50) NOT NULL,
    `projectId` VARCHAR(50) NOT NULL,
    PRIMARY KEY (`userId`, `projectId`),
    CONSTRAINT `user_projects_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT `user_projects_ibfk_2` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
)
COLLATE='utf8mb4_general_ci';


CREATE TABLE `roles` (
	`name` VARCHAR(50) NOT NULL,
	PRIMARY KEY (`name`)
)
COLLATE='utf8mb4_general_ci';

CREATE TABLE `permissions` (
	`role` VARCHAR(50) NOT NULL,
	`route` VARCHAR(255) NOT NULL,
	PRIMARY KEY (`role`, `route`),
	CONSTRAINT `permissions_ibfk_1` FOREIGN KEY (`role`) REFERENCES `roles` (`name`) ON UPDATE CASCADE ON DELETE CASCADE
)
COLLATE='utf8mb4_general_ci';

CREATE TABLE `document_statuses` (
	`id` VARCHAR(50) NOT NULL,
	`name` VARCHAR(100) NOT NULL,
  `stage` VARCHAR(100) NOT NULL,
  `folderName` VARCHAR(100) NULL,
	PRIMARY KEY (`id`),
	UNIQUE INDEX `name` (`name`)
)
COLLATE='utf8mb4_general_ci';


CREATE TABLE `books` (
	`id` VARCHAR(50) NOT NULL,
	`name` VARCHAR(255) NOT NULL,
	`statusId` VARCHAR(50) NULL DEFAULT 'ds_1',
	`expectedDocuments` INT(11) NULL DEFAULT NULL,
	`projectId` VARCHAR(50) NOT NULL,
  `author` VARCHAR(255) NULL DEFAULT NULL,
  `isbn` VARCHAR(50) NULL DEFAULT NULL,
  `publicationYear` INT(4) NULL DEFAULT NULL,
	`priority` ENUM('Low','Medium','High') NULL DEFAULT 'Medium',
	`info` TEXT NULL DEFAULT NULL,
	`scannerUserId` VARCHAR(50) NULL DEFAULT NULL,
	`scanStartTime` DATETIME NULL DEFAULT NULL,
	`scanEndTime` DATETIME NULL DEFAULT NULL,
	`indexerUserId` VARCHAR(50) NULL DEFAULT NULL,
	`indexingStartTime` DATETIME NULL DEFAULT NULL,
	`indexingEndTime` DATETIME NULL DEFAULT NULL,
	`qcUserId` VARCHAR(50) NULL DEFAULT NULL,
	`qcStartTime` DATETIME NULL DEFAULT NULL,
  `rejectionReason` TEXT NULL DEFAULT NULL,
	PRIMARY KEY (`id`),
	INDEX `projectId` (`projectId`),
	INDEX `statusId` (`statusId`),
	INDEX `scannerUserId` (`scannerUserId`),
	INDEX `indexerUserId` (`indexerUserId`),
	INDEX `qcUserId` (`qcUserId`),
	CONSTRAINT `books_ibfk_1` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT `books_ibfk_2` FOREIGN KEY (`statusId`) REFERENCES `document_statuses` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
	CONSTRAINT `books_ibfk_3` FOREIGN KEY (`scannerUserId`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
	CONSTRAINT `books_ibfk_4` FOREIGN KEY (`indexerUserId`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
	CONSTRAINT `books_ibfk_5` FOREIGN KEY (`qcUserId`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
)
COLLATE='utf8mb4_general_ci';

CREATE TABLE `documents` (
	`id` VARCHAR(50) NOT NULL,
	`clientId` VARCHAR(50) NULL DEFAULT NULL,
	`type` VARCHAR(100) NULL DEFAULT NULL,
	`lastUpdated` DATETIME NULL DEFAULT NULL,
  `tags` JSON NULL,
	`name` VARCHAR(255) NULL DEFAULT NULL,
	`folderId` VARCHAR(50) NULL DEFAULT NULL,
	`projectId` VARCHAR(50) NULL DEFAULT NULL,
	`bookId` VARCHAR(50) NULL DEFAULT NULL,
  `flag` ENUM('error','warning','info') NULL DEFAULT NULL,
  `flagComment` TEXT NULL,
  `imageUrl` VARCHAR(2048) NULL,
	PRIMARY KEY (`id`),
	INDEX `clientId` (`clientId`),
	INDEX `projectId` (`projectId`),
	INDEX `bookId` (`bookId`),
	INDEX `folderId` (`folderId`)
)
COLLATE='utf8mb4_general_ci';

CREATE TABLE `rejection_tags` (
	`id` VARCHAR(50) NOT NULL,
	`clientId` VARCHAR(50) NOT NULL,
	`label` VARCHAR(100) NOT NULL,
	`description` TEXT NOT NULL,
	PRIMARY KEY (`id`),
	INDEX `clientId` (`clientId`),
	CONSTRAINT `rejection_tags_ibfk_1` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
)
COLLATE='utf8mb4_general_ci';

CREATE TABLE `audit_logs` (
	`id` VARCHAR(50) NOT NULL,
	`bookId` VARCHAR(50) NULL DEFAULT NULL,
  `documentId` VARCHAR(50) NULL DEFAULT NULL,
	`action` VARCHAR(255) NOT NULL,
	`userId` VARCHAR(50) NOT NULL,
	`date` DATETIME NOT NULL,
	`details` TEXT NULL DEFAULT NULL,
	PRIMARY KEY (`id`),
	INDEX `bookId` (`bookId`),
	INDEX `userId` (`userId`)
)
COLLATE='utf8mb4_general_ci';


CREATE TABLE `scanners` (
	`id` INT(10) NOT NULL AUTO_INCREMENT,
	`nome` VARCHAR(100) NOT NULL,
	`ip` VARCHAR(45) NOT NULL,
	`scanner_root_folder` VARCHAR(255) NOT NULL,
	`error_folder` VARCHAR(255) NOT NULL,
	`success_folder` VARCHAR(255) NOT NULL,
	`local_thumbs_path` VARCHAR(255) NOT NULL,
	`status` ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`obs` TEXT NULL DEFAULT NULL,
	PRIMARY KEY (`id`),
	UNIQUE INDEX `nome` (`nome`)
)
COLLATE='utf8mb4_general_ci';


CREATE TABLE `storages` (
	`id` INT(10) NOT NULL AUTO_INCREMENT,
	`nome` VARCHAR(100) NOT NULL,
	`ip` VARCHAR(45) NOT NULL,
	`root_path` VARCHAR(255) NOT NULL,
	`thumbs_path` VARCHAR(255) NOT NULL,
	`status` ENUM('ativo','inativo','manutencao') NOT NULL DEFAULT 'ativo',
	`percentual_minimo_diario` DECIMAL(5,2) NOT NULL DEFAULT '0.00',
	`minimo_diario_fixo` INT(10) NOT NULL DEFAULT '0',
	`peso` INT(10) NOT NULL DEFAULT '1',
	`descricao` TEXT NULL DEFAULT NULL,
	`obs` TEXT NULL DEFAULT NULL,
	PRIMARY KEY (`id`),
	UNIQUE INDEX `nome` (`nome`)
)
COLLATE='utf8mb4_general_ci';


CREATE TABLE `project_storages` (
    `projectId` VARCHAR(50) NOT NULL,
    `storageId` INT(10) NOT NULL,
    `percentual_minimo_diario` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `minimo_diario_fixo` INT(10) NOT NULL DEFAULT 0,
    `peso` INT(10) NOT NULL DEFAULT 1,
    `descricao` TEXT NULL,
    `obs` TEXT NULL,
    PRIMARY KEY (`projectId`, `storageId`),
    CONSTRAINT `project_storages_ibfk_1` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `project_storages_ibfk_2` FOREIGN KEY (`storageId`) REFERENCES `storages` (`id`) ON DELETE CASCADE
)
COLLATE='utf8mb4_general_ci';


CREATE TABLE `log_transferencias` (
	`id` INT(10) NOT NULL AUTO_INCREMENT,
	`nome_pasta` VARCHAR(255) NOT NULL,
	`bookId` VARCHAR(50) NULL DEFAULT NULL,
	`total_tifs` INT(10) NOT NULL,
	`storage_id` INT(10) NULL DEFAULT NULL,
	`scanner_id` INT(10) NULL DEFAULT NULL,
	`status` ENUM('sucesso','erro') NOT NULL,
	`data_fim` DATETIME NOT NULL,
	`detalhes` TEXT NULL,
	PRIMARY KEY (`id`)
)
COLLATE='utf8mb4_general_ci';


CREATE TABLE `project_workflows` (
    `projectId` VARCHAR(50) NOT NULL,
    `stage` VARCHAR(100) NOT NULL,
    PRIMARY KEY (`projectId`, `stage`),
    CONSTRAINT `project_workflows_ibfk_1` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE
)
COLLATE='utf8mb4_general_ci';


CREATE TABLE `processing_batches` (
	`id` VARCHAR(50) NOT NULL,
	`startTime` DATETIME NOT NULL,
	`endTime` DATETIME NULL DEFAULT NULL,
	`status` ENUM('In Progress','Complete','Failed') NOT NULL,
	`progress` INT(11) NOT NULL DEFAULT '0',
	`timestampStr` VARCHAR(255) NULL,
	`info` TEXT NULL,
	`obs` TEXT NULL,
	PRIMARY KEY (`id`)
)
COLLATE='utf8mb4_general_ci';

CREATE TABLE `processing_batch_items` (
	`id` VARCHAR(255) NOT NULL,
	`batchId` VARCHAR(50) NOT NULL,
	`bookId` VARCHAR(50) NOT NULL,
	`itemStartTime` DATETIME NULL DEFAULT NULL,
	`itemEndTime` DATETIME NULL DEFAULT NULL,
	`processedPages` JSON NULL,
	`status` ENUM('Pending','In Progress','Complete','Failed') NOT NULL,
	`info` TEXT NULL,
	`obs` TEXT NULL,
	PRIMARY KEY (`id`),
	INDEX `batchId` (`batchId`),
	INDEX `bookId` (`bookId`),
	CONSTRAINT `processing_batch_items_ibfk_1` FOREIGN KEY (`batchId`) REFERENCES `processing_batches` (`id`) ON DELETE CASCADE
)
COLLATE='utf8mb4_general_ci';


CREATE TABLE `processing_logs` (
	`id` VARCHAR(50) NOT NULL,
	`batchId` VARCHAR(50) NOT NULL,
  `bookId` VARCHAR(50) NULL,
	`message` TEXT NOT NULL,
	`timestamp` DATETIME NOT NULL,
	`level` ENUM('INFO','WARN','ERROR') NOT NULL,
	`info` TEXT NULL,
	`obs` TEXT NULL,
	PRIMARY KEY (`id`),
	INDEX `batchId` (`batchId`)
)
COLLATE='utf8mb4_general_ci';

CREATE TABLE `delivery_batches` (
    `id` VARCHAR(50) NOT NULL,
    `creationDate` DATETIME NOT NULL,
    `deliveryDate` DATETIME NULL,
    `status` ENUM('Ready', 'Delivered') NOT NULL,
    `userId` VARCHAR(50) NULL,
    `info` TEXT NULL,
    PRIMARY KEY (`id`),
    INDEX `userId` (`userId`)
)
COLLATE='utf8mb4_general_ci';

CREATE TABLE `delivery_batch_items` (
    `id` VARCHAR(255) NOT NULL,
    `deliveryId` VARCHAR(50) NOT NULL,
    `bookId` VARCHAR(50) NOT NULL,
    `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    `info` TEXT NULL,
    `obs` TEXT NULL,
    PRIMARY KEY (`id`),
    INDEX `deliveryId` (`deliveryId`),
    INDEX `bookId` (`bookId`),
    CONSTRAINT `delivery_batch_items_ibfk_1` FOREIGN KEY (`deliveryId`) REFERENCES `delivery_batches` (`id`) ON DELETE CASCADE
)
COLLATE='utf8mb4_general_ci';

