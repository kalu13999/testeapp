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
