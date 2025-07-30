
-- Tabela para gerir a relação N:N entre projetos e storages,
-- incluindo regras de distribuição específicas para cada associação.

CREATE TABLE `project_storages` (
  `projectId` VARCHAR(255) NOT NULL,
  `storageId` VARCHAR(255) NOT NULL,
  `percentual_minimo_diario` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `minimo_diario_fixo` INT(10) NOT NULL DEFAULT 0,
  `peso` INT(10) NOT NULL DEFAULT 1,
  `descricao` TEXT NULL DEFAULT NULL,
  `obs` TEXT NULL DEFAULT NULL,
  PRIMARY KEY (`projectId`, `storageId`),
  INDEX `fk_project_storages_storage` (`storageId`),
  CONSTRAINT `fk_project_storages_project` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_project_storages_storage` FOREIGN KEY (`storageId`) REFERENCES `storages` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
)
COLLATE='utf8mb4_general_ci';
