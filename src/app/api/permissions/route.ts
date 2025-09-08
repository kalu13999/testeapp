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

export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const { role, permissions } = await request.json();

        if (!role || !Array.isArray(permissions)) {
            return NextResponse.json({ error: 'Role and permissions array are required' }, { status: 400 });
        }
        
        connection = await getConnection();
        await connection.beginTransaction();

        // Check if role exists in roles table, if not, create it
        const [roleRows] = await connection.execute('SELECT name FROM roles WHERE name = ?', [role]);
        if ((roleRows as any[]).length === 0) {
            await connection.execute('INSERT INTO roles (name) VALUES (?)', [role]);
        }
        
        // Clear existing permissions for the role
        await connection.execute('DELETE FROM permissions WHERE role = ?', [role]);

        // Insert new permissions
        if (permissions.length > 0) {
            const values = permissions.map(route => [role, route]);
            await connection.query('INSERT INTO permissions (role, route) VALUES ?', [values]);
        }
        
        await connection.commit();
        
        releaseConnection(connection);
        return NextResponse.json({ success: true, role, permissions });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error updating permissions:", error);
        return NextResponse.json({ error: 'Failed to update permissions' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}

export async function DELETE(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const { role } = await request.json();

        if (!role) {
            return NextResponse.json({ error: 'Role is required' }, { status: 400 });
        }
        
        connection = await getConnection();
        await connection.beginTransaction();

        // Delete permissions and then role
        await connection.execute('DELETE FROM permissions WHERE role = ?', [role]);
        await connection.execute('DELETE FROM roles WHERE name = ?', [role]);
        
        await connection.commit();
        
        releaseConnection(connection);
        return NextResponse.json({ success: true, role });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error deleting role:", error);
        return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}
