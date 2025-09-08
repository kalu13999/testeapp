import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        const logData = await request.json();
        
        const allowedFields = ['status', 'progress', 'log', 'lastUpdate'];
        const fieldsToUpdate = Object.keys(logData).filter(key => allowedFields.includes(key));
        
        if (fieldsToUpdate.length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const query = `UPDATE processing_logs SET ${fieldsToUpdate.map(field => `${field} = ?`).join(', ')} WHERE id = ?`;
        const values = [...fieldsToUpdate.map(field => logData[field]), id];

        connection = await getConnection();
        await connection.execute(query, values);
        
        const [rows] = await connection.execute('SELECT * FROM processing_logs WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
    } catch (error) {
        console.error(`Error updating processing_log ${id}:`, error);
        return NextResponse.json({ error: 'Failed to update processing_log' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}
