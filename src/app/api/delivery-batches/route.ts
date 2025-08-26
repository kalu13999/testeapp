
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM delivery_batches ORDER BY creationDate DESC');
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching delivery batches:", error);
    return NextResponse.json({ error: 'Failed to fetch delivery batches' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const { bookIds, userId } = await request.json();
        if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
            return NextResponse.json({ error: 'An array of bookIds is required.' }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'A userId is required.' }, { status: 400 });
        }

        connection = await getConnection();
        await connection.beginTransaction();

        const newBatch = {
            id: `del_batch_${Date.now()}`,
            creationDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
            deliveryDate: null,
            status: 'Ready',
            userId: userId,
            info: `${bookIds.length} books added to delivery batch.`,
        };

        await connection.execute(
            'INSERT INTO delivery_batches (id, creationDate, deliveryDate, status, userId, info) VALUES (?, ?, ?, ?, ?, ?)',
            Object.values(newBatch)
        );

        for (const bookId of bookIds) {
            const newItem = {
                id: `del_item_${newBatch.id}_${bookId}`,
                deliveryId: newBatch.id,
                bookId: bookId,
                userId: null, // Changed from userId to null as requested
                status: 'pending', // Explicitly setting status on creation
                info: null,
                obs: null
            };
            await connection.execute(
                'INSERT INTO delivery_batch_items (id, deliveryId, bookId, user_id, status, info, obs) VALUES (?, ?, ?, ?, ?, ?, ?)',
                Object.values(newItem)
            );
        }
        
        await connection.commit();
        
        releaseConnection(connection);
        return NextResponse.json(newBatch, { status: 201 });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error creating delivery batch:", error);
        return NextResponse.json({ error: 'Failed to create delivery batch' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
