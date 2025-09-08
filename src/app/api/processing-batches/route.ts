
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [batches] = await connection.execute('SELECT * FROM processing_batches ORDER BY startTime DESC');
    
    return NextResponse.json(batches);
  } catch (error) {
    console.error("Error fetching processing batches:", error);
    return NextResponse.json({ error: 'Failed to fetch processing batches' }, { status: 500 });
  } finally {
    if (connection) releaseConnection(connection);
  }
}

export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const { bookIds } = await request.json();
        if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
            return NextResponse.json({ error: 'An array of bookIds is required.' }, { status: 400 });
        }

        connection = await getConnection();
        await connection.beginTransaction();

        const now = new Date();
        const startTime = now.toISOString().slice(0, 19).replace('T', ' ');
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = now.getDate().toString().padStart(2, '0');
        const month = monthNames[now.getMonth()];
        const year = now.getFullYear();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const timestampStr = `${day}-${month}-${year} (${hours}h-${minutes}min-${seconds}sec)`;
        
        const newBatch = {
            id: `batch_${Date.now()}`,
            startTime: startTime,
            endTime: null,
            status: 'In Progress',
            progress: 0,
            timestampStr: timestampStr,
            info: `${bookIds.length} books added to the batch.`,
            obs: null
        };

        await connection.execute(
            'INSERT INTO processing_batches (id, startTime, endTime, status, progress, timestampStr, info, obs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            Object.values(newBatch)
        );

        for (const bookId of bookIds) {
            const newItem = {
                id: `item_${newBatch.id}_${bookId}`,
                batchId: newBatch.id,
                bookId: bookId,
                itemStartTime: null,
                itemEndTime: null,
                processedPages: null,
                status: 'Pending',
                info: null,
                obs: null,
            };
            await connection.execute(
                'INSERT INTO processing_batch_items (id, batchId, bookId, itemStartTime, itemEndTime, processedPages, status, info, obs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                Object.values(newItem)
            );
        }
        
        const [statusRows] = await connection.execute('SELECT id FROM document_statuses WHERE name = ?', ['In Processing']);
        const inProcessingStatusId = (statusRows as any[])[0]?.id;
        if (!inProcessingStatusId) throw new Error("Status 'In Processing' not found.");
        
        const placeholders = bookIds.map(() => '?').join(',');
        await connection.execute(`UPDATE books SET statusId = ? WHERE id IN (${placeholders})`, [inProcessingStatusId, ...bookIds]);

        await connection.commit();
        
        releaseConnection(connection);
        return NextResponse.json(newBatch, { status: 201 });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error creating processing batch:", error);
        return NextResponse.json({ error: 'Failed to create processing batch' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}
