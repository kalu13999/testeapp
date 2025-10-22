

import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = await params;
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM documents WHERE id = ?', [id]);
    if (Array.isArray(rows) && rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    const doc = Array.isArray(rows) ? rows[0] : null;
    if (doc && doc.tags && typeof doc.tags === 'string' && doc.tags.trim() !== '') {
      try {
        doc.tags = JSON.parse(doc.tags);
      } catch (e) {
        console.warn(`Could not parse tags for document ${id}: ${doc.tags}`);
        doc.tags = [];
      }
    } else if (doc && !doc.tags || (doc && typeof doc.tags === 'string' && doc.tags.trim() === '')) {
      doc.tags = [];
    }
    return NextResponse.json(doc);
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
    const { id } = await params;
    let connection: PoolConnection | null = null;
    try {
        const body = await request.json();
        
        const allowedFields = ['flag', 'flagComment', 'tags'];
        const fieldsToUpdate = Object.keys(body).filter(key => allowedFields.includes(key));
        
        if (fieldsToUpdate.length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const valuesToUpdate: { [key: string]: any } = {};
        fieldsToUpdate.forEach(field => {
            if (field === 'tags' && Array.isArray(body[field])) {
                valuesToUpdate[field] = JSON.stringify(body[field]);
            } else if (field === 'flag' && body[field] === null) {
                valuesToUpdate[field] = null;
            } else {
                valuesToUpdate[field] = body[field];
            }
        });
        
        if (body.flag === null) {
            valuesToUpdate.flagComment = null;
            if (!fieldsToUpdate.includes('flagComment')) {
                fieldsToUpdate.push('flagComment');
            }
        }

        const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
        const query = `UPDATE documents SET ${setClause} WHERE id = ?`;
        const values = fieldsToUpdate.map(field => valuesToUpdate[field]).concat(id);

        connection = await getConnection();
        await connection.execute(query, values);
        
        const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM documents WHERE id = ?', [id]);
        
        releaseConnection(connection);
        const doc = Array.isArray(rows) ? rows[0] : null;
        if (doc && doc.tags && typeof doc.tags === 'string' && doc.tags.trim() !== '') {
          try {
            doc.tags = JSON.parse(doc.tags);
          } catch(e) {
            doc.tags = [];
          }
        } else if (doc) {
            doc.tags = [];
        }
        return NextResponse.json(doc);
    } catch (error) {
        console.error(`Error updating document ${id}:`, error);
        return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const { id } = await params;
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
        if (connection) releaseConnection(connection);
    }
}
