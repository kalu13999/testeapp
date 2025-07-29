
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM processing_logs ORDER BY timestamp ASC');
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching processing_logs:", error);
    return NextResponse.json({ error: 'Failed to fetch processing_logs' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const logData = await request.json();
        const { batchId, message, level = 'INFO', info, obs } = logData;

        if (!batchId || !message) {
            return NextResponse.json({ error: 'Missing required fields: batchId and message' }, { status: 400 });
        }
        
        const newId = `plog_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        const newLog = {
            id: newId,
            batchId,
            message,
            timestamp,
            level,
            info: info || null,
            obs: obs || null
        };
        
        connection = await getConnection();
        const query = 'INSERT INTO processing_logs (id, batchId, message, timestamp, level, info, obs) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const values = Object.values(newLog);
        
        await connection.execute(query, values);
        
        releaseConnection(connection);
        return NextResponse.json(newLog, { status: 201 });
    } catch (error) {
        console.error("Error creating processing log:", error);
        return NextResponse.json({ error: 'Failed to create processing log' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
