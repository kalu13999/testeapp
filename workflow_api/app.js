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
const publicThumbsPath = path.resolve(__dirname, config.folders.public_thumbs);
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
        // 1. Criar pasta pública de thumbs localmente
        if (!fs.existsSync(publicThumbsPath)) {
            fs.mkdirSync(publicThumbsPath, { recursive: true });
            console.log(`Pasta pública de miniaturas criada: ${publicThumbsPath}`);
        }

        // 2. Obter storages ativos para criar as pastas de workflow
        const [storages] = await dbPool.query("SELECT root_path FROM storages WHERE status = 'ativo'");

        if (storages.length === 0) {
            console.warn("Aviso: Nenhum storage ativo encontrado. Nenhuma pasta de workflow será criada.");
            return;
        }
        
        // 3. Iterar e criar as pastas para cada storage
        for (const storage of storages) {
            console.log(`A verificar pastas para o storage em: ${storage.root_path}`);
            for (const folderName of config.folders.workflow_stages) {
                const folderPath = path.join(storage.root_path, folderName);
                if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath, { recursive: true });
                    console.log(`   -> Criada: ${folderPath}`);
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


// --- Inicialização do Servidor ---
async function startServer() {
    await initializeDbPool();
    await checkAndCreateFolders(); // Chamar a nova função aqui
    const PORT = config.server.port || 4000;
    app.listen(PORT, () => {
      console.log(`API de Workflow a rodar na porta ${PORT}`);
    });
}

startServer();
