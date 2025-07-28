import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const projectId = params.id;
    const { workflow } = await request.json();

    if (!projectId || !Array.isArray(workflow)) {
        return NextResponse.json({ error: 'Project ID and a workflow array are required.' }, { status: 400 });
    }

    let connection: PoolConnection | null = null;
    try {
        connection = await getConnection();
        await connection.beginTransaction();

        // Delete existing workflow for the project
        await connection.execute('DELETE FROM project_workflows WHERE projectId = ?', [projectId]);

        // Insert new workflow stages if any
        if (workflow.length > 0) {
            const values = workflow.map(stage => [projectId, stage]);
            await connection.query('INSERT INTO project_workflows (projectId, stage) VALUES ?', [values]);
        }
        
        await connection.commit();
        
        releaseConnection(connection);
        return NextResponse.json({ success: true, projectId, workflow }, { status: 200 });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Error updating workflow for project ${projectId}:`, error);
        return NextResponse.json({ error: 'Failed to update project workflow' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
