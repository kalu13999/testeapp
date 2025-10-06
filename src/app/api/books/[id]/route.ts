
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

async function getEnrichedBook(connection: PoolConnection, bookId: string) {
  const [rows] = await connection.execute<RowDataPacket[]>(`
    SELECT
        b.*,
        ds.name AS status,
        p.name AS projectName,
        p.clientId,
        c.name AS clientName,
        (SELECT COUNT(*) FROM documents d WHERE d.bookId = b.id) AS documentCount,
        lt.storage_id as storageId,
        st.nome as storageName,
        sc.nome as scannerDeviceName
    FROM
        books b
    LEFT JOIN
        document_statuses ds ON b.statusId = ds.id
    LEFT JOIN
        projects p ON b.projectId = p.id
    LEFT JOIN
        clients c ON p.clientId = c.id
    LEFT JOIN 
        (
            SELECT 
                lt_inner.*
            FROM 
                log_transferencias lt_inner
            INNER JOIN (
                SELECT 
                    bookId, 
                    MAX(data_fim) AS max_data_fim
                FROM 
                    log_transferencias
                WHERE status = 'sucesso'
                GROUP BY 
                    bookId
            ) lt_max ON lt_inner.bookId = lt_max.bookId AND lt_inner.data_fim = lt_max.max_data_fim
        ) lt ON b.id = lt.bookId
    LEFT JOIN 
        storages st ON lt.storage_id = st.id
    LEFT JOIN 
        scanners sc ON lt.scanner_id = sc.id
    WHERE b.id = ?
  `, [bookId]);

  if (rows.length === 0) {
    return null;
  }
  const book = rows[0];
  book.progress = book.expectedDocuments > 0 ? Math.min(100, (book.documentCount / book.expectedDocuments) * 100) : 0;
  return book;
}


export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const enrichedBook = await getEnrichedBook(connection, id);
    if (!enrichedBook) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }
    return NextResponse.json(enrichedBook);
  } catch (error) {
    console.error(`Error fetching book ${id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch book' }, { status: 500 });
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
        const bookData = await request.json();
        
        const fields = Object.keys(bookData);
        if (fields.length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const allowedFields = ['name', 'statusId', 'expectedDocuments', 'priority', 'info', 'scannerUserId', 'scanStartTime', 'scanEndTime', 'indexerUserId', 'indexingStartTime', 'indexingEndTime', 'qcUserId', 'qcStartTime', 'qcEndTime', 'rejectionReason', 'author', 'isbn', 'publicationYear', 'color'];
        const filteredFields = fields.filter(field => allowedFields.includes(field));
        
        if (filteredFields.length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const query = `UPDATE books SET ${filteredFields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`;
        const values = [...filteredFields.map(field => bookData[field]), id];

        connection = await getConnection();
        await connection.execute(query, values);
        
        const updatedEnrichedBook = await getEnrichedBook(connection, id);
        
        releaseConnection(connection);
        return NextResponse.json(updatedEnrichedBook);
    } catch (error) {
        console.error(`Error updating book ${id}:`, error);
        return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
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

        await connection.execute('DELETE FROM documents WHERE bookId = ?', [id]);
        await connection.execute('DELETE FROM audit_logs WHERE bookId = ?', [id]);
        await connection.execute('DELETE FROM processing_batch_items WHERE bookId = ?', [id]);
        await connection.execute('DELETE FROM books WHERE id = ?', [id]);

        await connection.commit();
        
        releaseConnection(connection);
        return new Response(null, { status: 204 });
    } catch (error) {
        if(connection) await connection.rollback();
        console.error(`Error deleting book ${id}:`, error);
        return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}
