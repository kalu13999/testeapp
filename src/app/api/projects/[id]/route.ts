
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM projects WHERE id = ?', [id]);
    if (Array.isArray(rows) && rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(Array.isArray(rows) ? rows[0] : null);
  } catch (error) {
    console.error(`Error fetching project ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}


export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const { id } = await params;
    let connection: PoolConnection | null = null;
    try {
        const projectData = await request.json();
        
        connection = await getConnection();
        const query = 'UPDATE projects SET name = ?, clientId = ?, description = ?, startDate = ?, endDate = ?, budget = ?, status = ?, info = ? WHERE id = ?';
        const values = [
            projectData.name, 
            projectData.clientId, 
            projectData.description, 
            projectData.startDate, 
            projectData.endDate, 
            projectData.budget, 
            projectData.status, 
            projectData.info, 
            id
        ];
        
        await connection.execute(query, values);
        
        releaseConnection(connection);
        return NextResponse.json({ id, ...projectData });
    } catch (error) {
        console.error(`Error updating project ${id}:`, error);
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const { id } = params;
    let connection: PoolConnection | null = null;
    try {
        connection = await getConnection();
        // Foreign keys in other tables will handle cascading deletes or setting null.
        await connection.execute('DELETE FROM projects WHERE id = ?', [id]);
        
        releaseConnection(connection);
        return new Response(null, { status: 204 });
    } catch (error) {
        console.error(`Error deleting project ${id}:`, error);
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}
