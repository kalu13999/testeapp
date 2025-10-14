
import { NextResponse, NextRequest } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { RawBook } from '@/lib/data';

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const enriched = searchParams.get('enriched') === 'true';

  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    
    if (enriched) {
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
      
      const enrichedBooks = (rows as any[]).map(book => ({
        ...book,
        progress: book.expectedDocuments > 0 ? Math.min(100, (book.documentCount / book.expectedDocuments) * 100) : 0,
      }));
      
      return NextResponse.json(enrichedBooks);

    } else {
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
    /*if (body.books && Array.isArray(body.books) && body.projectId) {
      const { projectId, books } = body;

      const bookInsertQuery = `
        INSERT INTO books (
          id, name, statusId, expectedDocuments, projectId, priority, info, author, isbn, publicationYear, color
        ) VALUES ?
      `;

      const newBooksData: RawBook[] = books.map((book: any) => ({
        id: `book_imp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: book.name,
        statusId: "ds_1",
        expectedDocuments: book.expectedDocuments,
        projectId,
        priority: book.priority || "Medium",
        info: book.info || "",
        author: book.author || null,
        isbn: book.isbn || null,
        publicationYear: book.publicationYear || null,
        color: book.color || "#FFFFFF",
      }));

      const values = newBooksData.map((b) => [
        b.id, b.name, b.statusId, b.expectedDocuments, b.projectId,
        b.priority, b.info, b.author, b.isbn, b.publicationYear, b.color,
      ]);
      
      if(values.length > 0) {
        await connection.query(bookInsertQuery, [values]);
      }
      
      await connection.commit();

      const enrichedBooks = await Promise.all(newBooksData.map(b => getEnrichedBook(connection!, b.id)));
      
      releaseConnection(connection);
      return NextResponse.json(enrichedBooks.filter(b => b !== null), { status: 201 });
    }*/
export async function POST(request: Request) {
  const body = await request.json();
  let connection: PoolConnection | null = null;

  try {
    connection = await getConnection();
    await connection.beginTransaction();


    if (body.books && Array.isArray(body.books) && body.projectId) {
      const { projectId, books } = body;
      const success: any[] = [];
      const failed: { book: any; error: string }[] = [];

      for (const b of books) {
        try {
          const id = `book_imp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const query = `
            INSERT INTO books (
              id, name, statusId, expectedDocuments, projectId, priority, info, author, isbn, publicationYear, color
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          await connection.execute(query, [
            id,
            b.name,
            "ds_1",
            b.expectedDocuments,
            projectId,
            b.priority || "Média",
            b.info || "",
            b.author || null,
            b.isbn || null,
            b.publicationYear || null,
            b.color || "#FFFFFF",
          ]);

          success.push({ ...b, id });
        } catch (err: any) {
          console.error("Erro inserindo livro:", err);
          failed.push({ book: b, error: err.message || "Erro ao inserir livro" });
        }
      }

      await connection.commit();
      releaseConnection(connection);

      return NextResponse.json({ success, failed }, { status: 201 });
    }
    if (body.book && body.projectId) {
      const { projectId, book } = body;
      const newId = `book_${Date.now()}`;

      const newBook = {
        id: newId, name: book.name, statusId: book.statusId || "ds_1",
        expectedDocuments: book.expectedDocuments, projectId,
        priority: book.priority || "Medium", info: book.info || "",
        author: book.author || null, isbn: book.isbn || null,
        publicationYear: book.publicationYear || null, color: book.color || "#FFFFFF",
      };

      const bookInsertQuery = `
        INSERT INTO books (
          id, name, statusId, expectedDocuments, projectId, priority, info, author, isbn, publicationYear, color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await connection.execute(bookInsertQuery, Object.values(newBook));
      await connection.commit();

      const enrichedBook = await getEnrichedBook(connection, newId);

      releaseConnection(connection);
      return NextResponse.json(enrichedBook, { status: 201 });
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
