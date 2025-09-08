
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        const scannerData = await request.json();
        
        const query = 'UPDATE scanners SET nome = ?, ip = ?, scanner_root_folder = ?, error_folder = ?, success_folder = ?, local_thumbs_path = ?, status = ?, obs = ? WHERE id = ?';
        const values = [
            scannerData.nome, 
            scannerData.ip, 
            scannerData.scanner_root_folder, 
            scannerData.error_folder,
            scannerData.success_folder,
            scannerData.local_thumbs_path,
            scannerData.status,
            scannerData.obs,
            id
        ];
        
        connection = await getConnection();
        await connection.execute(query, values);
        
        const [rows] = await connection.execute('SELECT * FROM scanners WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
    } catch (error) {
        console.error(`Error updating scanner ${id}:`, error);
        return NextResponse.json({ error: 'Failed to update scanner' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        connection = await getConnection();
        await connection.execute('DELETE FROM scanners WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return new Response(null, { status: 204 });
    } catch (error) {
        console.error(`Error deleting scanner ${id}:`, error);
        return NextResponse.json({ error: 'Failed to delete scanner' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}
