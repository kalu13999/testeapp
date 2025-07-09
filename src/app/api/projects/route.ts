
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';
import { WORKFLOW_SEQUENCE } from '@/lib/workflow-config';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM projects');
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}


export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const projectData = await request.json();
        const { name, clientId, description, startDate, endDate, budget, status, info } = projectData;

        if (!name || !clientId) {
            return NextResponse.json({ error: 'Missing required fields: name and clientId' }, { status: 400 });
        }
        
        const newProjectId = `proj_${Date.now()}`;
        const newProject = { id: newProjectId, ...projectData };

        connection = await getConnection();
        await connection.beginTransaction();

        // Insert into projects table
        const projectQuery = 'INSERT INTO projects (id, name, clientId, description, startDate, endDate, budget, status, info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const projectValues = [newProjectId, name, clientId, description, startDate, endDate, budget, status, info];
        await connection.execute(projectQuery, projectValues);
        
        // Insert default workflow
        const workflowValues = WORKFLOW_SEQUENCE.map(stage => [newProjectId, stage]);
        await connection.query('INSERT INTO project_workflows (projectId, stage) VALUES ?', [workflowValues]);
        
        await connection.commit();
        
        releaseConnection(connection);
        return NextResponse.json(newProject, { status: 201 });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error creating project:", error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
