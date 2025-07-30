
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM storages');
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching storages:", error);
    return NextResponse.json({ error: 'Failed to fetch storages' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const storageData = await request.json();
        
        const { nome, ip, root_path, thumbs_path, percentual_minimo_diario, minimo_diario_fixo, peso, status } = storageData;

        if (!nome || !ip || !root_path || !thumbs_path) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        const newId = `st_${Date.now()}`;
        const newStorage = { id: newId, ...storageData };
        
        connection = await getConnection();
        const query = 'INSERT INTO storages (id, nome, ip, root_path, thumbs_path, percentual_minimo_diario, minimo_diario_fixo, peso, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [newId, nome, ip, root_path, thumbs_path, percentual_minimo_diario, minimo_diario_fixo, peso, status];
        
        await connection.execute(query, values);
        
        releaseConnection(connection);
        return NextResponse.json(newStorage, { status: 201 });
    } catch (error) {
        console.error("Error creating storage:", error);
        return NextResponse.json({ error: 'Failed to create storage' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
