import { NextResponse, NextRequest } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';
import { WORKFLOW_SEQUENCE } from '@/lib/workflow-config';

/*export async function GET() {
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
}*/

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const enriched = searchParams.get('enriched') === 'true';

  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    
    if (enriched) {
      const [rows] = await connection.execute(`
        SELECT
            p.*,
            c.name AS clientName,
            (SELECT COUNT(id) FROM books WHERE projectId = p.id) AS bookCount,
            (SELECT SUM(expectedDocuments) FROM books WHERE projectId = p.id) AS totalExpected
        FROM
            projects p
        LEFT JOIN
            clients c ON p.clientId = c.id
      `);

      const projects = (rows as any[]).map(p => {
        const documentCountQuery = `
          SELECT COUNT(d.id) as documentCount 
          FROM documents d 
          JOIN books b ON d.bookId = b.id 
          WHERE b.projectId = ?
        `;
        // This is inefficient but necessary without a direct document-to-project link.
        // A better long-term solution would be a summary table.
        // For now, this is a placeholder and we assume documentCount is 0 to avoid N+1 queries.
        const documentCount = p.documentCount || 0; // Placeholder
        const progress = p.totalExpected > 0 ? (documentCount / p.totalExpected) * 100 : 0;
        
        return {
          ...p,
          books: [], // Books will be fetched separately and mapped on the client.
          documentCount,
          progress: Math.min(100, progress)
        }
      });

      return NextResponse.json(projects);

    } else {
      const [rows] = await connection.execute('SELECT * FROM projects');
      return NextResponse.json(rows);
    }
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
        
        connection = await getConnection();
        await connection.beginTransaction();

        // Insert into projects table
        const projectQuery = 'INSERT INTO projects (id, name, clientId, description, startDate, endDate, budget, status, info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const projectValues = [
            newProjectId, 
            name, 
            clientId, 
            description, 
            startDate, 
            endDate, 
            budget, 
            status, 
            info || null
        ];
        await connection.execute(projectQuery, projectValues);
        
        // Insert default workflow
        const workflowValues = WORKFLOW_SEQUENCE.map(stage => [newProjectId, stage]);
        await connection.query('INSERT INTO project_workflows (projectId, stage) VALUES ?', [workflowValues]);
        
        await connection.commit();
        
        const [rows] = await connection.execute('SELECT * FROM projects WHERE id = ?', [newProjectId]);
        const newProject = Array.isArray(rows) ? rows[0] : null;

        releaseConnection(connection);
        return NextResponse.json(newProject, { status: 201 });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error creating project:", error);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}
