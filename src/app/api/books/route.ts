
import { NextResponse, NextRequest } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection } from 'mysql2/promise';
import type { RawBook } from '@/lib/data';

/*export async function GET() {
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
}*/


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const enriched = searchParams.get('enriched') === 'true';

  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    
    if (enriched) {
      // This is the new, more complex query to fetch enriched book data
      const [rows] = await connection.execute(`
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
            scanners sc ON lt.scanner_id = sc.id;
      `);
      
      // Calculate progress in JavaScript as it's simpler here
      const enrichedBooks = (rows as any[]).map(book => ({
        ...book,
        progress: book.expectedDocuments > 0 ? Math.min(100, (book.documentCount / book.expectedDocuments) * 100) : 0,
      }));
      
      return NextResponse.json(enrichedBooks);

    } else {
      // Original simple query
      const [rows] = await connection.execute('SELECT * FROM books');
      return NextResponse.json(rows);
    }
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

    // --------------------------
    // Bulk import de múltiplos livros
    // --------------------------
    if (body.books && Array.isArray(body.books) && body.projectId) {
      const { projectId, books } = body;

      const bookInsertQuery = `
        INSERT INTO books (
          id, name, statusId, expectedDocuments, projectId, priority, info, author, isbn, publicationYear, color
        ) VALUES ?
      `;

      const newBooks: RawBook[] = books.map((book: any) => ({
        id: `book_imp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: book.name,
        statusId: "ds_1", // Pending Shipment
        expectedDocuments: book.expectedDocuments,
        projectId,
        priority: book.priority || "Medium",
        info: book.info || "",
        author: book.author || null,
        isbn: book.isbn || null,
        publicationYear: book.publicationYear || null,
        color: book.color || "#FFFFFF",
      }));

      // Preparar dados para VALUES (array de arrays)
      const values = newBooks.map((b) => [
        b.id,
        b.name,
        b.statusId,
        b.expectedDocuments,
        b.projectId,
        b.priority,
        b.info,
        b.author,
        b.isbn,
        b.publicationYear,
        b.color,
      ]);

      // Chunking para não criar queries gigantes
      const chunkSize = 500;
      for (let i = 0; i < values.length; i += chunkSize) {
        const chunk = values.slice(i, i + chunkSize);
        await connection.query(bookInsertQuery, [chunk]);
      }

      await connection.commit();
      releaseConnection(connection);
      return NextResponse.json(newBooks, { status: 201 });
    }

    // --------------------------
    // Inserção de um único livro
    // --------------------------
    if (body.book && body.projectId) {
      const { projectId, book } = body;
      const newId = `book_${Date.now()}`;

      const newBook = {
        id: newId,
        name: book.name,
        statusId: book.statusId || "ds_1", // Pending Shipment
        expectedDocuments: book.expectedDocuments,
        projectId,
        priority: book.priority || "Medium",
        info: book.info || "",
        author: book.author || null,
        isbn: book.isbn || null,
        publicationYear: book.publicationYear || null,
        color: book.color || "#FFFFFF",
      };

      const bookInsertQuery = `
        INSERT INTO books (
          id, name, statusId, expectedDocuments, projectId, priority, info, author, isbn, publicationYear, color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(bookInsertQuery, Object.values(newBook));
      await connection.commit();

      const [rows] = await connection.execute("SELECT * FROM books WHERE id = ?", [newId]);

      releaseConnection(connection);
      return NextResponse.json(Array.isArray(rows) ? rows[0] : null, { status: 201 });
    }

    await connection.rollback();
    releaseConnection(connection);
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error creating book(s):", error);
    return NextResponse.json({ error: "Failed to create book(s)" }, { status: 500 });
  } finally {
    if (connection) releaseConnection(connection);
  }
}
/*export async function POST(request: Request) {
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
              INSERT INTO books (id, name, statusId, expectedDocuments, projectId, priority, info, author, isbn, publicationYear, color)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    color: book.color || '#FFFFFF',
                };
                await connection.execute(bookInsertQuery, [
                    newBook.id, newBook.name, newBook.statusId, newBook.expectedDocuments, newBook.projectId,
                    newBook.priority, newBook.info, newBook.author, newBook.isbn, newBook.publicationYear, newBook.color
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
                color: book.color || '#FFFFFF',
            };
            
            const bookInsertQuery = `
              INSERT INTO books (id, name, statusId, expectedDocuments, projectId, priority, info, author, isbn, publicationYear, color)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        if (connection) releaseConnection(connection);
    }
}*/
