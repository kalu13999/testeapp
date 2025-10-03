import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM clients WHERE id = ?', [id]);
    if (Array.isArray(rows) && rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
  } catch (error) {
    console.error(`Error fetching client ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = await params;
    let connection: PoolConnection | null = null;
    try {
        const clientData = await request.json();
        
        connection = await getConnection();
        const query = 'UPDATE clients SET name = ?, contactEmail = ?, contactPhone = ?, address = ?, website = ?, since = ?, info = ? WHERE id = ?';
        const values = [
            clientData.name, 
            clientData.contactEmail, 
            clientData.contactPhone, 
            clientData.address, 
            clientData.website, 
            clientData.since, 
            clientData.info, 
            id
        ];
        
        await connection.execute(query, values);
        
        releaseConnection(connection);
        return NextResponse.json({ id, ...clientData });
    } catch (error) {
        console.error(`Error updating client ${id}:`, error);
        if (connection) releaseConnection(connection);
        return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        connection = await getConnection();
        await connection.execute('DELETE FROM clients WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return new Response(null, { status: 204 });
    } catch (error: any) {
        console.error(`Error deleting client ${id}:`, error);
        // Check for foreign key constraint error (code for MariaDB/MySQL)
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
             return NextResponse.json({ error: 'Cannot delete client with associated projects.' }, { status: 409 });
        }
        if (connection) releaseConnection(connection);
        return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
    }
}
