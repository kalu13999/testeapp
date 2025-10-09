import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcrypt'

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
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      releaseConnection(connection);
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 403 });
    }
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await connection.execute('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, id]);
    
    releaseConnection(connection);
    return NextResponse.json({ message: 'Password updated successfully.' });

  } catch (error) {
    console.error(`Error changing password for user ${id}:`, error);
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  } finally {
    if (connection) releaseConnection(connection);
  }
}
