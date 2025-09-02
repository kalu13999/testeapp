import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get('bookId');
  
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    let query = 'SELECT * FROM book_observations';
    const params = [];

    if (bookId) {
      query += ' WHERE book_id = ?';
      params.push(bookId);
    }
    
    query += ' ORDER BY created_at DESC';

    const [rows] = await connection.execute(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching book_observations:", error);
    return NextResponse.json({ error: 'Failed to fetch book_observations' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const obsData = await request.json();
        const { book_id, user_id, observation, info } = obsData;

        if (!book_id || !user_id || !observation) {
            return NextResponse.json({ error: 'Missing required fields: book_id, user_id, and observation' }, { status: 400 });
        }
        
        const newId = `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        const newObservation = {
            id: newId,
            book_id,
            user_id,
            observation,
            created_at: createdAt,
            info: info || null,
        };
        
        connection = await getConnection();
        const query = 'INSERT INTO book_observations (id, book_id, user_id, observation, created_at, info) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [newId, book_id, user_id, observation, createdAt, info || null];
        
        await connection.execute(query, values);
        
        releaseConnection(connection);
        return NextResponse.json(newObservation, { status: 201 });
    } catch (error) {
        console.error("Error creating book observation:", error);
        if (connection) releaseConnection(connection);
        return NextResponse.json({ error: 'Failed to create book observation' }, { status: 500 });
    }
}
