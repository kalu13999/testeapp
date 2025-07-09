import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        const tagData = await request.json();
        const { label, description } = tagData;

        connection = await getConnection();
        const query = 'UPDATE rejection_tags SET label = ?, description = ? WHERE id = ?';
        await connection.execute(query, [label, description, id]);
        
        const [rows] = await connection.execute('SELECT * FROM rejection_tags WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
    } catch (error) {
        console.error(`Error updating rejection_tag ${id}:`, error);
        return NextResponse.json({ error: 'Failed to update rejection_tag' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        connection = await getConnection();
        await connection.execute('DELETE FROM rejection_tags WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return new Response(null, { status: 204 });
    } catch (error) {
        console.error(`Error deleting rejection_tag ${id}:`, error);
        return NextResponse.json({ error: 'Failed to delete rejection_tag' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
