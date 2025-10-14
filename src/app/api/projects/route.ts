
import { NextResponse, NextRequest } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';
import { WORKFLOW_SEQUENCE } from '@/lib/workflow-config';

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
    COALESCE(b_stats.bookCount, 0) AS bookCount,
    COALESCE(b_stats.totalExpected, 0) AS totalExpected,
    COALESCE(doc_stats.documentCount, 0) AS documentCount
FROM
    projects p
LEFT JOIN
    clients c ON p.clientId = c.id

-- Subquery para contar livros e expectedDocuments por projeto
LEFT JOIN (
    SELECT
        projectId,
        COUNT(*) AS bookCount,
        SUM(expectedDocuments) AS totalExpected
    FROM
        books
    GROUP BY
        projectId
) b_stats ON b_stats.projectId = p.id

-- Subquery para contar documentos por projeto (via books)
LEFT JOIN (
    SELECT
        b.projectId,
        COUNT(d.id) AS documentCount
    FROM
        books b
    JOIN
        documents d ON d.bookId = b.id
    GROUP BY
        b.projectId
) doc_stats ON doc_stats.projectId = p.id

        `);

      const projects = (rows as any[]).map(p => {
        const documentCount = p.documentCount || 0;
        const progress = p.totalExpected > 0 ? (documentCount / p.totalExpected) * 100 : 0;
        
        return {
          ...p,
          books: [],
          documentCount: p.documentCount,
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

        const projectQuery = 'INSERT INTO projects (id, name, clientId, description, startDate, endDate, budget, status, info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const projectValues = [
            newProjectId, name, clientId, description, startDate, endDate, budget, status, info || null
        ];
        await connection.execute(projectQuery, projectValues);
        
        const workflowValues = WORKFLOW_SEQUENCE.map(stage => [newProjectId, stage]);
        await connection.query('INSERT INTO project_workflows (projectId, stage) VALUES ?', [workflowValues]);
        
        await connection.commit();
        
        const [rows] = await connection.execute(`
            SELECT
                p.*,
                c.name AS clientName,
                0 as bookCount,
                0 as documentCount,
                0 as totalExpected,
                0 as progress
            FROM
                projects p
            LEFT JOIN
                clients c ON p.clientId = c.id
            WHERE p.id = ?
        `, [newProjectId]);
        
        const newProject = (Array.isArray(rows) && rows.length > 0) ? { ...(rows[0] as any), books: [] } : null;

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
