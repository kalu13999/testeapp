import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM clients ORDER BY name ASC');
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const clientData = await request.json();
        const { name, contactEmail, contactPhone, address, website, since, info } = clientData;

        if (!name) {
            return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
        }
        
        const newId = `cl_${Date.now()}`;
        const newClient = { id: newId, ...clientData };
        
        connection = await getConnection();
        const query = 'INSERT INTO clients (id, name, contactEmail, contactPhone, address, website, since, info) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [newId, name, contactEmail, contactPhone, address, website, since, info];
        
        await connection.execute(query, values);
        
        releaseConnection(connection);
        return NextResponse.json(newClient, { status: 201 });
    } catch (error) {
        console.error("Error creating client:", error);
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
