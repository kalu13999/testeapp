
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const { id: deliveryId } = params;
    const { finalDecision } = await request.json(); // 'approve_remaining' or 'reject_all'

    if (!finalDecision || !['approve_remaining', 'reject_all'].includes(finalDecision)) {
        return NextResponse.json({ error: 'A valid finalDecision is required.' }, { status: 400 });
    }

    let connection: PoolConnection | null = null;

    try {
        connection = await getConnection();
        await connection.beginTransaction();

        const [items] = await connection.execute<RowDataPacket[]>(
            'SELECT id, bookId, status FROM delivery_batch_items WHERE deliveryId = ?',
            [deliveryId]
        );

        if (items.length === 0) {
            await connection.commit();
            releaseConnection(connection);
            return NextResponse.json({ message: 'No items in this batch to finalize.' }, { status: 200 });
        }
        
        const [statusRows] = await connection.execute<RowDataPacket[]>(
            "SELECT id, name FROM document_statuses WHERE name IN ('Finalized', 'Client Rejected')"
        );
        const finalizedStatusId = statusRows.find(s => s.name === 'Finalized')?.id;
        const rejectedStatusId = statusRows.find(s => s.name === 'Client Rejected')?.id;

        if (!finalizedStatusId || !rejectedStatusId) {
            throw new Error("Could not find 'Finalized' or 'Client Rejected' statuses.");
        }

        for (const item of items) {
            let targetStatusId;
            if (finalDecision === 'reject_all') {
                targetStatusId = rejectedStatusId;
            } else { // approve_remaining
                if (item.status === 'rejected') {
                    targetStatusId = rejectedStatusId;
                } else { // 'approved' or 'pending'
                    targetStatusId = finalizedStatusId;
                }
            }
            
            await connection.execute(
                'UPDATE books SET statusId = ? WHERE id = ?',
                [targetStatusId, item.bookId]
            );
        }

        await connection.execute(
            "UPDATE delivery_batches SET status = 'Finalized', deliveryDate = ? WHERE id = ?",
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
