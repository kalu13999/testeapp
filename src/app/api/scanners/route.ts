
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM scanners');
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching scanners:", error);
    return NextResponse.json({ error: 'Failed to fetch scanners' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const scannerData = await request.json();
        
        const { nome, ip, scanner_root_folder, error_folder, success_folder, local_thumbs_path, status } = scannerData;

        if (!nome || !ip || !scanner_root_folder || !error_folder || !success_folder || !local_thumbs_path || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        const newId = `sc_${Date.now()}`;
        const newScanner = { id: newId, ...scannerData };
        
        connection = await getConnection();
        const query = 'INSERT INTO scanners (id, nome, ip, scanner_root_folder, error_folder, success_folder, local_thumbs_path, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [newId, nome, ip, scanner_root_folder, error_folder, success_folder, local_thumbs_path, status];
        
        await connection.execute(query, values);
        
        releaseConnection(connection);
        return NextResponse.json(newScanner, { status: 201 });
    } catch (error) {
        console.error("Error creating scanner:", error);
        return NextResponse.json({ error: 'Failed to create scanner' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
