import { NextRequest, NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { STAGE_CONFIG } from '@/lib/workflow-config'; // Ajuste conforme sua config

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { stageKey, previousStageKey, ip: localIP, projectId } = body;

  if (!stageKey || !previousStageKey || !localIP || !projectId) {
    return NextResponse.json({ error: 'stageKey, previousStageKey, ip and projectId are required' }, { status: 400 });
  }

  const currentConfig = STAGE_CONFIG[stageKey];
  const previousConfig = STAGE_CONFIG[previousStageKey];

  if (!currentConfig || !previousConfig) {
    return NextResponse.json({ error: 'Invalid stageKey or previousStageKey' }, { status: 400 });
  }

  const previousStatus = previousConfig.dataStatus;
  const assigneeRole = currentConfig.assigneeRole;
  const assigneeColumn = assigneeRole ? `${assigneeRole}UserId` : undefined;

  let connection: PoolConnection | null = null;

  try {
    connection = await getConnection();

    let query = `
      SELECT
        b.*,
        ds.name AS status,
        p.name AS projectName,
        c.name AS clientName,
        (SELECT COUNT(*) FROM documents d WHERE d.bookId = b.id) AS documentCount,
        lt.storage_id AS storageId,
        st.nome AS storageName,
        sc.nome AS scannerDeviceName
      FROM books b
      LEFT JOIN document_statuses ds ON b.statusId = ds.id
      LEFT JOIN projects p ON b.projectId = p.id
      LEFT JOIN clients c ON p.clientId = c.id
      LEFT JOIN (
        SELECT lt_inner.*
        FROM log_transferencias lt_inner
        INNER JOIN (
          SELECT bookId, MAX(data_fim) AS max_data_fim
          FROM log_transferencias
          WHERE status = 'sucesso'
          GROUP BY bookId
        ) lt_max ON lt_inner.bookId = lt_max.bookId AND lt_inner.data_fim = lt_max.max_data_fim
      ) lt ON b.id = lt.bookId
      LEFT JOIN storages st ON lt.storage_id = st.id
      LEFT JOIN scanners sc ON lt.scanner_id = sc.id
      WHERE ds.name = ?
        AND b.projectId = ?
    `;

    const params: (string | number)[] = [previousStatus, projectId];

    if (assigneeColumn) {
      query += ` AND b.${assigneeColumn} IS NULL`;
    }

    query += `
      AND lt.storage_id IN (
        SELECT id FROM storages WHERE ip = ?
      )
    `;

    params.push(localIP);

    const [rows] = await connection.query<RowDataPacket[]>(query, params);

    const enrichedBooks = rows.map(book => ({
      ...book,
      progress: book.expectedDocuments > 0
        ? Math.min(100, (book.documentCount / book.expectedDocuments) * 100)
        : 0,
    }));

    return NextResponse.json(enrichedBooks);
  } catch (error) {
    console.error('Error in books-local-ip POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    if (connection) {
      await releaseConnection(connection);
    }
  }
}
