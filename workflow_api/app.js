

const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');

// --- Configuração ---
const configPath = path.join(__dirname, 'config', 'configs.json');
if (!fs.existsSync(configPath)) {
    console.error("ERRO: O ficheiro de configuração 'config/configs.json' não foi encontrado.");
    process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = express();
app.use(cors()); 
app.use(express.json());

// --- Configuração de Pastas e Rota Estática ---
const publicThumbsPath = path.resolve(__dirname, config.folders.public_thumbs_folder);
app.use(config.server.public_thumbs_route, express.static(publicThumbsPath));

// --- Configuração do Multer para Upload ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let dbPool;

// --- Funções de Inicialização ---
async function initializeDbPool() {
    try {
        dbPool = mysql.createPool({
            ...config.database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        const connection = await dbPool.getConnection();
        await connection.ping();
        connection.release();
        console.log('✅ Pool de conexões à base de dados está ativo.');
    } catch (err) {
        console.error('❌ Erro ao inicializar o pool de conexões:', err.message);
        process.exit(1);
    }
}

async function checkAndCreateFolders() {
    console.log('--- A verificar estrutura de pastas ---');
    try {
        if (!fs.existsSync(publicThumbsPath)) {
            fs.mkdirSync(publicThumbsPath, { recursive: true });
            console.log(`Pasta pública de miniaturas criada: ${publicThumbsPath}`);
        }
        
        const [storages] = await dbPool.query("SELECT root_path, thumbs_path FROM storages WHERE status = 'ativo'");

        if (storages.length === 0) {
            console.warn("Aviso: Nenhum storage ativo encontrado. Nenhuma pasta de workflow será criada nos storages.");
        } else {
            for (const storage of storages) {
                console.log(`A verificar pastas para o storage em: ${storage.root_path}`);
                if (!fs.existsSync(storage.thumbs_path)) {
                    fs.mkdirSync(storage.thumbs_path, { recursive: true });
                    console.log(`   -> Criada pasta de thumbs do storage: ${storage.thumbs_path}`);
                }
                for (const folderName of config.folders.workflow_stages) {
                    const folderPath = path.join(storage.root_path, folderName);
                    if (!fs.existsSync(folderPath)) {
                        fs.mkdirSync(folderPath, { recursive: true });
                        console.log(`   -> Criada: ${folderPath}`);
                    }
                }
            }
        }
        console.log('✅ Estrutura de pastas verificada com sucesso.');
    } catch (err) {
        console.error(`❌ Erro crítico ao criar estrutura de pastas:`, err);
        throw err;
    }
}



function normalizePath(pathStr) {
  return pathStr.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}
// --- Endpoints da API ---

app.get('/api/scanners', async (req, res) => {
    try {
        const [rows] = await dbPool.query(
            "SELECT id, nome, ip, scanner_root_folder, error_folder, success_folder, local_thumbs_path FROM scanners WHERE status = 'ativo'"
        );
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar scanners:', err);
        res.status(500).json({ error: 'Erro interno ao buscar scanners.' });
    }
});


app.get('/api/storages', async (req, res) => {
    try {
        const [rows] = await dbPool.query(
            "SELECT id, nome, ip, root_path, thumbs_path, percentual_minimo_diario, minimo_diario_fixo, peso FROM storages WHERE status = 'ativo'"
        );
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar storages:', err);
        res.status(500).json({ error: 'Erro interno ao buscar storages.' });
    }
});

app.get('/api/storages/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await dbPool.query(
            "SELECT * FROM storages WHERE id = ?",
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Storage não encontrado.' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(`Erro ao buscar storage ${id}:`, err);
        res.status(500).json({ error: 'Erro interno ao buscar storage.' });
    }
});

app.get('/api/storages/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const [rows] = await dbPool.query(
            'SELECT storage_id, total_tifs_enviados FROM envio_diario WHERE data = ?',
            [today]
        );
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar estatísticas diárias:', err);
        res.status(500).json({ error: 'Erro interno ao buscar estatísticas.' });
    }
});

app.post('/api/storages/writestats', async (req, res) => {
    const {
        storage_id: inputStorageId,
        data: inputData,
        total_tifs_enviados: inputTotalTifs,
        obs: inputObs
    } = req.body;

    if (!inputStorageId || !inputData || inputTotalTifs === undefined) {
        return res.status(400).json({
            error: 'Campos obrigatórios: storage_id, data, total_tifs_enviados.'
        });
    }

    try {
        const query = `
            INSERT INTO envio_diario (storage_id, data, total_tifs_enviados, obs)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                total_tifs_enviados = total_tifs_enviados + VALUES(total_tifs_enviados),
                obs = CONCAT_WS(' | ', obs, VALUES(obs)),
                atualizado_em = CURRENT_TIMESTAMP
        `;

        await dbPool.query(query, [
            inputStorageId,
            inputData,
            inputTotalTifs,
            inputObs || null
        ]);

        res.status(200).json({ message: 'Registro inserido ou atualizado com sucesso.' });
    } catch (err) {
        console.error('Erro ao inserir/atualizar envio_diario:', err);
        res.status(500).json({ error: 'Erro interno ao inserir/atualizar estatísticas.' });
    }
});

app.post('/api/books/byname', async (req, res) => {
  const { bookName } = req.body;
  if (!bookName) {
      return res.status(400).json({ error: 'Campo "bookName" é obrigatório.' });
  }

  try {
    const [rows] = await dbPool.query(
        'SELECT id FROM books WHERE name = ? and statusId IN (SELECT id FROM document_statuses WHERE name = ?)', 
        [bookName, 'Scanning Started']
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Livro não encontrado.' });
    } else if (rows.length > 1) {
      return res.status(400).json({ error: 'Mais que um livro encontrado com esse nome.' });
    } else {
      return res.json({ bookId: rows[0].id });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao comunicar com a base de dados.' });
  }
});

app.get('/api/project/bybookname', async (req, res) => {
    const { bookName } = req.query;
    if (!bookName) {
        return res.status(400).json({ error: 'O parâmetro "bookName" é obrigatório.' });
    }

    try {
        const [rows] = await dbPool.query(
            `SELECT p.name as projectName 
             FROM books b
             JOIN projects p ON b.projectId = p.id
             WHERE b.name = ?`,
            [bookName]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: `Projeto não encontrado para o livro '${bookName}'.` });
        }
        
        return res.json({ projectName: rows[0].projectName });

    } catch (err) {
        console.error(`Erro ao buscar projeto para o livro '${bookName}':`, err);
        res.status(500).json({ error: 'Erro interno ao comunicar com a base de dados.' });
    }
});


app.post('/api/upload/thumbnail', upload.single('thumbnail'), (req, res) => {
    const file = req.file;
    const { originalName, bookName } = req.body;

    if (!file || !originalName || !bookName) {
        return res.status(400).json({ error: 'Ficheiro, nome original e nome do livro são obrigatórios.' });
    }
    
    try {
        const bookThumbDir = path.join(publicThumbsPath, bookName);
        if (!fs.existsSync(bookThumbDir)) {
            fs.mkdirSync(bookThumbDir, { recursive: true });
        }
        
        const thumbPath = path.join(bookThumbDir, originalName);
        fs.writeFileSync(thumbPath, file.buffer);
        console.log(`Thumbnail '${originalName}' guardada em ${thumbPath}`);
        res.status(200).json({ message: "Thumbnail recebida com sucesso." });
    } catch (error) {
        console.error("Erro ao guardar thumbnail:", error);
        res.status(500).json({ error: "Erro ao guardar a miniatura no servidor." });
    }
});

app.post('/api/workflow/move', async (req, res) => {
    const { bookName, fromStatus, toStatus } = req.body;
    let connection;

    if (!bookName || !fromStatus || !toStatus) {
        return res.status(400).json({ error: 'Os campos bookName, fromStatus e toStatus são obrigatórios.' });
    }

    try {
        connection = await dbPool.getConnection();
        
        const [bookDetailsRows] = await connection.query(
            `SELECT p.name as projectName 
             FROM books b
             JOIN projects p ON b.projectId = p.id
             WHERE b.name = ?`,
            [bookName]
        );

        if (bookDetailsRows.length === 0) {
             const errorMessage = `Livro '${bookName}' ou seu projeto associado não foi encontrado.`;
             console.error(errorMessage);
             return res.status(404).json({ error: errorMessage });
        }
        const { projectName } = bookDetailsRows[0];

        const [statusRows] = await connection.query(
            `SELECT name, folderName FROM document_statuses WHERE name IN (?, ?)`,
            [fromStatus, toStatus]
        );
        
        const fromFolder = statusRows.find(r => r.name === fromStatus)?.folderName;
        const toFolder = statusRows.find(r => r.name === toStatus)?.folderName;

        if (!fromFolder || !toFolder) {
            console.info(`Transição de '${fromStatus}' para '${toStatus}' é puramente lógica. Nenhum ficheiro movido.`);
            return res.status(200).json({ message: "Transição lógica, nenhuma pasta movida." });
        }
        
        const [logRows] = await connection.query(
            `SELECT s.root_path, sc.nome as scannerName
             FROM log_transferencias lt
             JOIN storages s ON lt.storage_id = s.id
             JOIN scanners sc ON lt.scanner_id = sc.id
             WHERE lt.nome_pasta = ? AND lt.status = 'sucesso'
             ORDER BY lt.data_fim DESC
             LIMIT 1`,
            [bookName]
        );

        if (logRows.length === 0) {
            const errorMessage = `Nenhum registo de transferência bem-sucedida encontrado para o livro '${bookName}'. A pasta não pode ser movida.`;
            console.error(errorMessage);
            return res.status(404).json({ error: errorMessage });
        }

        const { root_path, scannerName } = logRows[0];
        const sourcePath = path.join(root_path, fromFolder, projectName, scannerName, bookName);
        const destinationPath = path.join(root_path, toFolder, projectName, scannerName, bookName);

        if (!fs.existsSync(sourcePath)) {
            const errorMessage = `A pasta de origem '${sourcePath}' não foi encontrada no storage. O movimento foi abortado.`;
            console.error(errorMessage);
            return res.status(404).json({ error: errorMessage });
        }
        
        if (fs.existsSync(destinationPath)) {
            const warningMessage = `A pasta de destino '${destinationPath}' já existe. A pasta de origem não será movida para evitar sobreposição.`;
            console.warn(warningMessage);
            return res.status(200).json({ message: warningMessage });
        }
        
        if (!fs.existsSync(path.dirname(destinationPath))) {
            fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
        }

        fs.renameSync(sourcePath, destinationPath);
        console.log(`Pasta '${bookName}' movida de '${sourcePath}' para '${destinationPath}'.`);
        return res.status(200).json({ message: `Pasta '${bookName}' movida com sucesso de '${fromFolder}' para '${toFolder}'.` });

    } catch (err) {
        console.error(`Erro no endpoint /api/workflow/move para o livro '${bookName}':`, err);
        res.status(500).json({ error: 'Erro interno do servidor ao tentar mover a pasta.' });
    } finally {
        if (connection) connection.release();
    }
});


app.post('/api/scan/complete', async (req, res) => {
    const { bookId, fileList, storageId, scannerId } = req.body;

    if (!bookId || !fileList || !Array.isArray(fileList) || !storageId || !scannerId) {
        return res.status(400).json({ error: 'bookId, fileList (array), storageId e scannerId são obrigatórios.' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        const [bookRows] = await connection.query(
            `SELECT b.name AS bookName, b.projectId, p.clientId 
             FROM books b
             JOIN projects p ON b.projectId = p.id
             WHERE b.id = ?`, 
            [bookId]
        );
        if (bookRows.length === 0) {
            throw new Error(`Livro com ID ${bookId} ou projeto associado não encontrado.`);
        }
        const { bookName, projectId, clientId } = bookRows[0];

        if (fileList.length > 0) {
            const documentsToInsert = fileList.map((file, index) => {
                const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${index}`;
                const docName = `${bookName} - Page ${index + 1}`;
                const thumbUrl = `${config.server.api_base_url}${config.server.public_thumbs_route}${file.imageUrl}`;

                return [
                    docId, docName, clientId, 'Scanned Page', new Date(), '[]',
                    projectId, bookId, thumbUrl
                ];
            });

            await connection.query(
                `INSERT INTO documents (id, name, clientId, type, lastUpdated, tags, projectId, bookId, imageUrl) VALUES ?`,
                [documentsToInsert]
            );
        }

        const [statusRows] = await connection.query("SELECT id FROM document_statuses WHERE name = 'Storage'");
        if (statusRows.length === 0) throw new Error("Estado 'Storage' não encontrado.");
        const storageStatusId = statusRows[0].id;
        
        await connection.query(
            "UPDATE books SET statusId = ?, scanEndTime = NOW(), expectedDocuments = ? WHERE id = ?", 
            [storageStatusId, fileList.length, bookId]
        );

        // Registar na tabela log_transferencias
        await connection.query(
            `INSERT INTO log_transferencias (nome_pasta, bookId, total_tifs, storage_id, scanner_id, status, data_fim) 
             VALUES (?, ?, ?, ?, ?, 'sucesso', NOW())`,
            [bookName, bookId, fileList.length, storageId, scannerId]
        );

        await connection.commit();
        res.status(200).json({ message: "Processo de digitalização concluído e registado com sucesso." });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error(`Erro ao finalizar o processo para bookId ${bookId}:`, err);
        res.status(500).json({ error: `Erro interno ao finalizar o processo: ${err.message}` });
    } finally {
        if (connection) connection.release();
    }
});

// Função auxiliar para encontrar o documento
async function findDocumentByImageName(connection, bookId, imageName) {
    const [documents] = await connection.query(
        'SELECT id, imageUrl FROM documents WHERE bookId = ?',
        [bookId]
    );

    for (const doc of documents) {
        if (doc.imageUrl && path.parse(path.basename(doc.imageUrl)).name === path.parse(imageName).name) {
            return doc.id;
        }
    }
    return null;
}

// Endpoint para definir/atualizar a flag de um documento
app.post('/api/documents/:id/flag', async (req, res) => {
    const { id } = req.params;
    const { flag, comment } = req.body;

    if (!flag) {
        return res.status(400).json({ error: 'Campo "flag" é obrigatório.' });
    }
    if (!['error', 'warning', 'info'].includes(flag)) {
        return res.status(400).json({ error: 'O valor da flag é inválido.' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.query(
            'UPDATE documents SET flag = ?, flagComment = ? WHERE id = ?',
            [flag, comment || null, id]
        );
        res.status(200).json({ message: `Flag do documento '${id}' atualizada com sucesso para '${flag}'.` });
    } catch (err) {
        console.error("Erro ao definir a flag do documento:", err);
        res.status(500).json({ error: "Erro interno do servidor." });
    } finally {
        if (connection) connection.release();
    }
});

app.delete('/api/documents/:id/flag', async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.query(
            'UPDATE documents SET flag = NULL, flagComment = NULL WHERE id = ?',
            [id]
        );
        res.status(200).json({ message: `Flag do documento '${id}' removida com sucesso.` });
    } catch (err) {
        console.error("Erro ao limpar a flag do documento:", err);
        res.status(500).json({ error: "Erro interno do servidor." });
    } finally {
        if (connection) connection.release();
    }
});

// Endpoint para definir/atualizar a flag de um documento por nome de imagem
app.post('/api/documents/flag-by-image', async (req, res) => {
    const { bookId, imageName, flag, comment } = req.body;

    if (!bookId || !imageName || !flag) {
        return res.status(400).json({ error: 'Campos bookId, imageName, e flag são obrigatórios.' });
    }
    if (!['error', 'warning', 'info'].includes(flag)) {
        return res.status(400).json({ error: 'O valor da flag é inválido. Use "error", "warning", ou "info".' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        const documentId = await findDocumentByImageName(connection, bookId, imageName);

        if (!documentId) {
            return res.status(404).json({ error: 'Documento não encontrado com o bookId e imageName fornecidos.' });
        }

        await connection.query(
            'UPDATE documents SET flag = ?, flagComment = ? WHERE id = ?',
            [flag, comment || null, documentId]
        );

        res.status(200).json({ message: `Flag do documento '${documentId}' atualizada com sucesso para '${flag}'.` });

    } catch (err) {
        console.error("Erro ao definir a flag do documento:", err);
        res.status(500).json({ error: "Erro interno do servidor." });
    } finally {
        if (connection) connection.release();
    }
});

// Endpoint para limpar a flag de um documento por nome de imagem
app.delete('/api/documents/flag-by-image', async (req, res) => {
    const { bookId, imageName } = req.body;

    if (!bookId || !imageName) {
        return res.status(400).json({ error: 'Campos bookId e imageName são obrigatórios.' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        const documentId = await findDocumentByImageName(connection, bookId, imageName);

        if (!documentId) {
            return res.status(404).json({ error: 'Documento não encontrado com o bookId e imageName fornecidos.' });
        }

        await connection.query(
            'UPDATE documents SET flag = NULL, flagComment = NULL WHERE id = ?',
            [documentId]
        );

        res.status(200).json({ message: `Flag do documento '${documentId}' removida com sucesso.` });

    } catch (err) {
        console.error("Erro ao limpar a flag do documento:", err);
        res.status(500).json({ error: "Erro interno do servidor." });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/documents/:id/tags', async (req, res) => {
    const { id } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
        return res.status(400).json({ error: 'O campo "tags" é obrigatório e deve ser um array.' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.query(
            'UPDATE documents SET tags = ? WHERE id = ?',
            [JSON.stringify(tags), id]
        );
        res.status(200).json({ message: `Tags do documento '${id}' atualizadas com sucesso.` });
    } catch (err) {
        console.error("Erro ao atualizar as tags do documento:", err);
        res.status(500).json({ error: "Erro interno do servidor." });
    } finally {
        if (connection) connection.release();
    }
});

app.delete('/api/documents/:id/tags', async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.query(
            "UPDATE documents SET tags = '[]' WHERE id = ?",
            [id]
        );
        res.status(200).json({ message: `Tags do documento '${id}' removidas com sucesso.` });
    } catch (err) {
        console.error("Erro ao limpar as tags do documento:", err);
        res.status(500).json({ error: "Erro interno do servidor." });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/processing-batches/:id/details', async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await dbPool.getConnection();
        
        const [batchRows] = await connection.query(
            'SELECT * FROM processing_batches WHERE id = ?',
            [id]
        );

        if (batchRows.length === 0) {
            return res.status(404).json({ error: 'Lote de processamento não encontrado.' });
        }

        const [itemRows] = await connection.query(
            `SELECT 
                b.id, b.name, b.expectedDocuments, p.name as projectName,
                pbi.status, pbi.itemStartTime, pbi.itemEndTime
             FROM processing_batch_items pbi
             JOIN books b ON pbi.bookId = b.id
             JOIN projects p ON b.projectId = p.id
             WHERE pbi.batchId = ?`,
            [id]
        );

        const response = {
            batch: batchRows[0],
            books: itemRows
        };
        
        res.json(response);
    } catch (err) {
        console.error(`Erro ao buscar detalhes do lote ${id}:`, err);
        res.status(500).json({ error: 'Erro interno ao buscar detalhes do lote.' });
    } finally {
        if (connection) connection.release();
    }
});

// --- Inicialização do Servidor ---
async function startServer() {
    await initializeDbPool();
    await checkAndCreateFolders(); 
    const PORT = config.server.port || 4000;
    app.listen(PORT, () => {
      console.log(`API de Workflow a rodar na porta ${PORT}`);
    });
}

startServer();

    
