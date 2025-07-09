import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT 1 + 1 AS result');
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("Database connection test failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}
