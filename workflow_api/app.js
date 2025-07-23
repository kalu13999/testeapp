
const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// --- Configuração ---
const configPath = path.join(__dirname, 'config', 'configs.json');
if (!fs.existsSync(configPath)) {
    console.error("ERRO: O ficheiro de configuração 'config/configs.json' não foi encontrado.");
    process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = express();
app.use(express.json());

// Servir a pasta pública de miniaturas do Servidor Central
const publicThumbsPath = config.folders.public_thumbs;
app.use('/thumbs', express.static(publicThumbsPath));

let dbPool;

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

        const [storages] = await dbPool.query("SELECT root_path FROM storages WHERE status = 'ativo'");

        if (storages.length === 0) {
            console.warn("Aviso: Nenhum storage ativo encontrado. Nenhuma pasta de workflow será criada.");
            return;
        }
        
        for (const storage of storages) {
            if (storage.root_path) {
                console.log(`A verificar pastas para o storage em: ${storage.root_path}`);
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


// --- Endpoints da API ---

app.get('/api/config/all', async (req, res) => {
    try {
        const [scanners] = await dbPool.query("SELECT id, nome, ip, scanner_root_folder, error_folder, success_folder, local_thumbs_path FROM scanners WHERE status = 'ativo'");
        const [storages] = await dbPool.query("SELECT id, nome, ip, root_path, thumbs_path, percentual_minimo_diario, minimo_diario_fixo, peso FROM storages WHERE status = 'ativo'");
        const today = new Date().toISOString().slice(0, 10);
        const [stats] = await dbPool.query('SELECT storage_id, total_tifs_enviados FROM envio_diario WHERE data = ?', [today]);

        res.json({
            scanners,
            storages,
            stats,
            remotePublicThumbsPath: config.folders.public_thumbs
        });

    } catch (err) {
        console.error('Erro ao buscar configuração completa:', err);
        res.status(500).json({ error: 'Erro interno ao buscar configuração.' });
    }
});


app.post('/api/books/byname', async (req, res) => {
  const { bookName } = req.body;
  if (!bookName) {
      return res.status(400).json({ error: 'Campo "bookName" é obrigatório.' });
  }

  try {
    const [rows] = await dbPool.query(
        'SELECT id FROM books WHERE name = ?', 
        [bookName]
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

app.post('/api/scan/complete', async (req, res) => {
    const { bookId, fileList, logId } = req.body;
    if (!bookId || !fileList || !Array.isArray(fileList) || !logId) {
        return res.status(400).json({ error: 'bookId, fileList e logId são obrigatórios.' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        const [bookRows] = await connection.query(
            `SELECT b.projectId, p.clientId 
             FROM books b
             JOIN projects p ON b.projectId = p.id
             WHERE b.id = ?`, 
            [bookId]
        );
        if (bookRows.length === 0) {
            throw new Error(`Livro com ID ${bookId} ou projeto associado não encontrado.`);
        }
        const { projectId, clientId } = bookRows[0];

        if (fileList.length > 0) {
            const documentsToInsert = fileList.map(file => {
                const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                return [
                    docId,
                    file.fileName,
                    clientId,
                    'Scanned Page',
                    new Date(),
                    '[]',
                    projectId,
                    bookId,
                    file.imageUrl
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
        
        await connection.query("UPDATE books SET statusId = ?, scanEndTime = NOW(), expectedDocuments = ? WHERE id = ?", [storageStatusId, fileList.length, bookId]);

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
