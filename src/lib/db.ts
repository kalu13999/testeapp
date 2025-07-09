import mysql from 'mysql2/promise';
import type { PoolConnection } from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: true,
  }
};

const pool = mysql.createPool(dbConfig);

export async function getConnection() {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export function releaseConnection(connection: PoolConnection) {
  connection.release();
}

pool.on('error', err => {
  console.error('Database pool error:', err);
});
