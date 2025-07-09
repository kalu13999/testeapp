import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM rejection_tags');
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching rejection_tags:", error);
    return NextResponse.json({ error: 'Failed to fetch rejection_tags' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const tagData = await request.json();
        const { label, description, clientId } = tagData;

        if (!label || !description || !clientId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        const newId = `rt_${Date.now()}`;
        const newTag = { id: newId, ...tagData };
        
        connection = await getConnection();
        const query = 'INSERT INTO rejection_tags (id, label, description, clientId) VALUES (?, ?, ?, ?)';
        const values = [newId, label, description, clientId];
        
        await connection.execute(query, values);
        
        releaseConnection(connection);
        return NextResponse.json(newTag, { status: 201 });
    } catch (error) {
        console.error("Error creating rejection_tag:", error);
        return NextResponse.json({ error: 'Failed to create rejection_tag' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
