
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const { batchId, assignments } = await request.json();

        if (!batchId || !Array.isArray(assignments)) {
            return NextResponse.json({ error: 'batchId and an array of assignments are required.' }, { status: 400 });
        }

        connection = await getConnection();
        await connection.beginTransaction();

        for (const assignment of assignments) {
            const { itemId, userId } = assignment;
            if (itemId && userId) {
                 await connection.execute(
                    'UPDATE delivery_batch_items SET user_id = ? WHERE id = ? AND deliveryId = ?',
                    [userId, itemId, batchId]
                );
            }
        }
        
        await connection.execute(
            "UPDATE delivery_batches SET status = 'Validating' WHERE id = ?",
            [batchId]
        );

        await connection.commit();
        
        const [updatedBatch] = await connection.execute('SELECT * FROM delivery_batches WHERE id = ?', [batchId]);
        const [updatedItems] = await connection.execute('SELECT * FROM delivery_batch_items WHERE deliveryId = ?', [batchId]);

        releaseConnection(connection);
        
        return NextResponse.json({ 
            success: true, 
            batch: Array.isArray(updatedBatch) ? updatedBatch[0] : null,
            items: updatedItems 
        }, { status: 200 });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error distributing delivery batch:", error);
        return NextResponse.json({ error: 'Failed to distribute delivery batch' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
