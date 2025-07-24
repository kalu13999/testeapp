
const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// --- Configuração ---
const configPath = path.join(__dirname, 'config', 'configs.json');
if (!fs.existsSync(configPath)) {
    console.error("ERRO: O ficheiro de configuração 'config/configs.json' não foi encontrado.");
    process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = express();
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



function normalizePath(path) {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
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


app.post('/api/scan/complete', async (req, res) => {
    const { bookId, fileList } = req.body;
    if (!bookId || !fileList || !Array.isArray(fileList)) {
        return res.status(400).json({ error: 'bookId e fileList (array) são obrigatórios.' });
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
                
                const baseUrl = config.server.api_base_url.replace(/\/+$/, ''); // remove barra final
                const publicRoute = normalizePath(config.server.public_thumbs_route);
                const imagePath = normalizePath(file.imageUrl);

                const thumbUrl = `${baseUrl}/${publicRoute}/${imagePath}`;

                return [
                    docId,
                    docName,
                    clientId,
                    'Scanned Page',
                    new Date(),
                    '[]',
                    projectId,
                    bookId,
                    thumbUrl
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
