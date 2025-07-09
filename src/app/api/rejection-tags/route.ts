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
