
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = await params;
    let connection: PoolConnection | null = null;
    try {
        const storageData = await request.json();
        
        connection = await getConnection();
        const query = 'UPDATE storages SET nome = ?, ip = ?, root_path = ?, thumbs_path = ?, percentual_minimo_diario = ?, minimo_diario_fixo = ?, peso = ?, status = ? WHERE id = ?';
        const values = [
            storageData.nome, 
            storageData.ip, 
            storageData.root_path, 
            storageData.thumbs_path,
            storageData.percentual_minimo_diario,
            storageData.minimo_diario_fixo,
            storageData.peso,
            storageData.status,
            id
        ];
        
        await connection.execute(query, values);
        
        const [rows] = await connection.execute('SELECT * FROM storages WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
    } catch (error) {
        console.error(`Error updating storage ${id}:`, error);
        return NextResponse.json({ error: 'Failed to update storage' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        connection = await getConnection();
        await connection.execute('DELETE FROM storages WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return new Response(null, { status: 204 });
    } catch (error) {
        console.error(`Error deleting storage ${id}:`, error);
        return NextResponse.json({ error: 'Failed to delete storage' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}
