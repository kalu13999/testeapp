
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { User } from '@/lib/data';
import bcrypt from 'bcrypt';

async function getEnrichedUser(connection: PoolConnection, userId: string) {
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
        return null;
    }
    const user = rows[0] as User;
    const [projectRows] = await connection.execute<RowDataPacket[]>('SELECT projectId FROM user_projects WHERE userId = ?', [userId]);
    user.projectIds = projectRows.map(p => p.projectId);
    return user;
}


export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [users] = await connection.execute<RowDataPacket[]>('SELECT * FROM users');
    const [userProjects] = await connection.execute<RowDataPacket[]>('SELECT * FROM user_projects');

    const userProjectsMap: { [userId: string]: string[] } = {};

    for (const up of userProjects) {
        if (!userProjectsMap[up.userId]) {
            userProjectsMap[up.userId] = [];
        }
        userProjectsMap[up.userId].push(up.projectId);
    }

    const enrichedUsers = users.map(user => {
        return {
            ...user,
            projectIds: userProjectsMap[user.id] || []
        };
    });

    return NextResponse.json(enrichedUsers);
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUserId = `u_${Date.now()}`;
    const newUser = {
      id: newUserId,
      username,
      password: hashedPassword,
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
      const projectValues = projectIds.map((projectId: string) => [newUserId, projectId]);
      await connection.query('INSERT INTO user_projects (userId, projectId) VALUES ?', [projectValues]);
    }
    
    await connection.commit();
    
    const finalUser = await getEnrichedUser(connection, newUserId);
    
    releaseConnection(connection);
    return NextResponse.json(finalUser, { status: 201 });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error creating user:", error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  } finally {
    if (connection) releaseConnection(connection);
  }
}
