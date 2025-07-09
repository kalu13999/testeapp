
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const { bookId, newStatusId } = await request.json();

        if (!bookId || !newStatusId) {
            return NextResponse.json({ error: 'Missing required fields: bookId and newStatusId' }, { status: 400 });
        }
        
        connection = await getConnection();
        
        const query = 'UPDATE documents SET statusId = ? WHERE bookId = ?';
        const values = [newStatusId, bookId];
        
        await connection.execute(query, values);
        
        releaseConnection(connection);
        return NextResponse.json({ success: true, message: `Documents for book ${bookId} updated.` });

    } catch (error) {
        console.error("Error bulk updating document statuses:", error);
        if (connection) releaseConnection(connection);
        return NextResponse.json({ error: 'Failed to bulk update document statuses' }, { status: 500 });
    }
}
