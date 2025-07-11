
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM documents WHERE id = ?', [id]);
    if (Array.isArray(rows) && rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
  } catch (error) {
    console.error(`Error fetching document ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        const body = await request.json();
        
        const allowedFields = ['flag', 'flagComment', 'tags'];
        const fieldsToUpdate = Object.keys(body).filter(key => allowedFields.includes(key));
        
        if (fieldsToUpdate.length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        // Handle tags array by stringifying it
        if (body.tags && Array.isArray(body.tags)) {
            body.tags = JSON.stringify(body.tags);
        }

        const query = `UPDATE documents SET ${fieldsToUpdate.map(field => `${field} = ?`).join(', ')} WHERE id = ?`;
        const values = [...fieldsToUpdate.map(field => body[field]), id];

        connection = await getConnection();
        await connection.execute(query, values);
        
        const [rows] = await connection.execute('SELECT * FROM documents WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
    } catch (error) {
        console.error(`Error updating document ${id}:`, error);
        return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        connection = await getConnection();
        await connection.execute('DELETE FROM documents WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return new Response(null, { status: 204 });
    } catch (error) {
        console.error(`Error deleting document ${id}:`, error);
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
