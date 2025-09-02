-- Criação da nova tabela para observações do livro
CREATE TABLE book_observations (
    id VARCHAR(255) PRIMARY KEY,
    book_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    observation TEXT NOT NULL,
    info TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
