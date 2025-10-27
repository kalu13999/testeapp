

import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { getRawProjects, getClients, getRawBooks, getDocumentStatuses, getRawDocuments } from '@/lib/data';
import type { EnrichedProject, EnrichedBook, RawBook, Document as RawDocument, Client, DocumentStatus } from '@/lib/data';


const getDbSafeDate = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

// Server-side enrichment logic
const enrichBook = (
  book: RawBook, 
  project: { name: string, clientId: string, clientName: string }, 
  documents: RawDocument[],
  statuses: DocumentStatus[]
): EnrichedBook => {
  const bookDocuments = documents.filter(d => d.bookId === book.id);
  const bookProgress = book.expectedDocuments > 0 ? (bookDocuments.length / book.expectedDocuments) * 100 : 0;
  return {
    ...book,
    status: statuses.find(s => s.id === book.statusId)?.name || 'Unknown',
    clientId: project.clientId,
    projectName: project.name,
    clientName: project.clientName,
    documentCount: bookDocuments.length,
    progress: Math.min(100, bookProgress),
    docErrCount: 0, 
    docWarnCount: 0, 
    docInfoCount: 0, 
    docTagCliCount: 0,
  };
};

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const bookId = await params.id;
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
        const documentIds: string[] = [];
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
                  '[]', // Empty JSON array for tags
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
        
        // Fetch all necessary data for enrichment
        const [projects, clients, allBooks, allDocuments, statuses] = await Promise.all([
            getRawProjects(),
            getClients(),
            getRawBooks(),
            getRawDocuments(),
            getDocumentStatuses()
        ]);
        
        const updatedBookRaw = allBooks.find(b => b.id === bookId);
        if (!updatedBookRaw) throw new Error("Could not find the updated book");
        
        const projectForBook = projects.find(p => p.id === updatedBookRaw.projectId);
        const clientForBook = clients.find(c => c.id === projectForBook?.clientId);
        
        if (!projectForBook || !clientForBook) throw new Error("Could not find project or client for the book");

        const enrichedBookData = enrichBook(
            updatedBookRaw,
            { name: projectForBook.name, clientId: clientForBook.id, clientName: clientForBook.name },
            allDocuments,
            statuses
        );
        
        let createdDocsRows: RawDocument[] = [];
        if (documentIds.length > 0) {
            createdDocsRows = allDocuments.filter(d => documentIds.includes(d.id));
        }
        
        releaseConnection(connection);

        return NextResponse.json({
            book: enrichedBookData,
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
