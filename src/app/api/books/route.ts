
import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';
import type { RawBook } from '@/lib/data';

export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM books');
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

export async function POST(request: Request) {
    const body = await request.json();
    let connection: PoolConnection | null = null;
    
    try {
        connection = await getConnection();
        await connection.beginTransaction();

        // Handle bulk import
        if (body.books && Array.isArray(body.books) && body.projectId) {
            const { projectId, books } = body;
            const newBooks: RawBook[] = [];

            const bookInsertQuery = `
              INSERT INTO books (id, name, statusId, expectedDocuments, projectId, priority, info, author, isbn, publicationYear)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            for (const book of books) {
                const newBook: Omit<RawBook, 'id'> & {id: string} = {
                    id: `book_imp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    name: book.name,
                    statusId: 'ds_1', // Pending Shipment
                    expectedDocuments: book.expectedDocuments,
                    projectId: projectId,
                    priority: book.priority || 'Medium',
                    info: book.info || '',
                    author: book.author || null,
                    isbn: book.isbn || null,
                    publicationYear: book.publicationYear || null,
                };
                await connection.execute(bookInsertQuery, [
                    newBook.id, newBook.name, newBook.statusId, newBook.expectedDocuments, newBook.projectId,
                    newBook.priority, newBook.info, newBook.author, newBook.isbn, newBook.publicationYear
                ]);
                newBooks.push(newBook as RawBook);
            }
            
            await connection.commit();
            releaseConnection(connection);
            return NextResponse.json(newBooks, { status: 201 });
        }

        // Handle single book creation
        if (body.book && body.projectId) {
            const { projectId, book } = body;
             const newId = `book_${Date.now()}`;
            const newBook = {
                id: newId,
                name: book.name,
                statusId: book.statusId || 'ds_1', // Pending Shipment
                expectedDocuments: book.expectedDocuments,
                projectId,
                priority: book.priority || 'Medium',
                info: book.info || '',
                author: book.author || null,
                isbn: book.isbn || null,
                publicationYear: book.publicationYear || null,
            };
            
            const bookInsertQuery = `
              INSERT INTO books (id, name, statusId, expectedDocuments, projectId, priority, info, author, isbn, publicationYear)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            await connection.execute(bookInsertQuery, Object.values(newBook));
            
            await connection.commit();
            
            const [rows] = await connection.execute('SELECT * FROM books WHERE id = ?', [newId]);

            releaseConnection(connection);
            return NextResponse.json(Array.isArray(rows) ? rows[0] : null, { status: 201 });
        }
        
        await connection.rollback();
        releaseConnection(connection);
        return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error creating book(s):", error);
        return NextResponse.json({ error: 'Failed to create book(s)' }, { status: 500 });
    } finally {
        if (connection && connection.connection) releaseConnection(connection);
    }
}
