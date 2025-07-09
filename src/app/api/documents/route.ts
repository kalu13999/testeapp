import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM documents');
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const docData = await request.json();
        
        connection = await getConnection();
        const query = 'INSERT INTO documents (id, name, clientId, statusId, type, lastUpdated, tags, folderId, projectId, bookId, flag, flagComment, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        
        const values = [
            docData.id, 
            docData.name, 
            docData.clientId, 
            docData.statusId, 
            docData.type,
            docData.lastUpdated, 
            JSON.stringify(docData.tags || []), 
            docData.folderId ?? null, 
            docData.projectId, 
            docData.bookId,
            docData.flag ?? null, 
            docData.flagComment ?? null, 
            docData.imageUrl ?? null
        ];
        
        await connection.execute(query, values);
        
        releaseConnection(connection);
        return NextResponse.json(docData, { status: 201 });
    } catch (error) {
        console.error("Error creating document:", error);
        return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
