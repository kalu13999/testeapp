
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';

const getDbSafeDate = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const bookId = params.id;
    let connection: PoolConnection | null = null;
    try {
        const { actualPageCount, bookName, clientId, projectId } = await request.json();

        if (!actualPageCount || !bookName || !clientId || !projectId) {
            return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }

        connection = await getConnection();
        await connection.beginTransaction();

        const docStatusResult = await connection.execute("SELECT id FROM document_statuses WHERE name = 'Storage'");
        const storageStatusId = (docStatusResult[0] as any)[0]?.id;
        if (!storageStatusId) {
            throw new Error("Could not find 'Storage' status in document_statuses table.");
        }

        const documentsToInsert = [];
        const documentIds = [];
        for (let i = 1; i <= actualPageCount; i++) {
            const docId = `doc_${bookId}_${i}`;
            documentIds.push(docId);
            documentsToInsert.push([
                docId,
                `${bookName} - Page ${i}`,
                clientId,
                storageStatusId,
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
            await connection.query('INSERT INTO documents (id, name, clientId, statusId, type, lastUpdated, tags, folderId, projectId, bookId, flag, flagComment, imageUrl) VALUES ?', [documentsToInsert]);
        }

        const nextStageStatus = 'Storage';
        await connection.execute('UPDATE books SET status = ?, scanEndTime = ?, expectedDocuments = ? WHERE id = ?', [nextStageStatus, getDbSafeDate(), actualPageCount, bookId]);

        await connection.commit();
        
        const [updatedBookRows] = await connection.execute('SELECT * FROM books WHERE id = ?', [bookId]);
        const [createdDocsRows] = await connection.execute('SELECT * FROM documents WHERE id IN (?)', [documentIds]);

        releaseConnection(connection);

        return NextResponse.json({
            book: (updatedBookRows as any)[0],
            documents: createdDocsRows
        }, { status: 200 });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Error completing scan for book ${bookId}:`, error);
        return NextResponse.json({ error: 'Failed to complete scan' }, { status: 500 });
    } finally {
        if (connection) releaseConnection(connection);
    }
}
