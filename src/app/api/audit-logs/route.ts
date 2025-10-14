import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();

    // Join entre audit_logs e users
    const [rows] = await connection.execute(`
      SELECT 
        al.*, 
        u.name AS user 
      FROM audit_logs al
      LEFT JOIN users u ON al.userId = u.id
      ORDER BY al.date DESC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching enriched audit_logs:", error);
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
        const { action, details, userId, date, bookId, documentId } = logData;
        
        if (!action || !userId) {
            return NextResponse.json({ error: 'Missing required fields: action and userId' }, { status: 400 });
        }
        
        const formattedDate = date ? new Date(date).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ');

        const newId = `al_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        connection = await getConnection();
        const query = 'INSERT INTO audit_logs (id, action, details, userId, date, bookId, documentId) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const values = [newId, action, details || '', userId, formattedDate, bookId || null, documentId || null];
        
        await connection.execute(query, values);
        
        releaseConnection(connection);

        const newLog = { id: newId, action, details: details || '', userId, date: formattedDate, bookId, documentId };
        return NextResponse.json(newLog, { status: 201 });
    } catch (error) {
        console.error("Error creating audit log:", error);
        if (connection) releaseConnection(connection);
        return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
    }
}
