import { NextResponse } from "next/server";
import { getConnection, releaseConnection } from "@/lib/db";
import type { PoolConnection } from "mysql2/promise";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const dataStatus = url.searchParams.get("dataStatus") || ""; 
  const selectedProjectId = url.searchParams.get("selectedProjectId");
  const selectedBatchId = url.searchParams.get("selectedBatchId") || "all";
  const selectedStorageId = url.searchParams.get("selectedStorageId") || "all";
  const stage = url.searchParams.get("stage");
  const currentUserRole = url.searchParams.get("role");
  const currentUserClientId = url.searchParams.get("clientId")?.trim() || null;

  let connection: PoolConnection | null = null;

  try {
    connection = await getConnection();

    // SELECT já enriquecido
    const [rows] = await connection.execute(`
      SELECT
          b.*,
          ds.name AS status,
          p.name AS projectName,
          p.clientId,
          c.name AS clientName,
          (SELECT COUNT(*) FROM documents d WHERE d.bookId = b.id) AS documentCount,
          lt.storage_id AS storageId,
          st.nome AS storageName,
          sc.nome AS scannerDeviceName
      FROM
          books b
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
    `, [dataStatus]);

    const books = rows as any[];

    // 🔹 Filtros adicionais
    let booksInStage = books;
    if (selectedProjectId) booksInStage = booksInStage.filter(b => b.projectId === selectedProjectId);
    if (currentUserRole === "Client" && currentUserClientId) booksInStage = booksInStage.filter(b => b.clientId === currentUserClientId);
    if (stage === "final-quality-control" && selectedBatchId !== "all") booksInStage = booksInStage.filter(b => b.batchId === selectedBatchId); // Assumindo que batchId já vem do JOIN
    if ((stage === "storage" || stage === "final-quality-control") && selectedStorageId !== "all") {
      booksInStage = booksInStage.filter(b => b.storageId?.toString() === selectedStorageId);
    }

    // Agrupar por livro (igual antes)
    const groupedByBook = booksInStage.reduce<Record<string, any>>((acc, book) => {
      acc[book.id] = {
        book,
        pages: book.documentCount, // já tem o total de docs
        hasError: false, // você pode calcular se quiser baseado nos documentos
        hasWarning: false,
        batchInfo: book.batchId ? { id: book.batchId, timestampStr: book.batchTimestamp } : null,
        storageId: book.storageId,
        storageName: book.storageName,
      };
      return acc;
    }, {});

    return NextResponse.json({ groupedByBook });

  } catch (err) {
    console.error("Erro no endpoint /api/books/grouped:", err);
    return NextResponse.json({ error: "Failed to fetch grouped books" }, { status: 500 });
  } finally {
    if (connection) releaseConnection(connection);
  }
}