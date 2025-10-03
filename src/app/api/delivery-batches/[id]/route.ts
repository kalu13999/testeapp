
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = await params;
    let connection: PoolConnection | null = null;
    try {
        const { status } = await request.json();

        if (!status || !['Ready', 'Validating', 'Finalized'].includes(status)) {
            return NextResponse.json({ error: 'A valid status is required.' }, { status: 400 });
        }
        
        connection = await getConnection();
        
        let query: string;
        let values: (string | null)[];

        query = 'UPDATE delivery_batches SET status = ?, deliveryDate = ? WHERE id = ?';
        values = [status, new Date().toISOString().slice(0, 19).replace('T', ' '), id];
        
        await connection.execute(query, values);
        
        const [rows] = await connection.execute('SELECT * FROM delivery_batches WHERE id = ?', [id]);
        
        releaseConnection(connection);
        
        if (Array.isArray(rows) && rows.length === 0) {
            return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
        }

        return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
    } catch (error) {
        console.error(`Error updating delivery_batch ${id}:`, error);
        if (connection) releaseConnection(connection);
        return NextResponse.json({ error: 'Failed to update delivery batch' }, { status: 500 });
    }
}
