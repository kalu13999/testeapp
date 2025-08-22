

import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        const { status, user_id } = await request.json();

        if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: 'A valid status ("pending", "approved", or "rejected") is required.' }, { status: 400 });
        }
        
        connection = await getConnection();
        
        let query: string;
        let values: (string | null)[];

        if (user_id) {
            query = 'UPDATE delivery_batch_items SET status = ?, user_id = ? WHERE id = ?';
            values = [status, user_id, id];
        } else {
            query = 'UPDATE delivery_batch_items SET status = ? WHERE id = ?';
            values = [status, id];
        }
        
        await connection.execute(query, values);
        
        const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM delivery_batch_items WHERE id = ?', [id]);
        
        releaseConnection(connection);
        
        if (rows.length === 0) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error(`Error updating delivery_batch_item ${id}:`, error);
        if (connection) releaseConnection(connection);
        return NextResponse.json({ error: 'Failed to update delivery batch item' }, { status: 500 });
    }
}
