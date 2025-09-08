
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        const itemData = await request.json();
        
        const allowedFields = ['itemStartTime', 'itemEndTime', 'processedPages', 'status', 'info', 'obs'];
        const fieldsToUpdate = Object.keys(itemData).filter(key => allowedFields.includes(key));
        
        if (fieldsToUpdate.length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const valuesToUpdate: { [key: string]: any } = {};
        fieldsToUpdate.forEach(field => {
            if (field === 'processedPages' && typeof itemData[field] === 'object') {
                valuesToUpdate[field] = JSON.stringify(itemData[field]);
            } else {
                valuesToUpdate[field] = itemData[field];
            }
        });

        const query = `UPDATE processing_batch_items SET ${fieldsToUpdate.map(field => `${field} = ?`).join(', ')} WHERE id = ?`;
        const values = [...fieldsToUpdate.map(field => valuesToUpdate[field]), id];

        connection = await getConnection();
        await connection.execute(query, values);
        
        const [rows] = await connection.execute('SELECT * FROM processing_batch_items WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
    } catch (error) {
        console.error(`Error updating batch item ${id}:`, error);
        return NextResponse.json({ error: 'Failed to update batch item' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}
