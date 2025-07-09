import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let connection: PoolConnection | null = null;
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new passwords are required.' }, { status: 400 });
    }

    connection = await getConnection();
    
    // Get user to verify current password
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT password FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = rows[0];
    if (user.password !== currentPassword) {
      releaseConnection(connection);
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 403 });
    }
    
    // In a real app, you would hash the new password here.
    // For this project, we store it as plain text as per existing structure.
    await connection.execute('UPDATE users SET password = ? WHERE id = ?', [newPassword, id]);
    
    releaseConnection(connection);
    return NextResponse.json({ message: 'Password updated successfully.' });

  } catch (error) {
    console.error(`Error changing password for user ${id}:`, error);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  } finally {
    if (connection && connection.connection) releaseConnection(connection);
  }
}
