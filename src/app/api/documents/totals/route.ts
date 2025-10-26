

import { NextResponse } from 'next/server';
import { getConnection, releaseConnection } from '@/lib/db';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

/*export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM documents');
    const documents = rows.map(doc => {
      if (doc.tags && typeof doc.tags === 'string' && doc.tags.trim() !== '') {
        try {
          doc.tags = JSON.parse(doc.tags);
        } catch (e) {
          console.warn(`Could not parse tags for document ${doc.id}: ${doc.tags}`);
          doc.tags = [];
        }
      } else if (!doc.tags || doc.tags.trim() === '') {
        doc.tags = [];
      }
      return doc;
    });
    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}*/
export async function GET() {
  let connection: PoolConnection | null = null;
  try {
    connection = await getConnection();
    const [rows] = await connection.query<RowDataPacket[]>(`
    SELECT * FROM documents d
        WHERE d.flag = 'error' OR d.flag = 'warning' OR d.flag = 'info' OR d.tags NOT LIKE '[]';
    `);

    const documents = rows.map(doc => {
      let parsedTags: string[] = [];
      if (doc.tags && typeof doc.tags === 'string' && doc.tags.trim() !== '') {
        try {
          parsedTags = JSON.parse(doc.tags);
        } catch (e) {
          console.warn(`Could not parse tags for document ${doc.id}: ${doc.tags}`);
          parsedTags = [];
        }
      } else if (doc.tags && Array.isArray(doc.tags)) {
        parsedTags = doc.tags;
      }
      return { ...doc, tags: parsedTags };
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  } finally {
    if (connection) {
      releaseConnection(connection);
    }
  }
}

