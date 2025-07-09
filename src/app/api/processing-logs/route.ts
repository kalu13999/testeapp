import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM processing_logs');
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
        const { bookId } = await request.json();
        
        const newLog = {
            id: `pl_${Date.now()}`,
            bookId,
            status: 'In Progress',
            progress: 0,
            log: `[${new Date().toLocaleTimeString()}] Processing initiated.`,
            startTime: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
        };
        
        connection = await getConnection();
        const query = 'INSERT INTO processing_logs (id, bookId, status, progress, log, startTime, lastUpdate) VALUES (?, ?, ?, ?, ?, ?, ?)';
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
