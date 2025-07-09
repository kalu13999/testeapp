import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM permissions');
    // We need to group permissions by role
    const permissionsByRole: { [key: string]: string[] } = {};
    if (Array.isArray(rows)) {
      rows.forEach((row: any) => {
        if (!permissionsByRole[row.role]) {
          permissionsByRole[row.role] = [];
        }
        permissionsByRole[row.role].push(row.route);
      });
    }
    return NextResponse.json(permissionsByRole);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}
