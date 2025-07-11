

import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

const getDbSafeDate = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const bookId = params.id;
    let connection: PoolConnection | null = null;
    try {
        const { actualPageCount, bookName, clientId, projectId } = await request.json();

        if (actualPageCount === undefined || !bookName || !clientId || !projectId) {
            return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }

        connection = await getConnection();
        await connection.beginTransaction();

        const [docStatusResult] = await connection.execute<RowDataPacket[]>("SELECT id FROM document_statuses WHERE name = 'Storage'");
        const storageStatusId = docStatusResult[0]?.id;
        if (!storageStatusId) {
            throw new Error("Could not find 'Storage' status in document_statuses table.");
        }

        const documentsToInsert = [];
        const documentIds = [];
        if (actualPageCount > 0) {
          for (let i = 1; i <= actualPageCount; i++) {
              const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${i}`;
              documentIds.push(docId);
              documentsToInsert.push([
                  docId,
                  `${bookName} - Page ${i}`,
                  clientId,
                  'Scanned Page',
                  getDbSafeDate(),
                  JSON.stringify([]),
                  null,
                  projectId,
                  bookId,
                  null,
                  null,
                  `https://placehold.co/400x550.png?text=Page+${i}`
              ]);
          }
          
          if (documentsToInsert.length > 0) {
              await connection.query('INSERT INTO documents (id, name, clientId, type, lastUpdated, tags, folderId, projectId, bookId, flag, flagComment, imageUrl) VALUES ?', [documentsToInsert]);
          }
        }
        
        await connection.execute('UPDATE books SET statusId = ?, scanEndTime = ?, expectedDocuments = ? WHERE id = ?', [storageStatusId, getDbSafeDate(), actualPageCount, bookId]);

        await connection.commit();
        
        const [updatedBookRows] = await connection.execute<RowDataPacket[]>('SELECT * FROM books WHERE id = ?', [bookId]);
        const updatedBook = updatedBookRows[0];
        
        let createdDocsRows: RowDataPacket[] = [];
        if (documentIds.length > 0) {
            const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM documents WHERE id IN (?)', [documentIds]);
            createdDocsRows = rows;
        }

        // Enrich the book object before sending it back
        const enrichedBook = {
            ...updatedBook,
            status: 'Storage', // Directly set the new status name
            documentCount: actualPageCount,
            progress: actualPageCount > 0 ? 100 : 0
        };

        releaseConnection(connection);

        return NextResponse.json({
            book: enrichedBook,
            documents: createdDocsRows
        }, { status: 200 });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Error completing scan for book ${bookId}:`, error);
        return NextResponse.json({ error: 'Failed to complete scan' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
