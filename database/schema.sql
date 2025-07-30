CREATE TABLE `project_storages` (
	`projectId` VARCHAR(191) NOT NULL COLLATE 'utf8mb4_general_ci',
	`storageId` INT(10) NOT NULL,
	`percentual_minimo_diario` DECIMAL(5,2) NOT NULL DEFAULT '0.00',
	`minimo_diario_fixo` INT(10) NOT NULL DEFAULT '0',
	`peso` INT(10) NOT NULL DEFAULT '1',
	`descricao` TEXT NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
	`obs` TEXT NULL DEFAULT NULL COLLATE 'utf8mb4_general_ci',
	PRIMARY KEY (`projectId`, `storageId`) USING BTREE,
	INDEX `fk_project_storages_storage` (`storageId`) USING BTREE,
	CONSTRAINT `fk_project_storages_project` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT `fk_project_storages_storage` FOREIGN KEY (`storageId`) REFERENCES `storages` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
)
COLLATE='utf8mb4_general_ci'
;
