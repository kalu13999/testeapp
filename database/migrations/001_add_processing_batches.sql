-- Remove a tabela antiga se existir.
DROP TABLE IF EXISTS `processing_logs`;

-- Cria a nova tabela para gerir os lotes de processamento.
CREATE TABLE `processing_batches` (
  `id` VARCHAR(191) NOT NULL,
  `startTime` DATETIME NOT NULL,
  `endTime` DATETIME NULL DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL COMMENT '''In Progress'', ''Complete'', ''Failed''',
  `progress` INT NOT NULL DEFAULT 0,
  `timestampStr` TEXT NOT NULL,
  `info` TEXT NULL DEFAULT NULL,
  `obs` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Cria a tabela para os itens (livros) dentro de cada lote, com as suas métricas individuais.
CREATE TABLE `processing_batch_items` (
  `id` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NOT NULL,
  `bookId` VARCHAR(191) NOT NULL,
  `itemStartTime` DATETIME NULL DEFAULT NULL,
  `itemEndTime` DATETIME NULL DEFAULT NULL,
  `processedPages` JSON NULL DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL COMMENT '''Pending'', ''In Progress'', ''Complete'', ''Failed''',
  `info` TEXT NULL DEFAULT NULL,
  `obs` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_batch_items_batch` (`batchId`),
  INDEX `fk_batch_items_book` (`bookId`),
  CONSTRAINT `fk_batch_items_batch` FOREIGN KEY (`batchId`) REFERENCES `processing_batches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_batch_items_book` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Recria a tabela de logs, agora associada aos lotes de processamento.
CREATE TABLE `processing_logs` (
  `id` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `level` VARCHAR(20) NOT NULL COMMENT '''INFO'', ''ERROR'', ''WARN''',
  `info` TEXT NULL DEFAULT NULL,
  `obs` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_logs_batch` (`batchId`),
  CONSTRAINT `fk_logs_batch` FOREIGN KEY (`batchId`) REFERENCES `processing_batches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
