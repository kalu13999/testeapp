import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT name FROM roles');
    const roleNames = Array.isArray(rows) ? rows.map((row: any) => row.name) : [];
    return NextResponse.json(roleNames);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}
