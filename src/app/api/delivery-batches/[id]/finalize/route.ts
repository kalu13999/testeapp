
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const { id: deliveryId } = params;
    let connection: PoolConnection | null = null;

    try {
        connection = await getConnection();
        await connection.beginTransaction();

        // Get all items for the batch
        const [items] = await connection.execute<RowDataPacket[]>(
            'SELECT bookId, status FROM delivery_batch_items WHERE deliveryId = ?',
            [deliveryId]
        );

        if (items.length === 0) {
            await connection.commit();
            releaseConnection(connection);
            return NextResponse.json({ message: 'No items in this batch to finalize.' }, { status: 200 });
        }
        
        // Get status IDs for 'Finalized' and 'Client Rejected'
        const [statusRows] = await connection.execute<RowDataPacket[]>(
            "SELECT id, name FROM document_statuses WHERE name IN ('Finalized', 'Client Rejected')"
        );
        const finalizedStatusId = statusRows.find(s => s.name === 'Finalized')?.id;
        const rejectedStatusId = statusRows.find(s => s.name === 'Client Rejected')?.id;

        if (!finalizedStatusId || !rejectedStatusId) {
            throw new Error("Could not find 'Finalized' or 'Client Rejected' statuses.");
        }

        // Process each book based on its item status
        for (const item of items) {
            const isApproved = item.status === 'approved' || item.status === 'pending';
            const targetStatusId = isApproved ? finalizedStatusId : rejectedStatusId;
            
            await connection.execute(
                'UPDATE books SET statusId = ? WHERE id = ?',
                [targetStatusId, item.bookId]
            );
        }

        // Update the delivery batch status to 'Delivered'
        await connection.execute(
            "UPDATE delivery_batches SET status = 'Delivered', deliveryDate = ? WHERE id = ?",
            [new Date(), deliveryId]
        );

        await connection.commit();
        
        const [updatedBatch] = await connection.execute<RowDataPacket[]>('SELECT * FROM delivery_batches WHERE id = ?', [deliveryId]);

        releaseConnection(connection);

        return NextResponse.json({ success: true, batch: updatedBatch[0] });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Error finalizing delivery batch ${deliveryId}:`, error);
        return NextResponse.json({ error: 'Failed to finalize delivery batch' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
