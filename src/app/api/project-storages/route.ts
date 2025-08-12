import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    let query = 'SELECT * FROM project_storages';
    const params = [];
    if (projectId) {
      query += ' WHERE projectId = ?';
      params.push(projectId);
    }
    const [rows] = await connection.execute(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching project_storages:", error);
    return NextResponse.json({ error: 'Failed to fetch project_storages' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function POST(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const associationData = await request.json();
        const { projectId, storageId, peso, minimo_diario_fixo, percentual_minimo_diario, descricao, obs } = associationData;

        if (!projectId || !storageId) {
            return NextResponse.json({ error: 'projectId and storageId are required' }, { status: 400 });
        }
        
        connection = await getConnection();
        const query = 'INSERT INTO project_storages (projectId, storageId, peso, minimo_diario_fixo, percentual_minimo_diario, descricao, obs) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const values = [projectId, storageId, peso ?? 1, minimo_diario_fixo ?? 0, percentual_minimo_diario ?? 0, descricao || null, obs || null];
        
        await connection.execute(query, values);
        
        releaseConnection(connection);
        return NextResponse.json({ ...associationData, storageId: Number(associationData.storageId) }, { status: 201 });
    } catch (error) {
        console.error("Error creating project_storage association:", error);
        return NextResponse.json({ error: 'Failed to create association' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}

export async function PUT(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const associationData = await request.json();
        const { projectId, storageId, peso, minimo_diario_fixo, percentual_minimo_diario, descricao, obs } = associationData;

        if (!projectId || !storageId) {
            return NextResponse.json({ error: 'projectId and storageId are required' }, { status: 400 });
        }
        
        connection = await getConnection();
        const query = 'UPDATE project_storages SET peso = ?, minimo_diario_fixo = ?, percentual_minimo_diario = ?, descricao = ?, obs = ? WHERE projectId = ? AND storageId = ?';
        const values = [peso, minimo_diario_fixo, percentual_minimo_diario, descricao, obs, projectId, storageId];
        
        await connection.execute(query, values);
        
        releaseConnection(connection);
        return NextResponse.json({ ...associationData });
    } catch (error) {
        console.error("Error updating project_storage association:", error);
        return NextResponse.json({ error: 'Failed to update association' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}

export async function DELETE(request: Request) {
    let connection: PoolConnection | null = null;
    try {
        const { projectId, storageId } = await request.json();

        if (!projectId || !storageId) {
            return NextResponse.json({ error: 'projectId and storageId are required' }, { status: 400 });
        }
        
        connection = await getConnection();
        await connection.execute('DELETE FROM project_storages WHERE projectId = ? AND storageId = ?', [projectId, storageId]);
        
        releaseConnection(connection);
        return new Response(null, { status: 204 });
    } catch (error) {
        console.error("Error deleting project_storage association:", error);
        return NextResponse.json({ error: 'Failed to delete association' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
