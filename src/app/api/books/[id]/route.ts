import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM books WHERE id = ?', [id]);
    if (Array.isArray(rows) && rows.length === 0) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }
    return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
  } catch (error) {
    console.error(`Error fetching book ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch book' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        const bookData = await request.json();
        
        const fields = Object.keys(bookData);
        if (fields.length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        // Filter out fields that don't exist in the books table to prevent errors
        const allowedFields = ['name', 'status', 'expectedDocuments', 'priority', 'info', 'scannerUserId', 'scanStartTime', 'scanEndTime', 'indexerUserId', 'indexingStartTime', 'indexingEndTime', 'qcUserId', 'qcStartTime', 'qcEndTime', 'rejectionReason', 'author', 'isbn', 'publicationYear'];
        const filteredFields = fields.filter(field => allowedFields.includes(field));
        
        if (filteredFields.length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const query = `UPDATE books SET ${filteredFields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`;
        const values = [...filteredFields.map(field => bookData[field]), id];

        connection = await getConnection();
        await connection.execute(query, values);
        
        const [rows] = await connection.execute('SELECT * FROM books WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
    } catch (error) {
        console.error(`Error updating book ${id}:`, error);
        return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        connection = await getConnection();
        await connection.beginTransaction();

        // Delete associated documents first
        await connection.execute('DELETE FROM documents WHERE bookId = ?', [id]);
        // Delete associated audit logs
        await connection.execute('DELETE FROM audit_logs WHERE bookId = ?', [id]);
        // Delete associated processing logs
        await connection.execute('DELETE FROM processing_logs WHERE bookId = ?', [id]);
        // Then delete the book
        await connection.execute('DELETE FROM books WHERE id = ?', [id]);

        await connection.commit();
        
        releaseConnection(connection);
        return new Response(null, { status: 204 });
    } catch (error) {
        if(connection) await connection.rollback();
        console.error(`Error deleting book ${id}:`, error);
        return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
