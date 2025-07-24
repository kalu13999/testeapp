-- Passo 1: Adicionar a nova coluna `folderName` à tabela `document_statuses`.
-- Esta coluna irá armazenar o nome do diretório físico correspondente a cada estado.
ALTER TABLE `document_statuses`
ADD COLUMN `folderName` VARCHAR(191) NULL DEFAULT NULL COMMENT 'Nome da pasta física no sistema de ficheiros para este estado' AFTER `stage`;

-- Passo 2: Atualizar os registos existentes para mapear os estados para as pastas.
-- Apenas os estados que correspondem a uma localização física no workflow de armazenamento precisam de ser atualizados.
-- Estados puramente lógicos como 'Pending Shipment' ou 'In Transit' permanecem com o folderName a NULL.
UPDATE `document_statuses` SET `folderName` = '001-storage' WHERE `name` = 'Storage';
UPDATE `document_statuses` SET `folderName` = '002-toIndexing' WHERE `name` = 'To Indexing';
UPDATE `document_statuses` SET `folderName` = '003-indexingStarted' WHERE `name` = 'Indexing Started';
UPDATE `document_statuses` SET `folderName` = '004-toChecking' WHERE `name` = 'To Checking';
UPDATE `document_statuses` SET `folderName` = '005-checkingStarted' WHERE `name` = 'Checking Started';
UPDATE `document_statuses` SET `folderName` = '006-readyForProcessing' WHERE `name` = 'Ready for Processing';
UPDATE `document_statuses` SET `folderName` = '007-inProcessing' WHERE `name` = 'In Processing';
UPDATE `document_statuses` SET `folderName` = '008-processed' WHERE `name` = 'Processed';
UPDATE `document_statuses` SET `folderName` = '009-finalQualityControl' WHERE `name` = 'Final Quality Control';
UPDATE `document_statuses` SET `folderName` = '010-delivery' WHERE `name` = 'Delivery';
UPDATE `document_statuses` SET `folderName` = '011-pendingValidation' WHERE `name` = 'Pending Validation';
UPDATE `document_statuses` SET `folderName` = '012-clientRejected' WHERE `name` = 'Client Rejected';
UPDATE `document_statuses` SET `folderName` = '013-corrected' WHERE `name` = 'Corrected';
UPDATE `document_statuses` SET `folderName` = '014-finalized' WHERE `name` = 'Finalized';
UPDATE `document_statuses` SET `folderName` = '015-archived' WHERE `name` = 'Archived';

-- Confirmação de que a operação foi concluída
SELECT 'Coluna folderName adicionada e populada com sucesso.' AS `status`;
