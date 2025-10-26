import { NextResponse } from "next/server";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getConnection, releaseConnection } from "@/lib/db"; // ajusta o path conforme o teu projeto

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {

  const bookId = params.id;
  let connection: PoolConnection | null = null;

  try {
    connection = await getConnection();
    const [rows] = await connection.query<RowDataPacket[]>(
      `
      SELECT 
          d.*,
          c.name AS client,
          ds.id AS statusId,
          ds.name AS status
      FROM documents d
      LEFT JOIN clients c ON d.clientId = c.id
      LEFT JOIN books b ON d.bookId = b.id
      LEFT JOIN document_statuses ds ON b.statusId = ds.id
      WHERE d.bookId = ?
      ORDER BY d.name ASC;
      `,
      [bookId]
    );

    const documents = rows.map((doc) => ({
      ...doc,
      tags:
        typeof doc.tags === "string" && doc.tags.trim() !== ""
          ? safeJsonParse(doc.tags)
          : [],
    }));

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents by book:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  } finally {
    if (connection) releaseConnection(connection);
  }
}

function safeJsonParse(str: string): string[] {
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}