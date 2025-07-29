
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        const batchData = await request.json();
        
        const allowedFields = ['status', 'progress', 'endTime', 'info', 'obs'];
        const fieldsToUpdate = Object.keys(batchData).filter(key => allowedFields.includes(key));
        
        if (fieldsToUpdate.length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const query = `UPDATE processing_batches SET ${fieldsToUpdate.map(field => `${field} = ?`).join(', ')} WHERE id = ?`;
        const values = [...fieldsToUpdate.map(field => batchData[field]), id];

        connection = await getConnection();
        await connection.execute(query, values);
        
        const [rows] = await connection.execute('SELECT * FROM processing_batches WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
    } catch (error) {
        console.error(`Error updating batch ${id}:`, error);
        return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
