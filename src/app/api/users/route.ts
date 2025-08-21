
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM users');
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function POST(request: Request) {
  let connection: PoolConnection | null = null;
  try {
    const userData = await request.json();
    const { name, email, username, password, role, phone, jobTitle, department, info, clientId, projectIds } = userData;

    if (!name || !username || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    connection = await getConnection();
    await connection.beginTransaction();

    const newUserId = `u_${Date.now()}`;
    const newUser = {
      id: newUserId,
      username,
      // In a real app, hash the password here.
      password: password || 'password', // Default password if not provided
      name,
      email: email || null,
      role,
      avatar: 'https://placehold.co/100x100.png',
      phone: phone || null,
      jobTitle: jobTitle || null,
      department: department || null,
      lastLogin: null,
      info: info || null,
      status: 'active',
      defaultProjectId: null,
      clientId: ['Client', 'Client Manager', 'Client Operator'].includes(role) ? clientId : null,
    };
    
    const userInsertQuery = `
      INSERT INTO users (id, username, password, name, email, role, avatar, phone, jobTitle, department, lastLogin, info, status, defaultProjectId, clientId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(userInsertQuery, Object.values(newUser));

    if (projectIds && Array.isArray(projectIds) && projectIds.length > 0 && !['Admin', 'Client', 'Client Manager', 'Client Operator'].includes(role)) {
      const projectValues = projectIds.map(projectId => [newUserId, projectId]);
      await connection.query('INSERT INTO user_projects (userId, projectId) VALUES ?', [projectValues]);
    }
    
    await connection.commit();
    
    // Fetch the newly created user to return it, including their project IDs
    const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [newUserId]);
    const finalUser = Array.isArray(rows) ? rows[0] as User : null;
    if (finalUser) {
        finalUser.projectIds = projectIds || [];
    }
    
    releaseConnection(connection);
    return NextResponse.json(finalUser, { status: 201 });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error creating user:", error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  } finally {
    if (connection && connection.connection) releaseConnection(connection);
  }
}
