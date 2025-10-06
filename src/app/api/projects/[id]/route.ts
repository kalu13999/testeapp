
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

async function getEnrichedProject(connection: PoolConnection, projectId: string) {
    const [rows] = await connection.execute<RowDataPacket[]>(`
        SELECT
            p.*,
            c.name AS clientName,
            (SELECT COUNT(id) FROM books WHERE projectId = p.id) AS bookCount,
            COALESCE((SELECT SUM(b.expectedDocuments) FROM books b WHERE b.projectId = p.id), 0) AS totalExpected
        FROM
            projects p
        LEFT JOIN
            clients c ON p.clientId = c.id
        WHERE p.id = ?
    `, [projectId]);

    if (rows.length === 0) return null;

    const project = rows[0];
    const documentCount = project.documentCount || 0;
    const progress = project.totalExpected > 0 ? (documentCount / project.totalExpected) * 100 : 0;
    
    return {
      ...project,
      books: [], // Books are associated on the client in the context
      documentCount,
      progress: Math.min(100, progress)
    };
}


export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const project = await getEnrichedProject(connection, id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json(project);
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
        
        const updatedProject = await getEnrichedProject(connection, id);
        
        releaseConnection(connection);
        return NextResponse.json(updatedProject);
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
        await connection.beginTransaction();

        // Must delete related records in correct order to avoid FK constraints
        const [bookIdsResult] = await connection.execute<RowDataPacket[]>('SELECT id FROM books WHERE projectId = ?', [id]);
        const bookIds = bookIdsResult.map(row => row.id);

        if (bookIds.length > 0) {
            const placeholders = bookIds.map(() => '?').join(',');
            await connection.execute(`DELETE FROM documents WHERE bookId IN (${placeholders})`, bookIds);
            await connection.execute(`DELETE FROM audit_logs WHERE bookId IN (${placeholders})`, bookIds);
            await connection.execute(`DELETE FROM processing_batch_items WHERE bookId IN (${placeholders})`, bookIds);
        }
        await connection.execute('DELETE FROM books WHERE projectId = ?', [id]);
        await connection.execute('DELETE FROM project_workflows WHERE projectId = ?', [id]);
        await connection.execute('DELETE FROM user_projects WHERE projectId = ?', [id]);
        await connection.execute('DELETE FROM projects WHERE id = ?', [id]);
        
        await connection.commit();
        releaseConnection(connection);
        return new Response(null, { status: 204 });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Error deleting project ${id}:`, error);
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}
