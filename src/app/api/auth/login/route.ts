import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { RowDataPacket, PoolConnection } from 'mysql2/promise';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  let connection: PoolConnection | null = null;

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    connection = await getConnection();

    const [rows] = await connection.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const user = rows[0];

    const hashedPassword = await bcrypt.hash(password, 10);
    //console.log("PASS:BCRYPT:", hashedPassword)
    
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    if (user.status === 'disabled') {
      return NextResponse.json({ error: 'Conta desativada' }, { status: 403 });
    }

    // Remover a password do retorno
    delete user.password;

    return NextResponse.json(user);
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json({ error: 'Erro interno no login' }, { status: 500 });
  } finally {
    if (connection) releaseConnection(connection);
  }
}