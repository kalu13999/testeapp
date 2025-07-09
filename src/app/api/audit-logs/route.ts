import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM audit_logs ORDER BY date DESC');
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching audit_logs:", error);
    return NextResponse.json({ error: 'Failed to fetch audit_logs' }, { status: 500 });
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
        const { action = '', details = '', userId, date, bookId, documentId } = logData;
        
        // Ensure date is in a format MySQL/MariaDB can understand
        const formattedDate = date ? new Date(date).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ');

        const newId = `al_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        connection = await getConnection();
        const query = 'INSERT INTO audit_logs (id, action, details, userId, date, bookId, documentId) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const values = [newId, action, details, userId, formattedDate, bookId || null, documentId || null];
        
        await connection.execute(query, values);
        
        releaseConnection(connection);

        const newLog = { id: newId, action, details, userId, date: formattedDate, bookId, documentId };
        return NextResponse.json(newLog, { status: 201 });
    } catch (error) {
        console.error("Error creating audit log:", error);
        if (connection) releaseConnection(connection);
        return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
    }
}
