
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { User } from '@/lib/data';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [id]);
    if (Array.isArray(rows) && rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = Array.isArray(rows) ? rows[0] : null;

    if (user) {
        const [projectRows] = await connection.execute<RowDataPacket[]>('SELECT projectId FROM user_projects WHERE userId = ?', [id]);
        (user as User).projectIds = projectRows.map((p: any) => p.projectId);
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let connection: PoolConnection | null = null;
  try {
    const userData = await request.json();
    const { name, email, username, password, role, phone, jobTitle, department, info, clientId, projectIds, lastLogin } = userData;

    connection = await getConnection();
    await connection.beginTransaction();

    const updateFields: { [key: string]: any } = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (username !== undefined) updateFields.username = username;
    if (password) updateFields.password = password;
    if (role !== undefined) updateFields.role = role;
    if (phone !== undefined) updateFields.phone = phone;
    if (jobTitle !== undefined) updateFields.jobTitle = jobTitle;
    if (department !== undefined) updateFields.department = department;
    if (info !== undefined) updateFields.info = info;
    if (lastLogin !== undefined) updateFields.lastLogin = lastLogin;
    
    // Explicitly handle clientId based on role
    if (role !== undefined) {
      updateFields.clientId = ['Client', 'Client Manager', 'Client Operator'].includes(role) ? clientId : null;
    }
    
    if (userData.defaultProjectId !== undefined) updateFields.defaultProjectId = userData.defaultProjectId;
    
    if (Object.keys(updateFields).length > 0) {
      const query = `UPDATE users SET ${Object.keys(updateFields).map(key => `${key} = ?`).join(', ')} WHERE id = ?`;
      const values = [...Object.values(updateFields), id];
      await connection.execute(query, values);
    }

    // Always update project associations, but clear them for client roles
    if (projectIds !== undefined) {
      await connection.execute('DELETE FROM user_projects WHERE userId = ?', [id]);
      if (Array.isArray(projectIds) && projectIds.length > 0 && role && !['Admin', 'Client', 'Client Manager', 'Client Operator'].includes(role)) {
        const projectValues = projectIds.map((projectId: string) => [id, projectId]);
        await connection.query('INSERT INTO user_projects (userId, projectId) VALUES ?', [projectValues]);
      }
    }
    
    await connection.commit();

    const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
    const finalUser = Array.isArray(rows) ? rows[0] as User : null;
    if (finalUser) {
        const [projectRows] = await connection.execute('SELECT projectId FROM user_projects WHERE userId = ?', [id]) as RowDataPacket[][];
        finalUser.projectIds = projectRows.map(p => p.projectId);
    }

    releaseConnection(connection);
    return NextResponse.json(finalUser);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error updating user ${id}:`, error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  } finally {
    if (connection && connection.connection) releaseConnection(connection);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        const { status } = await request.json();

        if (!status || !['active', 'disabled'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status provided' }, { status: 400 });
        }

        connection = await getConnection();
        await connection.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
        
        const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
    } catch (error) {
        console.error(`Error updating user status for ${id}:`, error);
        return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}


export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    await connection.execute('DELETE FROM users WHERE id = ?', [id]);
    
    releaseConnection(connection);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  } finally {
    if (connection) releaseConnection(connection);
  }
}
