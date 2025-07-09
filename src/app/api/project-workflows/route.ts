import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM project_workflows');
    const workflowsByProject: { [key: string]: string[] } = {};
    if (Array.isArray(rows)) {
      rows.forEach((row: any) => {
        if (!workflowsByProject[row.projectId]) {
          workflowsByProject[row.projectId] = [];
        }
        workflowsByProject[row.projectId].push(row.stage);
      });
    }
    return NextResponse.json(workflowsByProject);
  } catch (error) {
    console.error("Error fetching project_workflows:", error);
    return NextResponse.json({ error: 'Failed to fetch project_workflows' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}
